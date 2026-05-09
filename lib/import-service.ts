/**
 * Season data import service for Turf Cats platform
 * Handles importing player data from .db files with diff logic
 */

import { prisma } from './prisma';
import { parseDBFile, DBPlayerRecord } from './db-parser';
import { generatePlayerId, generatePlayerStatsId } from './id-generator';

export interface ImportSummary {
  newPlayers: number;
  updatedStats: number;
  unchangedPlayers: number;
  errors: string[];
}

/**
 * Imports season data from a .db file
 * - Creates Base_Player records for new players
 * - Creates Seasonal_Player_Stats only for changed attributes
 * - Compares with previous season to avoid duplicate entries
 * 
 * @param fileContent - Raw .db file content
 * @param seasonId - Target season ID
 * @returns Import summary with counts and errors
 */
export async function importSeasonData(
  fileContent: string,
  seasonId: string
): Promise<ImportSummary> {
  const summary: ImportSummary = {
    newPlayers: 0,
    updatedStats: 0,
    unchangedPlayers: 0,
    errors: []
  };

  // Parse the file
  const parseResult = parseDBFile(fileContent);
  
  if (!parseResult.success || !parseResult.players) {
    summary.errors.push(parseResult.error || 'Parse failed');
    return summary;
  }

  // Verify season exists
  const season = await prisma.seasons.findUnique({
    where: { id: seasonId }
  });

  if (!season) {
    summary.errors.push(`Season with ID ${seasonId} not found`);
    return summary;
  }

  // Get all seasons ordered by creation date to find previous season
  const allSeasons = await prisma.seasons.findMany({
    orderBy: { createdAt: 'asc' }
  });

  const currentSeasonIndex = allSeasons.findIndex(s => s.id === seasonId);
  const previousSeason = currentSeasonIndex > 0 ? allSeasons[currentSeasonIndex - 1] : null;

  // Get previous season's stats for comparison (if exists)
  const previousStatsMap = new Map<string, {
    position: string;
    club: string;
    rating: number;
    starRating?: number;
  }>();

  if (previousSeason) {
    const previousStats = await prisma.seasonal_player_stats.findMany({
      where: { seasonId: previousSeason.id },
      include: { basePlayer: true }
    });

    for (const stat of previousStats) {
      previousStatsMap.set(stat.basePlayer.name, {
        position: stat.position,
        club: stat.realWorldClub,
        rating: stat.overallRating,
        starRating: stat.star_rating || undefined
      });
    }
  }

  // Process each player record
  for (const record of parseResult.players) {
    try {
      // Find or create base player
      let basePlayer = await prisma.base_players.findFirst({
        where: { name: record.name }
      });

      if (!basePlayer) {
        // Create new base player
        const playerId = await generatePlayerId()
        basePlayer = await prisma.base_players.create({
          data: {
            id: playerId,
            name: record.name,
            photoUrl: record.photoUrl || '/default-player.png',
            updatedAt: new Date()
          }
        });
        summary.newPlayers++;
      }

      // Check if stats changed from previous season
      const prevStats = previousStatsMap.get(record.name);
      const statsChanged = !prevStats ||
        prevStats.position !== record.position ||
        prevStats.club !== record.club ||
        prevStats.rating !== record.rating ||
        prevStats.starRating !== record.starRating;

      if (statsChanged) {
        // Check if seasonal stats already exist for this player in this season
        const existingStats = await prisma.seasonal_player_stats.findUnique({
          where: {
            basePlayerId_seasonId: {
              basePlayerId: basePlayer.id,
              seasonId: seasonId
            }
          }
        });

        if (existingStats) {
          // Update existing stats
          await prisma.seasonal_player_stats.update({
            where: { id: existingStats.id },
            data: {
              position: record.position,
              realWorldClub: record.club,
              overallRating: record.rating,
              star_rating: record.starRating
            }
          });
          summary.updatedStats++;
        } else {
          // Create new seasonal stats
          const statsId = await generatePlayerStatsId()
          await prisma.seasonal_player_stats.create({
            data: {
              id: statsId,
              basePlayerId: basePlayer.id,
              seasonId: seasonId,
              position: record.position,
              realWorldClub: record.club,
              overallRating: record.rating,
              star_rating: record.starRating,
              updatedAt: new Date()
            }
          });
          summary.updatedStats++;
        }
      } else {
        // Stats unchanged from previous season
        summary.unchangedPlayers++;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      summary.errors.push(`Failed to import player ${record.name}: ${errorMessage}`);
    }
  }

  return summary;
}
