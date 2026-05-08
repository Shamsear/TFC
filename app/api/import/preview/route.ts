import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { parseSQLiteDB, EFootballPlayer } from '@/lib/sqlite-parser';

// Next.js 13+ App Router configuration
export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds timeout

export interface PlayerChange {
  playerId: string;
  playerName: string;
  oldStats: any;
  newStats: EFootballPlayer;
  changedFields: string[];
}

export interface DuplicateInfo {
  playerId: string;
  playerName: string;
  position: string;
  existingCount: number;
  existingPlayers: Array<{
    id: string;
    name: string;
    team: string;
    rating: number;
    position: string;
  }>;
  reason: string;
  duplicateType: 'file-vs-file' | 'file-vs-db';
  allFileInstances?: EFootballPlayer[]; // All instances from the file when duplicateType is 'file-vs-file'
}

export interface PreviewResponse {
  mode: 'import' | 'update';
  players: EFootballPlayer[];
  newPlayers: EFootballPlayer[];
  changedPlayers: PlayerChange[];
  unchangedPlayers: EFootballPlayer[];
  duplicates: DuplicateInfo[];
  seasonId: string;
  stats: {
    total: number;
    new: number;
    changed: number;
    unchanged: number;
    duplicates: number;
  };
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    let session;
    try {
      session = await auth();
    } catch (authError) {
      console.error('Auth error:', authError);
      return NextResponse.json(
        { error: 'Authentication failed', details: authError instanceof Error ? authError.message : String(authError) },
        { status: 401 }
      );
    }

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized - Please sign in' }, { status: 401 });
    }

    // Parse form data
    let formData;
    try {
      formData = await request.formData();
    } catch (formError) {
      console.error('Form data parsing error:', formError);
      return NextResponse.json(
        { error: 'Failed to parse form data', details: formError instanceof Error ? formError.message : String(formError) },
        { status: 400 }
      );
    }

    const file = formData.get('file') as File;
    const seasonId = formData.get('seasonId') as string;
    const mode = formData.get('mode') as 'import' | 'update';

    if (!file || !seasonId || !mode) {
      return NextResponse.json(
        { error: 'Missing required fields', received: { file: !!file, seasonId: !!seasonId, mode: !!mode } },
        { status: 400 }
      );
    }

    // Verify season exists
    let season;
    try {
      season = await prisma.seasons.findUnique({
        where: { id: seasonId }
      });
    } catch (dbError) {
      console.error('Database error finding season:', dbError);
      return NextResponse.json(
        { error: 'Database error', details: dbError instanceof Error ? dbError.message : String(dbError) },
        { status: 500 }
      );
    }

    if (!season) {
      return NextResponse.json({ error: 'Season not found' }, { status: 404 });
    }

    // Parse database
    let buffer;
    let parseResult;
    try {
      buffer = Buffer.from(await file.arrayBuffer());
      parseResult = parseSQLiteDB(buffer);
    } catch (parseError) {
      console.error('File parsing error:', parseError);
      return NextResponse.json(
        { error: 'Failed to parse database file', details: parseError instanceof Error ? parseError.message : String(parseError) },
        { status: 400 }
      );
    }

    if (!parseResult.success || !parseResult.players) {
      return NextResponse.json(
        { error: parseResult.error || 'Failed to parse database - no players found' },
        { status: 400 }
      );
    }

    const dbPlayers = parseResult.players;

    // Get existing players
    let existingPlayers;
    try {
      existingPlayers = await prisma.base_players.findMany({
        include: {
          seasonalPlayerStats: {
            where: { seasonId },
            take: 1
          }
        }
      });
    } catch (dbError) {
      console.error('Database error fetching existing players:', dbError);
      return NextResponse.json(
        { error: 'Failed to fetch existing players', details: dbError instanceof Error ? dbError.message : String(dbError) },
        { status: 500 }
      );
    }

    // Create lookup maps
    const existingByName = new Map(
      existingPlayers.map(p => [p.name.toLowerCase(), p])
    );

    const duplicates: DuplicateInfo[] = [];
    const newPlayers: EFootballPlayer[] = [];
    const changedPlayers: PlayerChange[] = [];
    const unchangedPlayers: EFootballPlayer[] = [];

    // First, detect duplicates WITHIN the uploaded file
    const filePlayersByNamePos = new Map<string, EFootballPlayer[]>();
    for (const player of dbPlayers) {
      const key = `${player.playerName.toLowerCase()}|${player.position}`;
      if (!filePlayersByNamePos.has(key)) {
        filePlayersByNamePos.set(key, []);
      }
      filePlayersByNamePos.get(key)!.push(player);
    }

    // Mark duplicates within file
    const duplicatePlayerIds = new Set<string>();
    const processedFileDuplicates = new Set<string>();
    
    for (const [key, players] of filePlayersByNamePos.entries()) {
      if (players.length > 1 && !processedFileDuplicates.has(key)) {
        // Multiple players with same name and position in the file
        processedFileDuplicates.add(key);
        
        // Mark all as duplicates
        players.forEach(p => duplicatePlayerIds.add(p.playerId));
        
        // Check if they have the same nationality (likely same player)
        const nationalities = new Set(players.map(p => p.nationality?.toLowerCase()));
        const isSamePlayer = nationalities.size === 1 || 
                            (nationalities.size === 2 && (nationalities.has('') || nationalities.has(null as any)));
        
        // Use the first player as the representative
        const representative = players[0];
        duplicates.push({
          playerId: representative.playerId,
          playerName: representative.playerName,
          position: representative.position,
          existingCount: players.length - 1,
          existingPlayers: [], // Not used for file-vs-file
          reason: isSamePlayer 
            ? `Found ${players.length} entries for this player (same name, position, and nationality)`
            : `Found ${players.length} players with same name and position (different nationalities - may be different people)`,
          duplicateType: 'file-vs-file',
          allFileInstances: players // All instances from the file
        });
      }
    }

    // Analyze each player from database
    const uniquePlayersToProcess = new Set<string>();
    
    for (const dbPlayer of dbPlayers) {
      const existing = existingByName.get(dbPlayer.playerName.toLowerCase());

      // Skip if this is a duplicate instance (not the representative)
      if (duplicatePlayerIds.has(dbPlayer.playerId)) {
        // Check if this is the representative (first in the group)
        const key = `${dbPlayer.playerName.toLowerCase()}|${dbPlayer.position}`;
        const group = filePlayersByNamePos.get(key);
        if (group && group[0].playerId !== dbPlayer.playerId) {
          // This is not the representative, skip it
          continue;
        }
      }

      uniquePlayersToProcess.add(dbPlayer.playerId);

      if (!existing) {
        // New player
        if (!duplicatePlayerIds.has(dbPlayer.playerId)) {
          newPlayers.push(dbPlayer);
        }
        
        // Check for duplicates against existing database (only if not already flagged)
        if (!duplicatePlayerIds.has(dbPlayer.playerId)) {
          const matchingExisting = existingPlayers.filter(p => {
            const nameMatch = p.name.toLowerCase() === dbPlayer.playerName.toLowerCase();
            const stats = p.seasonalPlayerStats[0];
            const posMatch = stats && stats.position === dbPlayer.position;
            return nameMatch && posMatch;
          });

          if (matchingExisting.length > 0) {
            duplicatePlayerIds.add(dbPlayer.playerId);
            duplicates.push({
              playerId: dbPlayer.playerId,
              playerName: dbPlayer.playerName,
              position: dbPlayer.position,
              existingCount: matchingExisting.length,
              existingPlayers: matchingExisting.map(p => ({
                id: p.id,
                name: p.name,
                team: p.seasonalPlayerStats[0]?.realWorldClub || 'Unknown',
                rating: p.seasonalPlayerStats[0]?.overallRating || 0,
                position: p.seasonalPlayerStats[0]?.position || 'N/A'
              })),
              reason: `Player already exists in database with same name and position`,
              duplicateType: 'file-vs-db'
            });
          }
        }
      } else {
        // Existing player - check for changes
        const existingStats = existing.seasonalPlayerStats[0];

        if (!existingStats) {
          // Player exists but no stats for this season
          if (!duplicatePlayerIds.has(dbPlayer.playerId)) {
            newPlayers.push(dbPlayer);
          }
        } else {
          // Compare stats
          const changedFields: string[] = [];

          if (existingStats.position !== dbPlayer.position) changedFields.push('position');
          if (existingStats.realWorldClub !== dbPlayer.teamName) changedFields.push('teamName');
          if (existingStats.overallRating !== dbPlayer.overallRating) changedFields.push('overallRating');
          if (existingStats.nationality !== dbPlayer.nationality) changedFields.push('nationality');
          if (existingStats.playing_style !== dbPlayer.playingStyle) changedFields.push('playingStyle');
          
          // Check detailed stats
          if (existingStats.offensive_awareness !== dbPlayer.offensiveAwareness) changedFields.push('offensiveAwareness');
          if (existingStats.ball_control !== dbPlayer.ballControl) changedFields.push('ballControl');
          if (existingStats.dribbling !== dbPlayer.dribbling) changedFields.push('dribbling');
          if (existingStats.speed !== dbPlayer.speed) changedFields.push('speed');
          if (existingStats.acceleration !== dbPlayer.acceleration) changedFields.push('acceleration');
          if (existingStats.finishing !== dbPlayer.finishing) changedFields.push('finishing');
          if (existingStats.low_pass !== dbPlayer.lowPass) changedFields.push('lowPass');
          if (existingStats.defensive_awareness !== dbPlayer.defensiveAwareness) changedFields.push('defensiveAwareness');
          if (existingStats.tackling !== dbPlayer.tackling) changedFields.push('tackling');

          if (changedFields.length > 0) {
            changedPlayers.push({
              playerId: dbPlayer.playerId,
              playerName: dbPlayer.playerName,
              oldStats: existingStats,
              newStats: dbPlayer,
              changedFields
            });
          } else {
            unchangedPlayers.push(dbPlayer);
          }
        }
      }
    }

    // Total is the raw count from the file (all instances)
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
      { error: errorMessage, details: error instanceof Error ? error.stack : String(error) },
      { status: 500 }
    );
  }
}
