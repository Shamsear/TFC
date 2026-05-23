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
    const playerId = searchParams.get('playerId');
    const teamId = searchParams.get('teamId');
    const seasonId = searchParams.get('seasonId');

    if (!playerId || !teamId || !seasonId) {
      return NextResponse.json({ error: 'Player ID, Team ID, and Season ID required' }, { status: 400 });
    }

    // Find the transfer history record for this player
    const transfer = await prisma.transfer_history.findFirst({
      where: {
        basePlayerId: playerId,
        teamId,
        seasonId
      },
      select: {
        roundId: true,
        round: {
          select: {
            id: true,
            roundNumber: true,
            position: true,
            position_group: true
          }
        }
      }
    });

    if (!transfer || !transfer.roundId) {
      return NextResponse.json({ 
        roundId: null,
        message: 'Player acquisition round not found' 
      });
    }

    return NextResponse.json({ 
      roundId: transfer.roundId,
      roundNumber: transfer.round?.roundNumber,
      roundName: transfer.round 
        ? `Round ${transfer.round.roundNumber}${transfer.round.position ? ` - ${transfer.round.position}` : ''}${transfer.round.position_group && transfer.round.position_group !== 'ALL' ? ` (${transfer.round.position_group})` : ''}`
        : null
    });
  } catch (error) {
    console.error('Get player acquisition round error:', error);
    return NextResponse.json(
      { error: 'Failed to get player acquisition round' },
      { status: 500 }
    );
  }
}
