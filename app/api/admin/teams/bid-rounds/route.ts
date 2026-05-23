import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'SUB_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const seasonId = searchParams.get('seasonId');
    const teamId = searchParams.get('teamId');

    if (!seasonId || !teamId) {
      return NextResponse.json({ error: 'Season ID and Team ID required' }, { status: 400 });
    }

    // Get all rounds where this team has bids
    const teamBids = await prisma.team_round_bids.findMany({
      where: {
        teamId,
        round: {
          seasonId
        }
      },
      include: {
        round: {
          select: {
            id: true,
            roundNumber: true,
            position: true,
            position_group: true
          }
        }
      },
      orderBy: {
        round: {
          roundNumber: 'asc'
        }
      }
    });

    const rounds = teamBids.map(bid => ({
      roundId: bid.round.id,
      roundNumber: bid.round.roundNumber,
      roundName: `Round ${bid.round.roundNumber}${bid.round.position ? ` - ${bid.round.position}` : ''}${bid.round.position_group && bid.round.position_group !== 'ALL' ? ` (${bid.round.position_group})` : ''}`,
      bidCount: bid.bidCount
    }));

    return NextResponse.json({ rounds });
  } catch (error) {
    console.error('Get team bid rounds error:', error);
    return NextResponse.json(
      { error: 'Failed to get team bid rounds' },
      { status: 500 }
    );
  }
}
