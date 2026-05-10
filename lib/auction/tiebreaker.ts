import { prisma } from '@/lib/prisma';

/**
 * Tiebreaker creation and resolution logic
 */

export interface TiebreakerInfo {
  id: string;
  roundId: string;
  basePlayerId: string;
  playerName: string;
  originalAmount: number;
  tiedTeams: string[];
}

/**
 * Create tiebreakers for tied bids
 */
export async function createTiebreakers(
  roundId: string,
  ties: Array<{
    basePlayerId: string;
    playerName: string;
    amount: number;
    tiedTeams: string[];
  }>
): Promise<TiebreakerInfo[]> {
  const createdTiebreakers: TiebreakerInfo[] = [];

  for (const tie of ties) {
    const tiebreakerId = `SSPSLTB${Date.now()}${Math.random().toString(36).substr(2, 9)}`;

    // Create tiebreaker
    await prisma.tiebreakers.create({
      data: {
        id: tiebreakerId,
        roundId,
        basePlayerId: tie.basePlayerId,
        originalAmount: tie.amount,
        tiedTeamsCount: tie.tiedTeams.length,
        status: 'active'
      }
    });

    // Create team tiebreaker bid entries
    for (const teamId of tie.tiedTeams) {
      await prisma.team_tiebreaker_bids.create({
        data: {
          id: `${tiebreakerId}_${teamId}`,
          tiebreakerId,
          teamId,
          oldBidAmount: tie.amount,
          submitted: false
        }
      });
    }

    createdTiebreakers.push({
      id: tiebreakerId,
      roundId,
      basePlayerId: tie.basePlayerId,
      playerName: tie.playerName,
      originalAmount: tie.amount,
      tiedTeams: tie.tiedTeams
    });
  }

  return createdTiebreakers;
}

/**
 * Check if all teams have submitted tiebreaker bids
 */
export async function checkTiebreakerComplete(tiebreakerId: string): Promise<boolean> {
  const bids = await prisma.team_tiebreaker_bids.findMany({
    where: { tiebreakerId },
    select: { submitted: true }
  });

  return bids.every(bid => bid.submitted);
}

/**
 * Resolve a tiebreaker
 */
