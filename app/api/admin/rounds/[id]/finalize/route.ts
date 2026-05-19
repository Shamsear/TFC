import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { finalizeRound, applyFinalizationResults } from '@/lib/auction/finalize-round';
import { finalizeBulkRound, applyBulkFinalizationResults } from '@/lib/auction/finalize-bulk-round';
import { createTiebreakers } from '@/lib/auction/tiebreaker';
import { Prisma } from '@prisma/client';

/**
 * POST /api/admin/rounds/[id]/finalize - Finalize a round
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: roundId } = await params;
  
  try {
    // Check authentication
    const session = await auth();
    if (!session || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'SUB_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse body (optional - defaults to force=false, preview=false)
    let body: { force?: boolean; preview?: boolean } = {};
    try {
      const contentType = request.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        body = await request.json();
      }
    } catch (error) {
      // Empty or invalid body - use defaults
      console.log('No JSON body provided, using defaults');
    }
    const { force = false, preview = false } = body;

    console.log(`\n🎯 Finalization request: force=${force}, preview=${preview}`);

    // Get round details
    const round = await prisma.rounds.findUnique({
      where: { id: roundId },
      select: {
        status: true,
        roundType: true,
        endTime: true,
        finalizationMode: true,
        basePrice: true
      }
    });

    if (!round) {
      return NextResponse.json({ error: 'Round not found' }, { status: 404 });
    }

    // Check if round can be finalized
    const now = new Date();
    const endTime = round.endTime ? new Date(round.endTime) : null;

    if (!force && endTime && now < endTime) {
      return NextResponse.json(
        { error: 'Round has not expired yet. Use force=true to finalize early.' },
        { status: 400 }
      );
    }

    if (!force && !['active', 'expired_pending_finalization', 'pending_finalization', 'tiebreaker_pending'].includes(round.status)) {
      return NextResponse.json(
        { error: `Cannot finalize round with status: ${round.status}` },
        { status: 400 }
      );
    }

    // Preview mode: Calculate results and create tiebreakers, but don't apply allocations
    if (preview) {
      if (round.roundType === 'bulk') {
        const result = await finalizeBulkRound(roundId);
        return NextResponse.json({
          success: true,
          preview: true,
          allocations: result.allocations,
          conflicts: result.conflicts,
          error: result.error
        });
      } else {
        // For normal rounds in preview mode
        const result = await finalizeRound(roundId);
        
        if (result.tieDetected && result.ties) {
          // Create tiebreakers in preview mode
          console.log(`\n🎯 Preview mode: Creating tiebreakers...`);
          const tiebreakers = await createTiebreakers(roundId, result.ties);

          // Update status to tiebreaker_pending, mark as preview mode, and change to manual finalization
          await prisma.rounds.update({
            where: { id: roundId },
            data: { 
              status: 'tiebreaker_pending',
              finalizationMode: 'manual', // Switch to manual since admin chose to preview
              finalizationState: JSON.parse(JSON.stringify({
                previewMode: true,
                allocatedTeams: result.allocations?.map(a => a.teamId) || [],
                allocatedPlayers: result.allocations?.map(a => a.basePlayerId) || [],
                processedAllocations: result.allocations || []
              }))
            }
          });

          return NextResponse.json({
            success: true,
            preview: true,
            tieDetected: true,
            tiebreakers,
            message: 'Preview mode: Tiebreakers created. Teams can resolve them, but results will not be applied until you finalize.'
          });
        }
        
        // No ties - save preview results and switch to manual mode
        // Delete any existing preview allocations for this round
        await prisma.preview_allocations.deleteMany({
          where: { roundId }
        });

        // Save preview allocations
        await prisma.preview_allocations.createMany({
          data: result.allocations.map(alloc => ({
            roundId,
            teamId: alloc.teamId,
            basePlayerId: alloc.basePlayerId,
            playerName: alloc.playerName,
            amount: alloc.amount,
            acquisitionType: alloc.acquisitionType,
            acquisitionNotes: alloc.acquisitionNotes || null
          }))
        });

        // Update round to preview_finalized and switch to manual mode
        await prisma.rounds.update({
          where: { id: roundId },
          data: {
            status: 'preview_finalized',
            finalizationMode: 'manual', // Switch to manual since admin chose to preview
            finalizationState: Prisma.JsonNull
          }
        });

        return NextResponse.json({
          success: true,
          preview: true,
          allocations: result.allocations,
          tieDetected: false,
          message: 'Preview results saved. Click "Make Public" to apply these results and make them visible to teams.'
        });
      }
    }

    // Acquire lock (allow tiebreaker_pending to be finalized)
    const lockResult = await prisma.rounds.updateMany({
      where: {
        id: roundId,
        status: { in: ['active', 'expired_pending_finalization', 'pending_finalization', 'tiebreaker_pending'] }
      },
      data: {
        status: 'finalizing'
      }
    });

    if (lockResult.count === 0) {
      return NextResponse.json(
        { error: 'Round is already being finalized or completed' },
        { status: 400 }
      );
    }

    // If Force Re-finalizing a tiebreaker_pending round, apply any completed-but-unapplied tiebreakers
    // This prevents finalizeRound from re-detecting the same tie and creating duplicate tiebreakers
    if (round.status === 'tiebreaker_pending') {
      console.log('\n🔄 Force Re-finalize: checking for completed-but-unapplied tiebreakers...');
      const completedTiebreakers = await prisma.tiebreakers.findMany({
        where: { roundId, status: 'completed', winningTeamId: { not: null } },
        select: {
          id: true, winningTeamId: true, winningBid: true,
          basePlayerId: true, basePlayer: { select: { name: true } },
          round: { select: { seasonId: true, finalizationState: true } }
        }
      });

      for (const tb of completedTiebreakers) {
        // Check if this winner is already in the finalizationState allocations
        const state = tb.round.finalizationState as any;
        const alreadyApplied = state?.allocatedPlayers?.includes(tb.basePlayerId);
        if (!alreadyApplied && tb.winningTeamId && tb.winningBid) {
          console.log(`   ✓ Applying completed tiebreaker: ${tb.basePlayer.name} → Team ${tb.winningTeamId}`);
          const { applyTiebreakerResult } = await import('@/lib/auction/tiebreaker');
          await applyTiebreakerResult(tb.id, tb.winningTeamId, tb.winningBid);
          // Update finalization state
          const updatedState = {
            ...(state || {}),
            allocatedTeams: [...(state?.allocatedTeams || []), tb.winningTeamId],
            allocatedPlayers: [...(state?.allocatedPlayers || []), tb.basePlayerId],
            processedAllocations: [...(state?.processedAllocations || []), {
              teamId: tb.winningTeamId,
              basePlayerId: tb.basePlayerId,
              playerName: tb.basePlayer.name,
              amount: tb.winningBid,
              acquisitionType: 'tiebreaker_won'
            }]
          };
          await prisma.rounds.update({
            where: { id: roundId },
            data: { finalizationState: JSON.parse(JSON.stringify(updatedState)) }
          });
        } else {
          console.log(`   ℹ️  Tiebreaker ${tb.id} already applied or no winner, skipping`);
        }
      }
      console.log('   ✓ Completed tiebreaker cleanup done\n');
    }

    // Finalize based on round type
    if (round.roundType === 'bulk') {
      const result = await finalizeBulkRound(roundId);

      if (!result.success) {
        // Revert status
        await prisma.rounds.update({
          where: { id: roundId },
          data: { status: 'active' }
        });

        return NextResponse.json(
          { error: result.error || 'Finalization failed' },
          { status: 500 }
        );
      }

      // Apply results
      await applyBulkFinalizationResults(roundId, result.allocations, result.conflicts);

      // Auto-create bulk tiebreakers for conflicts (status='pending')
      if (result.conflicts.length > 0) {
        console.log(`\n🎯 Auto-creating ${result.conflicts.length} bulk tiebreakers...`);
        
        for (const conflict of result.conflicts) {
          const startTime = new Date();
          const maxEndTime = new Date(startTime.getTime() + (24 * 60 * 60 * 1000));
          
          await prisma.bulk_tiebreakers.create({
            data: {
              roundId,
              basePlayerId: conflict.basePlayerId,
              basePrice: round.basePrice || 10,
              status: 'pending',
              teamsRemaining: conflict.teamIds.length,
              startTime,
              maxEndTime,
              participants: {
                create: conflict.teamIds.map((teamId: string) => ({
                  teamId,
                  status: 'active'
                }))
              }
            }
          });
          
          console.log(`   ✓ Created tiebreaker for ${conflict.playerName} (${conflict.teamIds.length} teams)`);
        }
        
        console.log(`   ✅ All bulk tiebreakers created with status='pending'`);
      }

      return NextResponse.json({
        success: true,
        allocations: result.allocations,
        conflicts: result.conflicts,
        message: result.conflicts.length > 0
          ? `Round finalized with ${result.conflicts.length} conflicts. Bulk tiebreakers created - review and start them when ready.`
          : 'Round finalized successfully'
      });
    } else {
      // Normal round - sequential tiebreaker resolution
      const result = await finalizeRound(roundId);

      if (result.tieDetected && result.ties) {
        // Create ONLY the first tiebreaker (sequential approach)
        console.log(`\n🎯 Creating tiebreaker for first tie (sequential resolution)...`);
        const tiebreakers = await createTiebreakers(roundId, result.ties);

        // Update status
        await prisma.rounds.update({
          where: { id: roundId },
          data: { status: 'tiebreaker_pending' }
        });

        return NextResponse.json({
          success: true,
          tieDetected: true,
          tiebreakers,
          resuming: result.resuming,
          message: result.resuming 
            ? 'Another tiebreaker created. Teams must submit new bids.'
            : 'Tiebreaker created. Teams must submit new bids.'
        });
      }

      if (!result.success) {
        // Revert status
        await prisma.rounds.update({
          where: { id: roundId },
          data: { status: 'active' }
        });

        return NextResponse.json(
          { error: result.error || 'Finalization failed' },
          { status: 500 }
        );
      }

      // Apply results
      await applyFinalizationResults(roundId, result.allocations);

      // Determine final status based on whether this was a preview finalization
      const finalStatus = force && preview ? 'preview_finalized' : 'completed';
      
      await prisma.rounds.update({
        where: { id: roundId },
        data: { status: finalStatus }
      });

      return NextResponse.json({
        success: true,
        allocations: result.allocations,
        previewMode: finalStatus === 'preview_finalized',
        message: finalStatus === 'preview_finalized' 
          ? 'Round finalized in preview mode. Results are hidden from teams. Click "Make Public" to show results.'
          : 'Round finalized successfully'
      });
    }
  } catch (error) {
    console.error('Finalize round error:', error);
    
    // Log detailed error information
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }

    // Try to revert status
    try {
      await prisma.rounds.update({
        where: { id: roundId },
        data: { status: 'active' }
      });
      console.log('Successfully reverted round status to active');
    } catch (revertError) {
      console.error('Failed to revert status:', revertError);
    }

    // Return detailed error message
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { 
        error: 'Failed to finalize round',
        details: errorMessage,
        roundId
      },
      { status: 500 }
    );
  }
}
