import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { decryptBids } from '@/lib/auction/encryption';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'SUB_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: roundId } = await params;
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');
    const seasonId = searchParams.get('seasonId');

    if (!teamId || !seasonId) {
      return NextResponse.json({ error: 'Team ID and Season ID required' }, { status: 400 });
    }

    // Get team's bids for this round
    const teamBids = await prisma.team_round_bids.findUnique({
      where: {
        roundId_teamId: {
          roundId,
          teamId
        }
      }
    });

    if (!teamBids) {
      return NextResponse.json({ bids: [] });
    }

    // Decrypt bids
    const decrypted = decryptBids(teamBids.encryptedBids);
    const parsed = JSON.parse(decrypted);

    // Get all player IDs from bids
    const playerIds = parsed.bids.map((bid: any) => bid.base_player_id);

    // Check which players are already owned (ACTIVE transfers)
    const ownedPlayers = await prisma.transfer_history.findMany({
      where: {
        basePlayerId: { in: playerIds },
        seasonId,
        status: 'ACTIVE'
      },
      include: {
        team: {
          select: { name: true }
        }
      }
    });

    const ownedMap = new Map(
      ownedPlayers.map(p => [p.basePlayerId, p.team.name])
    );

    // Build response with sold/unsold status
    const bids = parsed.bids.map((bid: any) => ({
      playerId: bid.base_player_id,
      playerName: bid.player_name,
      bidAmount: bid.amount,
      isSold: ownedMap.has(bid.base_player_id),
      ownedByTeam: ownedMap.get(bid.base_player_id) || null
    }));

    return NextResponse.json({ bids });
  } catch (error) {
    console.error('Get team bids with status error:', error);
    return NextResponse.json(
      { error: 'Failed to get team bids' },
      { status: 500 }
    );
  }
}
