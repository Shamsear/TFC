import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logError, extractRequestContext } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ playerId: string }> }
) {
  const context = extractRequestContext(request)
  
  try {
    const { playerId } = await params;

    if (!playerId || typeof playerId !== "string") {
      return NextResponse.json(
        { error: "Invalid player ID" },
        { status: 400 }
      )
    }

    // Query base player with all seasonal stats and transfer history
    const playerData = await prisma.base_players.findUnique({
      where: { id: playerId },
      include: {
        seasonalPlayerStats: {
          include: {
            season: {
              select: {
                id: true,
                name: true,
                createdAt: true,
              },
            },
          },
          orderBy: {
            season: {
              createdAt: 'asc',
            },
          },
        },
        transferHistory: {
          include: {
            season: {
              select: {
                id: true,
                name: true,
                createdAt: true,
              },
            },
            team: {
              select: {
                id: true,
                name: true,
                logoUrl: true,
              },
            },
          },
          orderBy: {
            season: {
              createdAt: 'asc',
            },
          },
        },
      },
    });

    if (!playerData) {
      return NextResponse.json(
        { error: 'Player not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      basePlayer: {
        id: playerData.id,
        name: playerData.name,
        photoUrl: playerData.photoUrl,
        createdAt: playerData.createdAt,
        updatedAt: playerData.updatedAt,
      },
      seasonalStats: playerData.seasonalPlayerStats,
      transferHistory: playerData.transferHistory,
    });
  } catch (error) {
    logError('Failed to fetch player data', error, context);
    
    return NextResponse.json(
      { error: 'Failed to fetch player data. Please try again later.' },
      { status: 500 }
    );
  }
}
