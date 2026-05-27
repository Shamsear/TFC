import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/team/bulk-tiebreakers/[id]/bid - Submit sealed bid in bulk tiebreaker
 * Changed to sealed bid model (like normal tiebreakers) - submit once, highest wins
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await auth();
    if (!session || session.user.role !== 'TEAM_MANAGER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const teamId = session.user.teamId;
    if (!teamId) {
      return NextResponse.json({ error: 'Team not found' }, { status: 400 });
    }

    const { id } = await params;
    const tiebreakerId = parseInt(id);
    if (isNaN(tiebreakerId)) {
      return NextResponse.json({ error: 'Invalid tiebreaker ID' }, { status: 400 });
    }

    const body = await request.json();
    const { newBidAmount } = body;

    // Validate bid amount
    if (typeof newBidAmount !== 'number' || newBidAmount <= 0) {
      return NextResponse.json(
        { error: 'Invalid bid amount' },
        { status: 400 }
      );
    }

    // Get tiebreaker details
    const tiebreaker = await prisma.bulk_tiebreakers.findUnique({
      where: { id: tiebreakerId },
      include: {
        participants: {
          where: { teamId }
        }
      }
    });

    if (!tiebreaker) {
      return NextResponse.json({ error: 'Tiebreaker not found' }, { status: 404 });
    }

    if (tiebreaker.status !== 'active') {
      return NextResponse.json({ error: 'Tiebreaker is not active' }, { status: 400 });
    }

    const myParticipation = tiebreaker.participants[0];
    if (!myParticipation) {
      return NextResponse.json({ error: 'You are not a participant in this tiebreaker' }, { status: 400 });
    }

    if (myParticipation.status === 'withdrawn') {
      return NextResponse.json({ error: 'You have withdrawn from this tiebreaker' }, { status: 400 });
    }

    if (myParticipation.submitted) {
      return NextResponse.json({ error: 'You have already submitted your bid' }, { status: 400 });
    }

    // Validate bid is higher than base price
    if (newBidAmount <= tiebreaker.basePrice) {
      return NextResponse.json({
        error: `Bid must be higher than base price of £${tiebreaker.basePrice.toLocaleString()}`
      }, { status: 400 });
    }

    // Submit sealed bid
    await prisma.bulk_tiebreaker_participants.update({
      where: { id: myParticipation.id },
      data: {
        newBidAmount,
        submitted: true,
        submittedAt: new Date()
      }
    });

    // Notify Admins
    try {
      const { notifyAllAdmins } = await import('@/lib/notifications-server');
      const teamData = await prisma.teams.findUnique({ where: { id: String(teamId) }, select: { name: true } });
      notifyAllAdmins({
        title: 'Tiebreaker Bid Submitted',
        body: `${teamData?.name || 'A team'} has submitted a bid for a Tiebreaker.`
      }).catch(() => {});
    } catch (err) {
      console.error('Failed to notify admins:', err);
    }

    // Check if all active participants have submitted
    const allParticipants = await prisma.bulk_tiebreaker_participants.findMany({
      where: {
        tiebreakerId,
        status: 'active'
      }
    });

    const allSubmitted = allParticipants.every(p => p.submitted);

    // If all submitted, trigger resolution asynchronously
    if (allSubmitted) {
      // Import and call resolution function asynchronously
      import('@/lib/auction/resolve-bulk-tiebreaker').then(({ resolveBulkTiebreaker }) => {
        resolveBulkTiebreaker(tiebreakerId).catch(err => {
          console.error(`Failed to auto-resolve bulk tiebreaker ${tiebreakerId}:`, err);
        });
      });
    }

    // Fetch updated tiebreaker (without revealing other bids)
    const updatedTiebreaker = await prisma.bulk_tiebreakers.findUnique({
      where: { id: tiebreakerId },
      select: {
        id: true,
        roundId: true,
        basePlayerId: true,
        basePrice: true,
        status: true,
        currentHighestBid: true,
        currentHighestTeamId: true,
        teamsRemaining: true,
        startTime: true,
        maxEndTime: true,
        createdAt: true,
        basePlayer: {
          select: {
            name: true,
            photoUrl: true
          }
        },
        participants: {
          select: {
            teamId: true,
            status: true,
            currentBid: true,
            submitted: true,
            submittedAt: true,
            // Don't include newBidAmount - keep it sealed!
          }
        }
      }
    });

    const myUpdatedParticipation = updatedTiebreaker?.participants.find(p => p.teamId === teamId);

    return NextResponse.json({
      success: true,
      message: allSubmitted 
        ? 'Bid submitted! All teams have submitted. Resolution in progress...'
        : 'Bid submitted successfully! Waiting for other teams...',
      resolutionInProgress: allSubmitted,
      tiebreaker: updatedTiebreaker,
      myParticipation: myUpdatedParticipation || null
    });
  } catch (error) {
    console.error('Submit bulk tiebreaker bid error:', error);
    return NextResponse.json(
      { error: 'Failed to submit bid' },
      { status: 500 }
    );
  }
}
