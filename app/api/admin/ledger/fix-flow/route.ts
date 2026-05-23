import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'SUB_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { seasonId, mode = 'preview' } = await request.json();

    if (!seasonId) {
      return NextResponse.json({ error: 'Season ID is required' }, { status: 400 });
    }

    // Get all teams in the season
    const teams = await prisma.season_teams.findMany({
      where: { seasonId },
      include: {
        team: { select: { name: true } }
      },
      orderBy: { team: { name: 'asc' } }
    });

    const results = [];

    for (const team of teams) {
      // Get all ledger entries for this team, ordered by creation
      const ledgerEntries = await prisma.financial_ledger.findMany({
        where: { seasonTeamId: team.id },
        orderBy: { createdAt: 'asc' }
      });

      if (ledgerEntries.length === 0) {
        results.push({
          teamName: team.team.name,
          status: 'no_entries',
          message: 'No ledger entries found'
        });
        continue;
      }

      let runningBalance = 0;
      const updates = [];
      let hasErrors = false;

      for (let i = 0; i < ledgerEntries.length; i++) {
        const entry = ledgerEntries[i];
        const expectedPrevious = runningBalance;
        const expectedNew = runningBalance + entry.amount;

        if (entry.previousBalance !== expectedPrevious || entry.newBalance !== expectedNew) {
          hasErrors = true;
          updates.push({
            id: entry.id,
            description: entry.description,
            amount: entry.amount,
            current: {
              previousBalance: entry.previousBalance,
              newBalance: entry.newBalance
            },
            expected: {
              previousBalance: expectedPrevious,
              newBalance: expectedNew
            }
          });

          if (mode === 'apply') {
            await prisma.financial_ledger.update({
              where: { id: entry.id },
              data: {
                previousBalance: expectedPrevious,
                newBalance: expectedNew
              }
            });
          }
        }

        runningBalance = expectedNew;
      }

      // Update team's current budget if in apply mode
      if (mode === 'apply' && hasErrors) {
        await prisma.season_teams.update({
          where: { id: team.id },
          data: { currentBudget: runningBalance }
        });
      }

      results.push({
        teamName: team.team.name,
        status: hasErrors ? 'needs_fix' : 'correct',
        entriesChecked: ledgerEntries.length,
        entriesFixed: updates.length,
        finalBalance: runningBalance,
        currentBudget: team.currentBudget,
        updates: mode === 'preview' ? updates : undefined
      });
    }

    const summary = {
      mode,
      teamsProcessed: teams.length,
      teamsNeedingFix: results.filter(r => r.status === 'needs_fix').length,
      teamsFixed: mode === 'apply' ? results.filter(r => r.status === 'needs_fix').length : 0
    };

    return NextResponse.json({ results, summary });
  } catch (error) {
    console.error('Error fixing ledger flow:', error);
    return NextResponse.json(
      { error: 'Failed to fix ledger flow' },
      { status: 500 }
    );
  }
}
