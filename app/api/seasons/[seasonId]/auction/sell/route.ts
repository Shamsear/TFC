import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { createAuditLog } from '@/lib/audit'
import { generateTransferId, generateFinancialId } from '@/lib/id-generator'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ seasonId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { seasonId } = await params
    const body = await request.json()
    const { playerId, teamId, soldPrice } = body

    if (!playerId || !teamId || !soldPrice) {
      return NextResponse.json(
        { error: 'Player ID, team ID, and sold price are required' },
        { status: 400 }
      )
    }

    // Check if player already sold
    const existingTransfer = await prisma.transfer_history.findFirst({
      where: {
        basePlayerId: playerId,
        seasonId
      }
    })

    if (existingTransfer) {
      return NextResponse.json(
        { error: 'Player already sold' },
        { status: 400 }
      )
    }

    // Get season team
    const seasonTeam = await prisma.season_teams.findUnique({
      where: {
        seasonId_teamId: {
          seasonId,
          teamId
        }
      },
      include: {
        team: true
      }
    })

    if (!seasonTeam) {
      return NextResponse.json(
        { error: 'Team not found in this season' },
        { status: 404 }
      )
    }

    // Check if team has enough budget
    if (seasonTeam.currentBudget < soldPrice) {
      return NextResponse.json(
        { error: 'Insufficient budget' },
        { status: 400 }
      )
    }

    // Get player details for audit
    const player = await prisma.base_players.findUnique({
      where: { id: playerId }
    })

    const transferId = await generateTransferId()

    // Create transfer and update budget in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create transfer history
      await tx.transfer_history.create({
        data: {
          id: transferId,
          basePlayerId: playerId,
          seasonId,
          teamId,
          soldPrice
        }
      })

      // Update team budget
      const newBudget = seasonTeam.currentBudget - soldPrice
      await tx.season_teams.update({
        where: {
          id: seasonTeam.id
        },
        data: {
          currentBudget: newBudget,
          updatedAt: new Date()
        }
      })

      // Create financial ledger entry
      const ledgerId = await generateFinancialId()
      await tx.financial_ledger.create({
        data: {
          id: ledgerId,
          seasonTeamId: seasonTeam.id,
          seasonId,
          transactionType: 'PLAYER_PURCHASE',
          amount: soldPrice,
          previousBalance: seasonTeam.currentBudget,
          newBalance: newBudget,
          description: `Player purchase: ${player?.name || playerId}`,
          playerName: player?.name || null
        }
      })

      return await tx.transfer_history.findUnique({
        where: { id: transferId },
        include: {
          basePlayer: true,
          team: true
        }
      })
    })

    // Create audit log
    await createAuditLog({
      userId: session.user.id,
      userEmail: session.user.email!,
      userRole: session.user.role!,
      action: 'SELL_PLAYER',
      entityType: 'transfer_history',
      entityId: transferId,
      entityName: player?.name || playerId,
      seasonId,
      details: {
        playerId,
        playerName: player?.name,
        teamId,
        teamName: seasonTeam.team.name,
        soldPrice,
        previousBudget: seasonTeam.currentBudget,
        newBudget: seasonTeam.currentBudget - soldPrice
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Error selling player:', error)
    return NextResponse.json(
      { error: 'Failed to sell player' },
      { status: 500 }
    )
  }
}
