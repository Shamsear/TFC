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
    const seasonId = searchParams.get('seasonId');
    const teamId = searchParams.get('teamId');

    if (!seasonId || !teamId) {
      return NextResponse.json({ error: 'Season ID and Team ID required' }, { status: 400 });
    }

    const transfers = await prisma.transfer_history.findMany({
      where: {
        seasonId,
        teamId
      },
      include: {
        basePlayer: {
          select: {
            id: true,
            name: true,
            photoUrl: true
          }
        }
      },
      orderBy: {
        basePlayer: {
          name: 'asc'
        }
      }
    });

    // Get player stats
    const players = await Promise.all(
      transfers.map(async (transfer) => {
        const stats = await prisma.seasonal_player_stats.findFirst({
          where: {
            basePlayerId: transfer.basePlayerId,
            seasonId
          },
          select: {
            position: true,
            position_group: true,
            overallRating: true,
            realWorldClub: true
          }
        });

        return {
          id: transfer.basePlayer.id,
          name: transfer.basePlayer.name,
          photoUrl: transfer.basePlayer.photoUrl,
          position: stats?.position || 'N/A',
          positionGroup: stats?.position_group || null,
          overallRating: stats?.overallRating || 0,
          realWorldClub: stats?.realWorldClub || 'N/A',
          soldPrice: transfer.soldPrice,
          acquisitionType: transfer.acquisitionType
        };
      })
    );

    return NextResponse.json({ players });
  } catch (error) {
    console.error('Get team players error:', error);
    return NextResponse.json(
      { error: 'Failed to get team players' },
      { status: 500 }
    );
  }
}
