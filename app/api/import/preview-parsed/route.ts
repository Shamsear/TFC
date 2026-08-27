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

    const { playerIds, seasonId, mode } = body as {
      playerIds: string[];
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

    // Get existing players from the database in a single query
    const existingPlayers = await prisma.base_players.findMany({
      where: {
        player_id: { in: playerIds }
      },
      select: {
        id: true,
        player_id: true,
        name: true,
        seasonalPlayerStats: {
          where: { seasonId },
          take: 1,
          select: {
            position: true,
            overallRating: true,
            realWorldClub: true
          }
        }
      }
    });

    return NextResponse.json({
      existingPlayers
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
