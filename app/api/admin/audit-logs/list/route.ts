import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'SUB_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const seasonId = searchParams.get('seasonId');
    const teamId = searchParams.get('teamId');
    const logType = searchParams.get('logType') || 'all';

    if (!seasonId) {
      return NextResponse.json({ error: 'Season ID is required' }, { status: 400 });
    }

    const result: {
      auditLogs: any[];
      bidAuditLogs: any[];
      financialLedger: any[];
    } = {
      auditLogs: [],
      bidAuditLogs: [],
      financialLedger: []
    };

    // Fetch general audit logs
    if (logType === 'all' || logType === 'audit_logs') {
      const auditLogsQuery: any = {
        where: {
          seasonId: seasonId
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 500 // Limit to last 500 logs
      };

      // If teamId is provided, filter by team
      if (teamId) {
        // Get season team ID
        const seasonTeam = await prisma.season_teams.findFirst({
          where: {
            seasonId,
            teamId
          },
          select: { id: true }
        });

        if (seasonTeam) {
          auditLogsQuery.where.entityId = seasonTeam.id;
        }
      }

      result.auditLogs = await prisma.audit_logs.findMany(auditLogsQuery);
    }

    // Fetch bid audit logs
    if (logType === 'all' || logType === 'bid_audit_log') {
      const bidAuditLogsQuery: any = {
        where: {
          round: {
            seasonId
          }
        },
        include: {
          round: {
            select: {
              roundNumber: true,
              roundType: true
            }
          }
        },
        orderBy: {
          timestamp: 'desc'
        },
        take: 500 // Limit to last 500 logs
      };

      // If teamId is provided, filter by team
      if (teamId) {
        bidAuditLogsQuery.where.teamId = teamId;
      }

      result.bidAuditLogs = await prisma.bid_audit_log.findMany(bidAuditLogsQuery);
    }

    // Fetch financial ledger
    const financialLedgerQuery: any = {
      where: {
        seasonId
      },
      include: {
        seasonTeam: {
          include: {
            team: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 500 // Limit to last 500 logs
    };

    // If teamId is provided, filter by team
    if (teamId) {
      const seasonTeam = await prisma.season_teams.findFirst({
        where: {
          seasonId,
          teamId
        },
        select: { id: true }
      });

      if (seasonTeam) {
        financialLedgerQuery.where.seasonTeamId = seasonTeam.id;
      }
    }

    result.financialLedger = await prisma.financial_ledger.findMany(financialLedgerQuery);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}
