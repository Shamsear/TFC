import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

// Positions that support groups
const GROUPED_POSITIONS = ['CB', 'DMF', 'CMF', 'AMF', 'CF'];

// GET - Fetch all players grouped by position
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ seasonId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { seasonId } = await params;

    // Fetch all players for this season with grouped positions
    const players = await prisma.seasonal_player_stats.findMany({
      where: {
        seasonId,
        position: {
          in: GROUPED_POSITIONS
        }
      },
      select: {
        id: true,
        basePlayerId: true,
        position: true,
        position_group: true,
        overallRating: true,
        realWorldClub: true,
        basePlayer: {
          select: {
            id: true,
            name: true,
            photoUrl: true
          }
        }
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
  { params }: { params: Promise<{ seasonId: string }> }
) {
  console.log('[API POST] Auto-distribute request received');
  
  try {
    const session = await auth();
    console.log('[API POST] Session:', {
      hasUser: !!session?.user,
      userId: session?.user?.id,
      role: session?.user?.role
    });
    
    if (!session?.user) {
      console.log('[API POST] No user in session - Unauthorized');
      return NextResponse.json({ error: 'Unauthorized - No user' }, { status: 401 });
    }
    
    if (session.user.role !== 'SUB_ADMIN' && session.user.role !== 'SUPER_ADMIN') {
      console.log('[API POST] User role not authorized:', session.user.role);
      return NextResponse.json({ error: 'Unauthorized - Invalid role' }, { status: 401 });
    }

    const { seasonId } = await params;
    const body = await request.json();
    const { position } = body;
    
    console.log('[API POST] Request params:', { seasonId, position });

    if (!GROUPED_POSITIONS.includes(position)) {
      console.log('[API POST] Invalid position:', position);
      return NextResponse.json(
        { error: 'Invalid position for grouping' },
        { status: 400 }
      );
    }

    console.log('[API POST] Fetching players for position:', position);
    
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

    console.log('[API POST] Found players:', players.length);

    if (players.length === 0) {
      console.log('[API POST] No players found to distribute');
      return NextResponse.json({
        success: true,
        message: 'No players to distribute',
        distributed: 0
      });
    }

    // For large datasets, use updateMany in batches instead of individual updates
    console.log('[API POST] Distributing players in batches...');
    
    // Split players into groups A and B
    const groupAIds: string[] = [];
    const groupBIds: string[] = [];
    
    players.forEach((player, index) => {
      if (index % 2 === 0) {
        groupAIds.push(player.id);
      } else {
        groupBIds.push(player.id);
      }
    });

    console.log('[API POST] Group A:', groupAIds.length, 'players');
    console.log('[API POST] Group B:', groupBIds.length, 'players');

    // Update in two batch operations instead of individual transactions
    const batchSize = 1000;
    let totalUpdated = 0;

    // Update Group A in batches
    for (let i = 0; i < groupAIds.length; i += batchSize) {
      const batch = groupAIds.slice(i, i + batchSize);
      await prisma.seasonal_player_stats.updateMany({
        where: {
          id: { in: batch }
        },
        data: {
          position_group: 'A'
        }
      });
      totalUpdated += batch.length;
      console.log('[API POST] Updated Group A batch:', totalUpdated, '/', groupAIds.length);
    }

    // Update Group B in batches
    for (let i = 0; i < groupBIds.length; i += batchSize) {
      const batch = groupBIds.slice(i, i + batchSize);
      await prisma.seasonal_player_stats.updateMany({
        where: {
          id: { in: batch }
        },
        data: {
          position_group: 'B'
        }
      });
      totalUpdated += batch.length;
      console.log('[API POST] Updated Group B batch:', totalUpdated, '/', players.length);
    }

    console.log('[API POST] All updates completed successfully');

    return NextResponse.json({
      success: true,
      message: `Distributed ${players.length} ${position} players into groups`,
      distributed: players.length,
      groupA: groupAIds.length,
      groupB: groupBIds.length
    });

  } catch (error) {
    console.error('[API POST] Error auto-distributing groups:', error);
    return NextResponse.json(
      { error: 'Failed to auto-distribute groups', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
