import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { applyFinalizationResults } from '@/lib/auction/finalize-round';
import { Prisma } from '@prisma/client';
import { sendPushNotificationRaw, getTeamManagerId } from '@/lib/notifications-server';

/**
 * POST /api/admin/rounds/[id]/make-public
 * Makes a preview_finalized round public (applies results and changes status to completed)
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

    // Get round details
    const round = await prisma.rounds.findUnique({
      where: { id: roundId },
      select: {
        status: true,
        roundType: true,
        finalizationState: true
      }
    });

    if (!round) {
      return NextResponse.json({ error: 'Round not found' }, { status: 404 });
    }

    // Check if round is in preview_finalized state
    if (round.status !== 'preview_finalized') {
      return NextResponse.json(
        { error: `Round must be in preview_finalized state. Current status: ${round.status}` },
        { status: 400 }
      );
    }

    // Get preview allocations from database table
    const rawPreviewAllocations = await prisma.preview_allocations.findMany({
      where: { roundId },
      select: {
        teamId: true,
        basePlayerId: true,
        playerName: true,
        amount: true,
        acquisitionType: true,
        acquisitionNotes: true
      }
    });

    if (!rawPreviewAllocations || rawPreviewAllocations.length === 0) {
      return NextResponse.json(
        { error: 'No preview allocations found. Please finalize the round first.' },
        { status: 400 }
      );
    }

    // Cast acquisitionType to the correct type
    const previewAllocations = rawPreviewAllocations.map(alloc => ({
      ...alloc,
      acquisitionType: alloc.acquisitionType as 'bid_won' | 'auto_assigned' | 'tiebreaker_won',
      acquisitionNotes: alloc.acquisitionNotes ?? undefined
    }));

    console.log('\n' + '='.repeat(80));
    console.log('📢 MAKING ROUND RESULTS PUBLIC');
    console.log('='.repeat(80));
    console.log(`Round ID: ${roundId}`);
    console.log(`Allocations to apply: ${previewAllocations.length}\n`);

    // Apply the results that were calculated during preview
    await applyFinalizationResults(roundId, previewAllocations);

    // Update status to completed
    await prisma.rounds.update({
      where: { id: roundId },
      data: { 
        status: 'completed',
        finalizationState: Prisma.JsonNull
      }
    });

    // Clean up preview allocations
    await prisma.preview_allocations.deleteMany({
      where: { roundId }
    });

    console.log('✅ Results applied and made public');
    console.log('✅ Preview allocations cleaned up');
    console.log('='.repeat(80) + '\n');

    // Send push notifications: per-team win + general round-complete
    try {
      const winnerTeamIds = new Set(previewAllocations.map(a => a.teamId));

      // Notify winning teams per-player
      for (const alloc of previewAllocations) {
        const managerId = await getTeamManagerId(alloc.teamId);
        if (managerId) {
          await sendPushNotificationRaw(managerId, {
            title: '🏅 You Won a Player!',
            body: `${alloc.playerName} is now in your squad for £${alloc.amount.toLocaleString()}.`,
            url: '/team/squad'
          }, 'auctionWins').catch(() => {});
        }
      }

      // Notify all other season teams that results are out
      const round = await prisma.rounds.findUnique({ where: { id: roundId }, select: { seasonId: true } });
      if (round) {
        const allSeasonTeams = await prisma.season_teams.findMany({
          where: { seasonId: round.seasonId },
          select: { team: { select: { id: true } } }
        });
        const nonWinners = allSeasonTeams.filter(st => st.team && !winnerTeamIds.has(st.team.id));
        await Promise.all(nonWinners.map(async st => {
          if (!st.team) return;
          const managerId = await getTeamManagerId(st.team.id);
          if (managerId) {
            await sendPushNotificationRaw(managerId, {
              title: '📊 Round Results Are Out',
              body: 'Auction results have been published. Check your squad and finances.',
              url: '/team/squad'
            }, 'general').catch(() => {});
          }
        }));
      }
    } catch (notifErr) {
      console.warn('[Push] Make-public notifications failed (non-fatal):', notifErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Round results are now public',
      allocations: previewAllocations.length
    });
  } catch (error) {
    console.error('Make public error:', error);
    return NextResponse.json(
      { error: 'Failed to make round public' },
      { status: 500 }
    );
  }
}
