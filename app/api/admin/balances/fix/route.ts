import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateFinancialId } from '@/lib/id-generator';
import { auth } from '@/lib/auth';

/**
 * Fix team balance discrepancies
 * POST /api/admin/balances/fix
 * Body: { seasonId, teamId, correctBalance, reason }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized - Super Admin only' }, { status: 401 });
    }

    const body = await request.json();
    const { seasonId, teamId, correctBalance, reason } = body;

    if (!seasonId || !teamId || correctBalance === undefined) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Get season team
      const seasonTeam = await tx.season_teams.findUnique({
        where: {
          seasonId_teamId: { seasonId, teamId }
        },
        include: {
          team: {
            select: {
              name: true
            }
          }
        }
      });

      if (!seasonTeam) {
        throw new Error('Season team not found');
      }

      const oldBalance = seasonTeam.currentBudget;
      const adjustment = correctBalance - oldBalance;

      if (adjustment === 0) {
        return {
          message: 'No adjustment needed',
          teamName: seasonTeam.team.name,
          balance: oldBalance
        };
      }

      // Update balance
      await tx.season_teams.update({
        where: { id: seasonTeam.id },
        data: { currentBudget: correctBalance }
      });

      // Create adjustment ledger entry
      const ledgerId = await generateFinancialId();
      await tx.financial_ledger.create({
        data: {
          id: ledgerId,
          seasonTeamId: seasonTeam.id,
          seasonId: seasonId,
          transactionType: 'ADJUSTMENT',
          amount: adjustment,
          previousBalance: oldBalance,
          newBalance: correctBalance,
          description: reason || `Balance correction: ${adjustment > 0 ? '+' : ''}£${adjustment}`,
          playerName: null
        }
      });

      return {
        message: 'Balance fixed successfully',
        teamName: seasonTeam.team.name,
        oldBalance,
        newBalance: correctBalance,
        adjustment
      };
    });

    return NextResponse.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Balance fix error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fix balance' },
      { status: 500 }
    );
  }
}