export async function resolveTiebreaker(tiebreakerId: string): Promise<{
  success: boolean;
  winnerId?: string;
  winningBid?: number;
  error?: string;
}> {
  try {
    // Get tiebreaker details
    const tiebreaker = await prisma.tiebreakers.findUnique({
      where: { id: tiebreakerId },
      select: {
        status: true,
        basePlayerId: true,
        roundId: true,
        round: {
          select: { seasonId: true }
        }
      }
    });

    if (!tiebreaker) {
      return { success: false, error: 'Tiebreaker not found' };
    }

    if (tiebreaker.status !== 'active') {
      return { success: false, error: 'Tiebreaker already resolved' };
    }

    // Get all submitted bids
    const bids = await prisma.team_tiebreaker_bids.findMany({
      where: {
        tiebreakerId,
        submitted: true
      },
      select: {
        teamId: true,
        newBidAmount: true
      }
    });

    if (bids.length === 0) {
      return { success: false, error: 'No bids submitted' };
    }

    // Find highest bid
    const validBids = bids.filter(b => b.newBidAmount !== null);
    if (validBids.length === 0) {
      return { success: false, error: 'No valid bids' };
    }

    const sorted = validBids.sort((a, b) => b.newBidAmount! - a.newBidAmount!);

    // Check for another tie
    if (sorted.length > 1 && sorted[0].newBidAmount === sorted[1].newBidAmount) {
      return { success: false, error: 'Another tie detected - manual resolution required' };
    }

    const winner = sorted[0];

    // Update tiebreaker
    await prisma.tiebreakers.update({
      where: { id: tiebreakerId },
      data: {
        status: 'resolved',
        winningTeamId: winner.teamId,
        winningBid: winner.newBidAmount!
      }
    });

    return {
      success: true,
      winnerId: winner.teamId,
      winningBid: winner.newBidAmount!
    };
  } catch (error) {
    console.error('Tiebreaker resolution error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Apply tiebreaker result to database
 */
export async function applyTiebreakerResult(
  tiebreakerId: string,
  winnerId: string,
  winningBid: number
): Promise<void> {
  const tiebreaker = await prisma.tiebreakers.findUnique({
    where: { id: tiebreakerId },
    select: {
      basePlayerId: true,
      roundId: true,
      round: {
        select: { seasonId: true }
      }
    }
  });

  if (!tiebreaker) {
    throw new Error('Tiebreaker not found');
  }

  await prisma.$transaction(async (tx) => {
    // 1. Create transfer history
    await tx.transfer_history.create({
      data: {
        id: `SSPSLTH${Date.now()}${Math.random().toString(36).substr(2, 9)}`,
        basePlayerId: tiebreaker.basePlayerId,
        seasonId: tiebreaker.round.seasonId,
        teamId: winnerId,
        soldPrice: winningBid
      }
    });

    // 2. Update team budget
    const seasonTeam = await tx.season_teams.findUnique({
      where: {
        seasonId_teamId: {
          seasonId: tiebreaker.round.seasonId,
          teamId: winnerId
        }
      }
    });

    if (seasonTeam) {
      const newBudget = seasonTeam.currentBudget - winningBid;

      await tx.season_teams.update({
        where: {
          seasonId_teamId: {
            seasonId: tiebreaker.round.seasonId,
            teamId: winnerId
          }
        },
        data: { currentBudget: newBudget }
      });

      // 3. Insert financial ledger entry
      await tx.financial_ledger.create({
        data: {
          id: `SSPSLFL${Date.now()}${Math.random().toString(36).substr(2, 9)}`,
          seasonTeamId: seasonTeam.id,
          seasonId: tiebreaker.round.seasonId,
          transactionType: 'PLAYER_PURCHASE',
          amount: -winningBid,
          previousBalance: seasonTeam.currentBudget,
          newBalance: newBudget,
          description: `Tiebreaker ${tiebreakerId} - Player purchase`
        }
      });
    }
  });
}

/**
 * Get active tiebreakers for a round
 */
export async function getActiveTiebreakers(roundId: string): Promise<TiebreakerInfo[]> {
  const tiebreakers = await prisma.tiebreakers.findMany({
    where: {
      roundId,
      status: 'active'
    },
    select: {
      id: true,
      roundId: true,
      basePlayerId: true,
      originalAmount: true,
      tiedTeamsCount: true,
      basePlayer: {
        select: { name: true }
      },
      teamTiebreakerBids: {
        select: { teamId: true }
      }
    }
  });

  return tiebreakers.map(tb => ({
    id: tb.id,
    roundId: tb.roundId,
    basePlayerId: tb.basePlayerId,
    playerName: tb.basePlayer.name,
    originalAmount: tb.originalAmount,
    tiedTeams: tb.teamTiebreakerBids.map(b => b.teamId)
  }));
}

/**
 * Check if round has any active tiebreakers
 */
export async function hasActiveTiebreakers(roundId: string): Promise<boolean> {
  const count = await prisma.tiebreakers.count({
    where: {
      roundId,
      status: 'active'
    }
  });

  return count > 0;
}

/**
 * Resolve all tiebreakers for a round
 */
export async function resolveAllTiebreakers(roundId: string): Promise<{
  success: boolean;
  resolved: number;
  failed: number;
  errors: string[];
}> {
  const tiebreakers = await getActiveTiebreakers(roundId);
  let resolved = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const tb of tiebreakers) {
    const result = await resolveTiebreaker(tb.id);
    
    if (result.success && result.winnerId && result.winningBid) {
      await applyTiebreakerResult(tb.id, result.winnerId, result.winningBid);
      resolved++;
    } else {
      failed++;
      errors.push(`${tb.playerName}: ${result.error}`);
    }
  }

  return {
    success: failed === 0,
    resolved,
    failed,
    errors
  };
}
