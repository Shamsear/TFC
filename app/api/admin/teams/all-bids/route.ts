import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { decryptBids } from '@/lib/auction/encryption';

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

    // Get all team round bids for this team in this season
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
        roundId: true
      }
    });

    const ownedPlayerMap = new Map(
      ownedPlayers.map(p => [p.basePlayerId, { soldPrice: p.soldPrice, roundId: p.roundId }])
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

    const allOwnedPlayerMap = new Map(
      allOwnedPlayers.map(p => [p.basePlayerId, p.team.name])
    );

    // Decrypt and collect all bids
    const allBids: any[] = [];

    for (const teamBid of teamBids) {
      try {
        const decrypted = decryptBids(teamBid.encryptedBids);
        const bidData = JSON.parse(decrypted);
        
        if (bidData.bids && Array.isArray(bidData.bids)) {
          for (const bid of bidData.bids) {
            const isOwnedByThisTeam = ownedPlayerMap.has(bid.base_player_id);
            const ownedByOther = !isOwnedByThisTeam && allOwnedPlayerMap.has(bid.base_player_id);
            
            allBids.push({
              playerId: bid.base_player_id,
              playerName: bid.player_name || 'Unknown',
              bidAmount: bid.amount,
              roundId: teamBid.round.id,
              roundNumber: teamBid.round.roundNumber,
              roundName: `Round ${teamBid.round.roundNumber}${teamBid.round.position ? ` - ${teamBid.round.position}` : ''}${teamBid.round.position_group && teamBid.round.position_group !== 'ALL' ? ` (${teamBid.round.position_group})` : ''}`,
              isSold: isOwnedByThisTeam,
              soldToOther: ownedByOther,
              ownedByTeam: ownedByOther ? allOwnedPlayerMap.get(bid.base_player_id) : undefined,
              soldPrice: isOwnedByThisTeam ? ownedPlayerMap.get(bid.base_player_id)?.soldPrice : undefined,
              acquiredInRound: isOwnedByThisTeam ? ownedPlayerMap.get(bid.base_player_id)?.roundId : undefined
            });
          }
        }
      } catch (error) {
        console.error(`Failed to decrypt bids for round ${teamBid.round.roundNumber}:`, error);
      }
    }

    return NextResponse.json({ bids: allBids });
  } catch (error) {
    console.error('Get team all bids error:', error);
    return NextResponse.json(
      { error: 'Failed to get team bids' },
      { status: 500 }
    );
  }
}
