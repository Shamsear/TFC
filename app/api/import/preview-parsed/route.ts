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

    const { players: dbPlayers, seasonId, mode } = body as {
      players: EFootballPlayer[];
      seasonId: string;
      mode: 'import' | 'update';
    };

    if (!dbPlayers || !seasonId || !mode) {
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

    // Get existing players
    const existingPlayers = await prisma.base_players.findMany({
      include: {
        seasonalPlayerStats: {
          where: { seasonId },
          take: 1
        }
      }
    });

    // Create lookup maps
    const existingByName = new Map(
      existingPlayers.map(p => [p.name.toLowerCase(), p])
    );

    const duplicates: DuplicateInfo[] = [];
    const newPlayers: EFootballPlayer[] = [];
    const changedPlayers: PlayerChange[] = [];
    const unchangedPlayers: EFootballPlayer[] = [];

    // First, detect duplicates WITHIN the uploaded file
    // NOTE: We no longer treat file-vs-file as duplicates - user can select all
    // Only flag file-vs-db duplicates (players already in database with same player_id)
    const filePlayersByNamePos = new Map<string, EFootballPlayer[]>();
    for (const player of dbPlayers) {
      const key = `${player.playerName.toLowerCase()}|${player.position}`;
      if (!filePlayersByNamePos.has(key)) {
        filePlayersByNamePos.set(key, []);
      }
      filePlayersByNamePos.get(key)!.push(player);
    }

    // No longer mark file-vs-file as duplicates - all can be selected
    const duplicatePlayerIds = new Set<string>();
    const processedFileDuplicates = new Set<string>();

    // Analyze each player from database
    for (const dbPlayer of dbPlayers) {
      // Check if player already exists in database by player_id
      const existingByPlayerId = await prisma.base_players.findUnique({
        where: { player_id: dbPlayer.playerId }
      });

      if (existingByPlayerId) {
        // Player with this player_id already exists in database - flag as duplicate
        duplicatePlayerIds.add(dbPlayer.playerId);
        duplicates.push({
          playerId: dbPlayer.playerId,
          playerName: dbPlayer.playerName,
          position: dbPlayer.position,
          existingCount: 1,
          existingPlayers: [{
            id: existingByPlayerId.id,
            name: existingByPlayerId.name,
            team: 'Existing',
            rating: 0,
            position: dbPlayer.position
          }],
          reason: `Player already exists in database (player_id: ${dbPlayer.playerId})`,
          duplicateType: 'file-vs-db'
        });
        continue; // Skip this player from new/changed/unchanged lists
      }

      // Player doesn't exist in database - add to new players
      newPlayers.push(dbPlayer);
    }

    const totalRawPlayers = dbPlayers.length;

    const response: PreviewResponse = {
      mode,
      seasonId,
      players: dbPlayers,
      newPlayers,
      changedPlayers,
      unchangedPlayers,
      duplicates,
      stats: {
        total: totalRawPlayers,
        new: newPlayers.length,
        changed: changedPlayers.length,
        unchanged: unchangedPlayers.length,
        duplicates: duplicates.length
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Preview error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to preview import';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
