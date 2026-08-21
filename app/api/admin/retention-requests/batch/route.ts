import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { randomUUID } from 'crypto'

/**
 * POST /api/admin/retention-requests/batch
 * 
 * Batch approve or reject multiple retention requests in one go.
 * Body: { action: 'approve' | 'reject', requestIds: string[], reason?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'SUB_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, requestIds, reason } = body as {
      action: 'approve' | 'reject'
      requestIds: string[]
      reason?: string
    }

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    if (!Array.isArray(requestIds) || requestIds.length === 0) {
      return NextResponse.json({ error: 'No requests selected' }, { status: 400 })
    }

    if (action === 'reject' && (!reason || !reason.trim())) {
      return NextResponse.json({ error: 'Rejection reason required' }, { status: 400 })
    }

    // Fetch all pending requests
    const requests = await prisma.retention_requests.findMany({
      where: {
        id: { in: requestIds },
        status: 'pending',
      },
      include: {
        team: true,
        season: true,
        previousSeason: true,
      },
    })

    if (requests.length === 0) {
      return NextResponse.json({ error: 'No pending requests found' }, { status: 404 })
    }

    const results: { id: string; status: string; error?: string }[] = []

    if (action === 'approve') {
      // Process approvals in a single transaction
      await prisma.$transaction(async (tx) => {
        for (const req of requests) {
          try {
            // Get season team
            const seasonTeam = await tx.season_teams.findUnique({
              where: {
                seasonId_teamId: {
                  seasonId: req.seasonId,
                  teamId: req.teamId,
                },
              },
            })

            if (!seasonTeam) {
              results.push({ id: req.id, status: 'error', error: 'Season team not found' })
              continue
            }

            // Check budget
            if (seasonTeam.currentBudget < req.oldSquadValue) {
              results.push({ id: req.id, status: 'error', error: 'Insufficient budget' })
              continue
            }

            const newBalance = seasonTeam.currentBudget - req.oldSquadValue

            // Deduct budget
            await tx.season_teams.update({
              where: { id: seasonTeam.id },
              data: { currentBudget: newBalance },
            })

            // Create transfer history
            await tx.transfer_history.create({
              data: {
                id: randomUUID(),
                basePlayerId: req.playerId,
                seasonId: req.seasonId,
                teamId: req.teamId,
                soldPrice: req.oldSquadValue,
                acquisitionType: 'retention',
                acquisitionNotes: `Retained from ${req.previousSeason.name} at value £${req.oldSquadValue.toLocaleString()}`,
                status: 'ACTIVE',
                seasonTeamId: seasonTeam.id,
              },
            })

            // Create ledger entry
            await tx.financial_ledger.create({
              data: {
                id: `ledger-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                seasonTeamId: seasonTeam.id,
                seasonId: req.seasonId,
                transactionType: 'PLAYER_PURCHASE',
                amount: -req.oldSquadValue,
                previousBalance: seasonTeam.currentBudget,
                newBalance,
                description: `Player retention: ${req.playerName} from ${req.previousSeason.name}`,
                playerName: req.playerName,
              },
            })

            // Create retention record
            await tx.retentions.create({
              data: {
                id: randomUUID(),
                seasonId: req.seasonId,
                basePlayerId: req.playerId,
                retainedFromSeasonId: req.previousSeasonId,
              },
            })

            // Update request status
            await tx.retention_requests.update({
              where: { id: req.id },
              data: {
                status: 'approved',
                processedAt: new Date(),
                processedBy: session.user.id,
              },
            })

            results.push({ id: req.id, status: 'approved' })
          } catch (err: any) {
            results.push({ id: req.id, status: 'error', error: err.message })
          }
        }
      })
    } else {
      // Batch reject
      await prisma.retention_requests.updateMany({
        where: {
          id: { in: requestIds },
          status: 'pending',
        },
        data: {
          status: 'rejected',
          processedAt: new Date(),
          processedBy: session.user.id,
          rejectionReason: reason,
        },
      })

      for (const id of requestIds) {
        results.push({ id, status: 'rejected' })
      }
    }

    const approved = results.filter(r => r.status === 'approved').length
    const rejected = results.filter(r => r.status === 'rejected').length
    const errors = results.filter(r => r.status === 'error')

    return NextResponse.json({
      success: true,
      approved,
      rejected,
      errors: errors.length > 0 ? errors : undefined,
      message: action === 'approve'
        ? `Approved ${approved} request(s)${errors.length > 0 ? `, ${errors.length} failed` : ''}`
        : `Rejected ${rejected} request(s)`,
    })
  } catch (error) {
    console.error('Batch retention request error:', error)
    return NextResponse.json({ error: 'Failed to process batch request' }, { status: 500 })
  }
}
