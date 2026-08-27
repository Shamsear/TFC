import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { EFootballPlayer } from '@/lib/sqlite-parser';
import { PlayerChange, DuplicateInfo, PreviewResponse } from '../preview/route';
import { gunzipSync } from 'zlib';

export const runtime = 'nodejs';
export const maxDuration = 60;

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

    // PostgreSQL has a max of 32,767 bind variables per prepared statement.
    // Batch queries to stay under that limit.
    const BATCH_SIZE = 25_000;

    const selectFields = {
      id: true,
      player_id: true,
      name: true,
      seasonalPlayerStats: {
        where: { seasonId },
        take: 1,
        select: {
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
      }
    };

    const nameMatchSelectFields = {
      id: true,
      player_id: true,
      name: true,
      seasonalPlayerStats: {
        where: { seasonId },
        take: 1,
        select: {
          position: true,
          realWorldClub: true,
          overallRating: true,
          nationality: true,
          featured: true
        }
      }
    };

    // Batch playerIds query
    const existingPlayers: any[] = [];
    for (let i = 0; i < playerIds.length; i += BATCH_SIZE) {
      const chunk = playerIds.slice(i, i + BATCH_SIZE);
      const batch = await prisma.base_players.findMany({
        where: { player_id: { in: chunk } },
        select: selectFields
      });
      existingPlayers.push(...batch);
    }

    // Batch nameMatches query (OR per name, so BATCH_SIZE items per batch)
    const nameMatches: any[] = [];
    if (playerNames.length > 0) {
      for (let i = 0; i < playerNames.length; i += BATCH_SIZE) {
        const chunk = playerNames.slice(i, i + BATCH_SIZE);
        const batch = await prisma.base_players.findMany({
          where: {
            OR: chunk.map(name => ({
              name: { equals: name, mode: 'insensitive' as const }
            }))
          },
          select: nameMatchSelectFields
        });
        nameMatches.push(...batch);
      }
    }

    return NextResponse.json({
      existingPlayers,
      nameMatches
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
