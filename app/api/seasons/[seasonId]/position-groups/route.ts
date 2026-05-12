import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

// Positions that support groups
const GROUPED_POSITIONS = ['CB', 'DMF', 'CMF', 'AMF', 'CF'];

// GET - Fetch all players grouped by position
export async function GET(
  request: NextRequest,
  { params }: { params: { seasonId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { seasonId } = params;

    // Fetch all players for this season with grouped positions
    const players = await prisma.seasonal_player_stats.findMany({
      where: {
        seasonId,
        position: {
          in: GROUPED_POSITIONS
        }
      },
      include: {
        basePlayer: true
      },
      orderBy: [
        { position: 'asc' },
        { overallRating: 'desc' }
      ]
    });

    // Group by position
    const grouped = GROUPED_POSITIONS.reduce((acc, position) => {
      const positionPlayers = players.filter(p => p.position === position);
      
      acc[position] = {
        groupA: positionPlayers.filter(p => p.position_group === 'A'),
        groupB: positionPlayers.filter(p => p.position_group === 'B'),
        unassigned: positionPlayers.filter(p => !p.position_group)
      };
      
      return acc;
    }, {} as Record<string, any>);

    // Calculate statistics
    const stats = GROUPED_POSITIONS.reduce((acc, position) => {
      const groupA = grouped[position].groupA;
      const groupB = grouped[position].groupB;
      
      acc[position] = {
        groupA: {
          count: groupA.length,
          avgRating: groupA.length > 0 
            ? Math.round(groupA.reduce((sum: number, p: any) => sum + p.overallRating, 0) / groupA.length)
            : 0
        },
        groupB: {
          count: groupB.length,
          avgRating: groupB.length > 0
            ? Math.round(groupB.reduce((sum: number, p: any) => sum + p.overallRating, 0) / groupB.length)
            : 0
        },
        unassigned: grouped[position].unassigned.length
      };
      
      return acc;
    }, {} as Record<string, any>);

    return NextResponse.json({
      grouped,
      stats,
      positions: GROUPED_POSITIONS
    });

  } catch (error) {
    console.error('Error fetching position groups:', error);
    return NextResponse.json(
      { error: 'Failed to fetch position groups' },
      { status: 500 }
    );
  }
}

// POST - Auto-distribute players into groups
export async function POST(
  request: NextRequest,
  { params }: { params: { seasonId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'SUB_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { seasonId } = params;
    const { position } = await request.json();

    if (!GROUPED_POSITIONS.includes(position)) {
      return NextResponse.json(
        { error: 'Invalid position for grouping' },
        { status: 400 }
      );
    }

    // Fetch all players for this position
    const players = await prisma.seasonal_player_stats.findMany({
      where: {
        seasonId,
        position
      },
      orderBy: {
        overallRating: 'desc'
      }
    });

    // Distribute alternately: best to A, 2nd best to B, 3rd to A, etc.
    const updates = players.map((player, index) => {
      const group = index % 2 === 0 ? 'A' : 'B';
      return prisma.seasonal_player_stats.update({
        where: { id: player.id },
        data: { position_group: group }
      });
    });

    await prisma.$transaction(updates);

    return NextResponse.json({
      success: true,
      message: `Distributed ${players.length} ${position} players into groups`,
      distributed: players.length
    });

  } catch (error) {
    console.error('Error auto-distributing groups:', error);
    return NextResponse.json(
      { error: 'Failed to auto-distribute groups' },
      { status: 500 }
    );
  }
}
