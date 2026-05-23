import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { calculateReserve } from '@/lib/auction/reserve-calculator-v2';

/**
 * GET /api/team/reserve-info - Get team's reserve information for a round
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session || session.user.role !== 'TEAM_MANAGER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const teamId = session.user.teamId;
    if (!teamId) {
      return NextResponse.json({ error: 'Team not found' }, { status: 400 });
    }

    // Get parameters from query
    const { searchParams } = new URL(request.url);
    const seasonId = searchParams.get('season_id');
    const roundId = searchParams.get('round_id');

    if (!seasonId || !roundId) {
      return NextResponse.json(
        { error: 'season_id and round_id are required' },
        { status: 400 }
      );
    }

    // Calculate reserve
    const reserveInfo = await calculateReserve(teamId, roundId, seasonId);

    return NextResponse.json(reserveInfo, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('Get reserve info error:', error);
    return NextResponse.json(
      { error: 'Failed to get reserve info' },
      { status: 500 }
    );
  }
}
