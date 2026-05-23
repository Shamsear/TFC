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

    // Get all rounds with bids from this team
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

    // Get all players owned by this team
    const ownedPlayers = await prisma.transfer_history.findMany({
      where: {
        teamId,
        seasonId
      },
      select: {
        basePlayerId: true,
        soldPrice: true,
        roundId: true,
        team: {
          select: {
            name: true
          }
        }
      }
    });

    const ownedPlayerMap = new Map(
      ownedPlayers.map(p => [p.basePlayerId, { soldPrice: p.soldPrice, roundId: p.roundId, teamName: p.team.name }])
    );

    // Get all players owned by other teams
    const allOwnedPlayers = await prisma.transfer_history.findMany({
      where: {
        seasonId
      },
      select: {
        basePlayerId: true,
        team: {
          select: {
            name: true
          }
        }
      }
    });

    const allOwnedMap = new Map(
      allOwnedPlayers.map(p => [p.basePlayerId, p.team.name])
    );

    // Decrypt and collect all bids
    const { decryptBids } = await import('@/lib/auction/encryption');
    const allBids: any[] = [];

    for (const teamBid of teamBids) {
      try {
        const decrypted = decryptBids(teamBid.encryptedBids);
        const bidData = JSON.parse(decrypted);
        
        if (bidData.bids && Array.isArray(bidData.bids)) {
          for (const bid of bidData.bids) {
            const isOwnedByThisTeam = ownedPlayerMap.has(bid.base_player_id);
            const ownedByOther = !isOwnedByThisTeam && allOwnedMap.has(bid.base_player_id);
            const ownerInfo = ownedPlayerMap.get(bid.base_player_id);

            allBids.push({
              playerId: bid.base_player_id,
              playerName: bid.player_name || 'Unknown Player',
              bidAmount: bid.amount,
              roundId: teamBid.round.id,
              roundNumber: teamBid.round.roundNumber,
              roundName: `Round ${teamBid.round.roundNumber}${teamBid.round.position ? ` - ${teamBid.round.position}` : ''}${teamBid.round.position_group && teamBid.round.position_group !== 'ALL' ? ` (${teamBid.round.position_group})` : ''}`,
              isSold: isOwnedByThisTeam,
              soldToOther: ownedByOther,
              ownedByTeam: isOwnedByThisTeam ? ownerInfo?.teamName : (ownedByOther ? allOwnedMap.get(bid.base_player_id) : undefined),
              soldPrice: ownerInfo?.soldPrice,
              acquiredInRound: ownerInfo?.roundId
            });
          }
        }
      } catch (error) {
        console.error(`Failed to decrypt bids for round ${teamBid.round.id}:`, error);
      }
    }

    // Sort by round number, then by player name
    allBids.sort((a, b) => {
      if (a.roundNumber !== b.roundNumber) {
        return a.roundNumber - b.roundNumber;
      }
      return a.playerName.localeCompare(b.playerName);
    });

    return NextResponse.json({ bids: allBids });
  } catch (error) {
    console.error('Get team all bids error:', error);
    return NextResponse.json(
      { error: 'Failed to get team bids' },
      { status: 500 }
    );
  }
}
