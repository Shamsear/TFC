import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { EFootballPlayer } from '@/lib/sqlite-parser';
import { generatePlayerId, generatePlayerStatsId } from '@/lib/id-generator';
import { normalizeString } from '@/lib/search-utils';

export interface ConfirmRequest {
  seasonId: string;
  mode: 'import' | 'update';
  selectedPlayers: EFootballPlayer[];
  duplicateResolutions: Record<string, 'skip' | 'replace' | 'add' | 'add-all' | string>; // Can be playerId for file-vs-file or 'add-all'
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: ConfirmRequest = await request.json();
    const { seasonId, mode, selectedPlayers, duplicateResolutions } = body;

    if (!seasonId || !mode || !selectedPlayers) {
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

    let imported = 0;
    let updated = 0;
    let skipped = 0;
    const errors: Array<{ player: string; error: string }> = [];

    // Process each selected player
    for (const player of selectedPlayers) {
      try {
        // Check duplicate resolution
        const resolution = duplicateResolutions[player.playerId];
        
        // For file-vs-file duplicates, resolution is a playerId or 'add-all'
        // Skip if this player is not the selected one (unless add-all)
        if (resolution && resolution !== 'skip' && resolution !== 'replace' && resolution !== 'add' && resolution !== 'add-all') {
          // This is a file-vs-file duplicate with a specific playerId selected
          if (resolution !== player.playerId) {
            // This player was not selected, skip it
            skipped++;
            continue;
          }
          // This player was selected, proceed with import
        } else if (resolution === 'skip') {
          skipped++;
          continue;
        } else if (resolution === 'add-all') {
          // Add all instances - proceed with import for all
          // No special handling needed, just continue
        }

        // Find or create base player
        let basePlayer = await prisma.base_players.findFirst({
          where: { name: player.playerName }
        });

        // For 'add' or 'add-all' resolution, always create a new base player entry
        if (resolution === 'add' || resolution === 'add-all') {
          // Create new base player with unique ID
          const newPlayerId = await generatePlayerId();
          basePlayer = await prisma.base_players.create({
            data: {
              id: newPlayerId,
              player_id: player.playerId,
              name: player.playerName,
              normalized_name: normalizeString(player.playerName),
              photoUrl: `/players/${player.playerId}.webp`,
              updatedAt: new Date()
            }
          });
          imported++;
        } else if (!basePlayer) {
          // Create new base player
          const newPlayerId = await generatePlayerId();
          basePlayer = await prisma.base_players.create({
            data: {
              id: newPlayerId,
              player_id: player.playerId,
              name: player.playerName,
              normalized_name: normalizeString(player.playerName),
              photoUrl: `/players/${player.playerId}.webp`,
              updatedAt: new Date()
            }
          });
          imported++;
        } else if (resolution === 'replace') {
          // Update base player photo URL
          basePlayer = await prisma.base_players.update({
            where: { id: basePlayer.id },
            data: {
              photoUrl: `/players/${player.playerId}.webp`,
              updatedAt: new Date()
            }
          });
        }

        // Check if seasonal stats exist
        const existingStats = await prisma.seasonal_player_stats.findUnique({
          where: {
            basePlayerId_seasonId: {
              basePlayerId: basePlayer.id,
              seasonId: seasonId
            }
          }
        });

        const statsData = {
          position: player.position,
          realWorldClub: player.teamName,
          overallRating: player.overallRating,
          star_rating: player.starRating || null,
          
          // Player Info
          nationality: player.nationality || null,
          playing_style: player.playingStyle || null,
          
          // Offensive Stats
          offensive_awareness: player.offensiveAwareness || null,
          ball_control: player.ballControl || null,
          dribbling: player.dribbling || null,
          tight_possession: player.tightPossession || null,
          low_pass: player.lowPass || null,
          lofted_pass: player.loftedPass || null,
          finishing: player.finishing || null,
          heading: player.heading || null,
          set_piece_taking: player.setPieceTaking || null,
          curl: player.curl || null,
          
          // Physical Stats
          speed: player.speed || null,
          acceleration: player.acceleration || null,
          kicking_power: player.kickingPower || null,
          jumping: player.jumping || null,
          physical_contact: player.physicalContact || null,
          balance: player.balance || null,
          stamina: player.stamina || null,
          
          // Defensive Stats
          defensive_awareness: player.defensiveAwareness || null,
          tackling: player.tackling || null,
          aggression: player.aggression || null,
          defensive_engagement: player.defensiveEngagement || null,
          
          // Goalkeeper Stats
          gk_awareness: player.gkAwareness || null,
          gk_catching: player.gkCatching || null,
          gk_parrying: player.gkParrying || null,
          gk_reflexes: player.gkReflexes || null,
          gk_reach: player.gkReach || null,
          
          updatedAt: new Date()
        };

        if (existingStats) {
          // Update existing stats
          await prisma.seasonal_player_stats.update({
            where: { id: existingStats.id },
            data: statsData
          });
          updated++;
        } else {
          // Create new seasonal stats
          const statsId = await generatePlayerStatsId();
          await prisma.seasonal_player_stats.create({
            data: {
              id: statsId,
              basePlayerId: basePlayer.id,
              seasonId: seasonId,
              ...statsData
            }
          });
          if (basePlayer.id.startsWith('TFCP-')) {
            // Already counted in imported
          } else {
            imported++;
          }
        }

      } catch (error) {
        console.error(`Error processing player ${player.playerName}:`, error);
        errors.push({
          player: player.playerName,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        // Continue with next player
      }
    }

    return NextResponse.json({
      success: true,
      imported,
      updated,
      skipped,
      total: selectedPlayers.length,
      errors
    });

  } catch (error) {
    console.error('Confirm import error:', error);
    return NextResponse.json(
      { error: 'Failed to import players' },
      { status: 500 }
    );
  }
}
