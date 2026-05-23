import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'SUB_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { seasonId, teamId } = body;

    if (!seasonId || !teamId) {
      return NextResponse.json({ error: 'Season ID and Team ID required' }, { status: 400 });
    }

    // Get season team
    const seasonTeam = await prisma.season_teams.findUnique({
      where: {
        seasonId_teamId: { seasonId, teamId }
      },
      include: {
        team: { select: { name: true } }
      }
    });

    if (!seasonTeam) {
      return NextResponse.json({ error: 'Season team not found' }, { status: 404 });
    }

    // Calculate correct balance
    const transfers = await prisma.transfer_history.findMany({
      where: { seasonId, teamId },
      select: { soldPrice: true }
    });

    const ledgerEntries = await prisma.financial_ledger.findMany({
      where: {
        seasonId,
        seasonTeamId: seasonTeam.id
      },
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

    const correctBalance = initialPurse - totalSpent + totalAdjustments;
    const oldBalance = seasonTeam.currentBudget;

    if (oldBalance === correctBalance) {
      return NextResponse.json({
        success: true,
        message: 'Balance is already correct',
        oldBalance,
        newBalance: correctBalance
      });
    }

    // Update balance
    await prisma.season_teams.update({
      where: {
        seasonId_teamId: { seasonId, teamId }
      },
      data: { currentBudget: correctBalance }
    });

    return NextResponse.json({
      success: true,
      message: `Fixed ${seasonTeam.team.name} balance`,
      oldBalance,
      newBalance: correctBalance,
      difference: correctBalance - oldBalance
    });
  } catch (error) {
    console.error('Balance fix error:', error);
    return NextResponse.json(
      { error: 'Failed to fix balance' },
      { status: 500 }
    );
  }
}
