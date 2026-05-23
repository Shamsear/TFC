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
      // Get all transfers for this team
      const transfers = await prisma.transfer_history.findMany({
        where: {
          seasonId: seasonId,
          teamId: seasonTeam.teamId
        },
        select: {
          soldPrice: true
        }
      });

      // Get all financial ledger entries
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
          amount: true
        }
      });

      // Calculate totals
      const initialPurse = ledgerEntries.find(e => e.transactionType === 'INITIAL_PURSE')?.amount || 0;
      const totalSpent = transfers.reduce((sum, t) => sum + t.soldPrice, 0);
      
      // Sum adjustments (positive adjustments only, excluding initial purse)
      const totalAdjustments = ledgerEntries
        .filter(e => e.transactionType === 'ADJUSTMENT' && e.amount > 0)
        .reduce((sum, e) => sum + e.amount, 0);

      // Calculate expected balance
      const calculatedBalance = initialPurse - totalSpent + totalAdjustments;
      const difference = seasonTeam.currentBudget - calculatedBalance;
      const hasError = Math.abs(difference) > 0;

      audits.push({
        teamId: seasonTeam.teamId,
        teamName: seasonTeam.team.name,
        currentBalance: seasonTeam.currentBudget,
        initialPurse,
        totalSpent,
        totalAdjustments,
        calculatedBalance,
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
