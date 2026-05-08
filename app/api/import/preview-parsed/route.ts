import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { EFootballPlayer } from '@/lib/sqlite-parser';
import { PlayerChange, DuplicateInfo, PreviewResponse } from '../preview/route';

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

    // Parse JSON body
    const body = await request.json();
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
        processedFileDuplicates.add(key);
        
        players.forEach(p => duplicatePlayerIds.add(p.playerId));
        
        const nationalities = new Set(players.map(p => p.nationality?.toLowerCase()));
        const isSamePlayer = nationalities.size === 1 || 
                            (nationalities.size === 2 && (nationalities.has('') || nationalities.has(null as any)));
        
        const representative = players[0];
        duplicates.push({
          playerId: representative.playerId,
          playerName: representative.playerName,
          position: representative.position,
          existingCount: players.length - 1,
          existingPlayers: [],
          reason: isSamePlayer 
            ? `Found ${players.length} entries for this player (same name, position, and nationality)`
            : `Found ${players.length} players with same name and position (different nationalities - may be different people)`,
          duplicateType: 'file-vs-file',
          allFileInstances: players
        });
      }
    }

    // Analyze each player from database
    for (const dbPlayer of dbPlayers) {
      const existing = existingByName.get(dbPlayer.playerName.toLowerCase());

      // Skip if this is a duplicate instance (not the representative)
      if (duplicatePlayerIds.has(dbPlayer.playerId)) {
        const key = `${dbPlayer.playerName.toLowerCase()}|${dbPlayer.position}`;
        const group = filePlayersByNamePos.get(key);
        if (group && group[0].playerId !== dbPlayer.playerId) {
          continue;
        }
      }

      if (!existing) {
        if (!duplicatePlayerIds.has(dbPlayer.playerId)) {
          newPlayers.push(dbPlayer);
        }
        
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
        const existingStats = existing.seasonalPlayerStats[0];

        if (!existingStats) {
          if (!duplicatePlayerIds.has(dbPlayer.playerId)) {
            newPlayers.push(dbPlayer);
          }
        } else {
          const changedFields: string[] = [];

          if (existingStats.position !== dbPlayer.position) changedFields.push('position');
          if (existingStats.realWorldClub !== dbPlayer.teamName) changedFields.push('teamName');
          if (existingStats.overallRating !== dbPlayer.overallRating) changedFields.push('overallRating');
          if (existingStats.nationality !== dbPlayer.nationality) changedFields.push('nationality');
          if (existingStats.playing_style !== dbPlayer.playingStyle) changedFields.push('playingStyle');
          
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
