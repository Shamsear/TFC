import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

/**
 * Audit team balances for a season
 * GET /api/admin/balances/audit?seasonId=TFCS-4
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'SUB_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const seasonId = searchParams.get('seasonId');

    if (!seasonId) {
      return NextResponse.json({ error: 'Season ID required' }, { status: 400 });
    }

    // Get season info including starting purse
    const season = await prisma.seasons.findUnique({
      where: { id: seasonId },
      select: {
        id: true,
        name: true,
        startingPurse: true
      }
    });

    if (!season) {
      return NextResponse.json({ error: 'Season not found' }, { status: 404 });
    }

    // Get all teams in the season
    const seasonTeams = await prisma.season_teams.findMany({
      where: {
        seasonId: seasonId
      },
      include: {
        team: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        team: {
          name: 'asc'
        }
      }
    });

    const audits = [];

    for (const seasonTeam of seasonTeams) {
      // Get all financial ledger entries in chronological order
      const ledgerEntries = await prisma.financial_ledger.findMany({
        where: {
          seasonId: seasonId,
          seasonTeamId: seasonTeam.id
        },
        orderBy: {
          createdAt: 'asc'
        },
        select: {
          transactionType: true,
          amount: true,
          newBalance: true
        }
      });

      if (ledgerEntries.length === 0) {
        // No ledger entries - team hasn't been initialized
        audits.push({
          teamId: seasonTeam.teamId,
          teamName: seasonTeam.team.name,
          currentBalance: seasonTeam.currentBudget,
          initialPurse: season.startingPurse,
          totalSpent: 0,
          totalSales: 0,
          totalAdjustments: 0,
          calculatedBalance: 0,
          difference: seasonTeam.currentBudget,
          hasError: seasonTeam.currentBudget !== 0,
          transferCount: 0,
          ledgerEntryCount: 0
        });
        continue;
      }

      // Get the last ledger entry - this should match currentBudget
      const lastLedgerEntry = ledgerEntries[ledgerEntries.length - 1];
      const expectedBalance = lastLedgerEntry.newBalance;

      // Calculate summary stats using season's starting purse
      const initialPurse = season.startingPurse;
      const totalSpent = ledgerEntries
        .filter(e => e.transactionType === 'PLAYER_PURCHASE')
        .reduce((sum, e) => sum + Math.abs(e.amount), 0);
      const totalSales = ledgerEntries
        .filter(e => e.transactionType === 'PLAYER_SALE')
        .reduce((sum, e) => sum + e.amount, 0);
      const totalAdjustments = ledgerEntries
        .filter(e => e.transactionType === 'ADJUSTMENT')
        .reduce((sum, e) => sum + e.amount, 0);

      // Get transfer count
      const transfers = await prisma.transfer_history.findMany({
        where: {
          seasonId: seasonId,
          teamId: seasonTeam.teamId
        }
      });

      const difference = seasonTeam.currentBudget - expectedBalance;
      const hasError = Math.abs(difference) > 0.01; // Allow for tiny floating point differences

      audits.push({
        teamId: seasonTeam.teamId,
        teamName: seasonTeam.team.name,
        currentBalance: seasonTeam.currentBudget,
        initialPurse,
        totalSpent,
        totalSales,
        totalAdjustments,
        calculatedBalance: expectedBalance,
        difference,
        hasError,
        transferCount: transfers.length,
        ledgerEntryCount: ledgerEntries.length
      });
    }

    // Separate teams with and without errors
    const teamsWithErrors = audits.filter(a => a.hasError);
    const teamsWithoutErrors = audits.filter(a => !a.hasError);

    return NextResponse.json({
      success: true,
      seasonId,
      totalTeams: audits.length,
      teamsWithErrors: teamsWithErrors.length,
      teamsWithoutErrors: teamsWithoutErrors.length,
      totalDiscrepancy: teamsWithErrors.reduce((sum, a) => sum + Math.abs(a.difference), 0),
      audits: {
        errors: teamsWithErrors,
        correct: teamsWithoutErrors
      }
    });
  } catch (error) {
    console.error('Balance audit error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to audit balances' },
      { status: 500 }
    );
  }
}
