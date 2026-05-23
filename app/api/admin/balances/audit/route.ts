import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
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
      where: { seasonId },
      include: {
        team: { select: { name: true } }
      },
      orderBy: {
        team: { name: 'asc' }
      }
    });

    const audits = [];

    for (const seasonTeam of seasonTeams) {
      // Get all transfers
      const transfers = await prisma.transfer_history.findMany({
        where: {
          seasonId,
          teamId: seasonTeam.teamId
        },
        select: { soldPrice: true }
      });

      // Get ledger entries
      const ledgerEntries = await prisma.financial_ledger.findMany({
        where: {
          seasonId,
          seasonTeamId: seasonTeam.id
        },
        orderBy: { createdAt: 'asc' },
        select: {
          transactionType: true,
          amount: true
        }
      });

      const initialPurse = ledgerEntries.find(e => e.transactionType === 'INITIAL_PURSE')?.amount || 0;
      const totalSpent = transfers.reduce((sum, t) => sum + t.soldPrice, 0);
      const totalAdjustments = ledgerEntries
        .filter(e => e.transactionType === 'ADJUSTMENT' && e.amount > 0)
        .reduce((sum, e) => sum + e.amount, 0);

      const calculatedBalance = initialPurse - totalSpent + totalAdjustments;
      const difference = seasonTeam.currentBudget - calculatedBalance;

      audits.push({
        teamId: seasonTeam.teamId,
        teamName: seasonTeam.team.name,
        currentBalance: seasonTeam.currentBudget,
        calculatedBalance,
        difference,
        hasError: Math.abs(difference) > 0,
        transferCount: transfers.length,
        totalSpent,
        initialPurse
      });
    }

    return NextResponse.json({ audits });
  } catch (error) {
    console.error('Balance audit error:', error);
    return NextResponse.json(
      { error: 'Failed to audit balances' },
      { status: 500 }
    );
  }
}
