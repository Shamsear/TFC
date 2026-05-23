import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'SUB_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const playerId = searchParams.get('playerId');
    const seasonId = searchParams.get('seasonId');

    if (!playerId || !seasonId) {
      return NextResponse.json({ error: 'Player ID and Season ID required' }, { status: 400 });
    }

    const transfer = await prisma.transfer_history.findFirst({
      where: {
        basePlayerId: playerId,
        seasonId: seasonId
      },
      include: {
        team: {
          select: {
            id: true,
            name: true
          }
        },
        round: {
          select: {
            id: true,
            roundNumber: true,
            position_group: true
          }
        }
      }
    });

    return NextResponse.json({ transfer });
  } catch (error) {
    console.error('Transfer search error:', error);
    return NextResponse.json(
      { error: 'Failed to search transfer' },
      { status: 500 }
    );
  }
}
