import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { EFootballPlayer } from '@/lib/sqlite-parser';
import { PlayerChange, DuplicateInfo, PreviewResponse } from '../preview/route';
import { gunzipSync } from 'zlib';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    let session;
    try {
      session = await auth();
    } catch (authError) {
      console.error('Auth error:', authError);
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if data is compressed
    const contentEncoding = request.headers.get('content-encoding');
    let body;

    if (contentEncoding === 'gzip') {
      // Decompress gzipped data
      const buffer = Buffer.from(await request.arrayBuffer());
      const decompressed = gunzipSync(buffer);
      body = JSON.parse(decompressed.toString('utf-8'));
    } else {
      // Parse JSON body normally
      body = await request.json();
    }

    const { playerIds, playerNames = [], seasonId, mode } = body as {
      playerIds: string[];
      playerNames?: string[];
      seasonId: string;
      mode: 'import' | 'update';
    };

    if (!playerIds || !seasonId || !mode) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify season exists
    const season = await prisma.seasons.findUnique({
      where: { id: seasonId }
    });

    if (!season) {
      return NextResponse.json({ error: 'Season not found' }, { status: 404 });
    }

    // Use raw SQL with array parameters to avoid bind variable limits and
    // get much better performance for large imports (36k+ players).
    // PostgreSQL ANY($1::text[]) is a single bind variable vs thousands of individual ones.

    // 1. Fetch existing players by player_id
    const existingPlayers = await prisma.$queryRawUnsafe<{
      id: string;
      player_id: string | null;
      name: string;
    }[]>(
      `SELECT id, player_id, name FROM "base_players" WHERE player_id = ANY($1::text[])`,
      playerIds
    );

    // 2. Fetch seasonal stats for those players
    const existingPlayerIds = existingPlayers.map(p => p.id);
    const existingStatsMap = new Map<string, any>();
    const STATS_BATCH = 5_000;

    if (existingPlayerIds.length > 0) {
      // Batch seasonal stats queries to avoid too many IDs
      for (let i = 0; i < existingPlayerIds.length; i += STATS_BATCH) {
        const chunk = existingPlayerIds.slice(i, i + STATS_BATCH);
        const stats = await prisma.seasonal_player_stats.findMany({
          where: {
            basePlayerId: { in: chunk },
            seasonId
          },
          select: {
            basePlayerId: true,
            position: true,
            realWorldClub: true,
            overallRating: true,
            star_rating: true,
            nationality: true,
            playing_style: true,
            height: true,
            weight: true,
            age: true,
            foot: true,
            featured: true,
            weak_foot_usage: true,
            weak_foot_accuracy: true,
            form: true,
            injury_resistance: true,
            condition: true,
            max_level: true,
            overall_at_max_level: true,
            offensive_awareness: true,
            ball_control: true,
            dribbling: true,
            tight_possession: true,
            low_pass: true,
            lofted_pass: true,
            finishing: true,
            heading: true,
            set_piece_taking: true,
            curl: true,
            speed: true,
            acceleration: true,
            kicking_power: true,
            jumping: true,
            physical_contact: true,
            balance: true,
            stamina: true,
            defensive_awareness: true,
            tackling: true,
            aggression: true,
            defensive_engagement: true,
            gk_awareness: true,
            gk_catching: true,
            gk_parrying: true,
            gk_reflexes: true,
            gk_reach: true
          }
        });
        for (const s of stats) {
          existingStatsMap.set(s.basePlayerId, s);
        }
      }
    }

    // Merge stats into existing players
    const existingPlayersWithStats = existingPlayers.map(p => ({
      ...p,
      seasonalPlayerStats: existingStatsMap.has(p.id) ? [existingStatsMap.get(p.id)] : []
    }));

    // 3. Fetch name matches using ILIKE ANY() — single array parameter,
    //    case-insensitive in one DB call instead of thousands of OR conditions.
    let nameMatchesWithStats: any[] = [];
    if (playerNames.length > 0) {
      const uniqueNames = [...new Set(playerNames)];
      const nameRows = await prisma.$queryRawUnsafe<{
        id: string;
        player_id: string | null;
        name: string;
      }[]>(
        `SELECT id, player_id, name FROM "base_players" WHERE name ILIKE ANY($1::text[])`,
        uniqueNames
      );

      // Fetch seasonal stats for name-matched players
      const nameMatchIds = nameRows.map(r => r.id);
      if (nameMatchIds.length > 0) {
        const nmStatsMap = new Map<string, any>();
        for (let i = 0; i < nameMatchIds.length; i += STATS_BATCH) {
          const chunk = nameMatchIds.slice(i, i + STATS_BATCH);
          const nmStats = await prisma.seasonal_player_stats.findMany({
            where: {
              basePlayerId: { in: chunk },
              seasonId
            },
            select: {
              basePlayerId: true,
              position: true,
              realWorldClub: true,
              overallRating: true,
              nationality: true,
              featured: true
            }
          });
          for (const s of nmStats) {
            nmStatsMap.set(s.basePlayerId, s);
          }
        }
        nameMatchesWithStats = nameRows.map(r => ({
          ...r,
          seasonalPlayerStats: nmStatsMap.has(r.id) ? [nmStatsMap.get(r.id)] : []
        }));
      }
    }

    return NextResponse.json({
      existingPlayers: existingPlayersWithStats,
      nameMatches: nameMatchesWithStats
    });

  } catch (error) {
    console.error('Preview error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to preview import';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
