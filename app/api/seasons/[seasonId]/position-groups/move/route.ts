import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

// POST - Move a player to a different group
export async function POST(
  request: NextRequest,
  { params }: { params: { seasonId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'SUB_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { playerId, newGroup } = await request.json();

    if (!playerId || !['A', 'B', null].includes(newGroup)) {
      return NextResponse.json(
        { error: 'Invalid parameters' },
        { status: 400 }
      );
    }

    // Update player's group
    await prisma.seasonal_player_stats.update({
      where: { id: playerId },
      data: { position_group: newGroup }
    });

    return NextResponse.json({
      success: true,
      message: 'Player moved successfully'
    });

  } catch (error) {
    console.error('Error moving player:', error);
    return NextResponse.json(
      { error: 'Failed to move player' },
      { status: 500 }
    );
  }
}
