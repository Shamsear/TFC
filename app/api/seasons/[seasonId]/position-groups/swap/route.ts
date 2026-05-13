import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

// POST - Swap two players between groups
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ seasonId: string }> }
) {
  const { seasonId } = await params;
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'SUB_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { player1Id, player2Id } = await request.json();

    if (!player1Id || !player2Id) {
      return NextResponse.json(
        { error: 'Both player IDs are required' },
        { status: 400 }
      );
    }

    // Fetch both players
    const [player1, player2] = await Promise.all([
      prisma.seasonal_player_stats.findUnique({ where: { id: player1Id } }),
      prisma.seasonal_player_stats.findUnique({ where: { id: player2Id } })
    ]);

    if (!player1 || !player2) {
      return NextResponse.json(
        { error: 'One or both players not found' },
        { status: 404 }
      );
    }

    // Swap groups
    await prisma.$transaction([
      prisma.seasonal_player_stats.update({
        where: { id: player1Id },
        data: { position_group: player2.position_group }
      }),
      prisma.seasonal_player_stats.update({
        where: { id: player2Id },
        data: { position_group: player1.position_group }
      })
    ]);

    return NextResponse.json({
      success: true,
      message: 'Players swapped successfully'
    });

  } catch (error) {
    console.error('Error swapping players:', error);
    return NextResponse.json(
      { error: 'Failed to swap players' },
      { status: 500 }
    );
  }
}
