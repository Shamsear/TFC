import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'SUB_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { seasonId, teamId, logType } = await request.json();

    if (!seasonId) {
      return NextResponse.json({ error: 'Season ID required' }, { status: 400 });
    }

    let deletedCount = 0;

    // Delete audit_logs
    if (logType === 'all' || logType === 'audit_logs') {
      const where: any = { seasonId };
      
      // If teamId provided, filter by team manager's userId
      if (teamId) {
        const teamManager = await prisma.users.findFirst({
          where: { teamId, role: 'TEAM_MANAGER' }
        });
        
        if (teamManager) {
          where.userId = teamManager.id;
        }
      }

      const result = await prisma.audit_logs.deleteMany({ where });
      deletedCount += result.count;
    }

    // Delete bid_audit_log
    if (logType === 'all' || logType === 'bid_audit_log') {
      const where: any = {
        round: { seasonId }
      };
      
      if (teamId) {
        where.teamId = teamId;
      }

      const result = await prisma.bid_audit_log.deleteMany({ where });
      deletedCount += result.count;
    }

    // Delete financial_ledger
    if (logType === 'all' || logType === 'financial_ledger') {
      const where: any = { seasonId };
      
      if (teamId) {
        const seasonTeam = await prisma.season_teams.findFirst({
          where: { seasonId, teamId },
          select: { id: true }
        });
        
        if (seasonTeam) {
          where.seasonTeamId = seasonTeam.id;
        }
      }

      const result = await prisma.financial_ledger.deleteMany({ where });
      deletedCount += result.count;
    }

    return NextResponse.json({
      success: true,
      deletedCount,
      message: `Successfully deleted ${deletedCount} audit log entries`
    });
  } catch (error) {
    console.error('Delete audit logs error:', error);
    return NextResponse.json(
      { error: 'Failed to delete audit logs' },
      { status: 500 }
    );
  }
}
