import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getSquadSizeInfo } from '@/lib/squad-size-validator';

/**
 * GET /api/team/squad-info - Get team's squad size information
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

    // Get season_id from query params
    const { searchParams } = new URL(request.url);
    const seasonId = searchParams.get('season_id');

    if (!seasonId) {
      return NextResponse.json(
        { error: 'season_id is required' },
        { status: 400 }
      );
    }

    // Get squad size info
    const squadInfo = await getSquadSizeInfo(teamId, seasonId);

    return NextResponse.json(squadInfo);
  } catch (error) {
    console.error('Get squad info error:', error);
    return NextResponse.json(
      { error: 'Failed to get squad info' },
      { status: 500 }
    );
  }
}
