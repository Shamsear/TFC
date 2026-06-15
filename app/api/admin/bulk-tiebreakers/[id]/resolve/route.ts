import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { generateTransferId, generateFinancialId, generateAuditId } from '@/lib/id-generator'
import { sendPushNotificationRaw, getTeamManagerId } from '@/lib/notifications-server'
import { triggerNews } from '@/lib/news/trigger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/bulk-tiebreakers/[id]/resolve
 * Manually resolve a bulk tiebreaker by setting final bids and selecting winner
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'SUB_ADMIN')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const tiebreakerId = parseInt(id)

    if (isNaN(tiebreakerId)) {
      return NextResponse.json({ success: false, error: 'Invalid tiebreaker ID' }, { status: 400 })
    }

    const body = await request.json()
    const { teamBids, winnerId } = body

    // Validate input
    if (!teamBids || typeof teamBids !== 'object') {
      return NextResponse.json({ success: false, error: 'Team bids are required' }, { status: 400 })
    }

    if (!winnerId || typeof winnerId !== 'string') {
      return NextResponse.json({ success: false, error: 'Winner ID is required' }, { status: 400 })
    }

    // Get tiebreaker details
    const tiebreaker = await prisma.bulk_tiebreakers.findUnique({
      where: { id: tiebreakerId },
      include: {
        basePlayer: true,
        round: {
          include: {
            season: true
          }
        },
        participants: {
          include: {
            team: true
          }
        }
      }
    })

    if (!tiebreaker) {
      return NextResponse.json({ success: false, error: 'Tiebreaker not found' }, { status: 404 })
    }

    if (tiebreaker.status === 'completed') {
      return NextResponse.json({ success: false, error: 'Tiebreaker already completed' }, { status: 400 })
    }

    // Validate winner is a participant
    const winnerParticipant = tiebreaker.participants.find(p => p.teamId === winnerId)
    if (!winnerParticipant) {
      return NextResponse.json({ success: false, error: 'Winner must be a participant' }, { status: 400 })
    }

    const winningBid = teamBids[winnerId]
    if (!winningBid || winningBid < tiebreaker.basePrice) {
      return NextResponse.json({ 
        success: false, 
        error: `Winning bid must be at least the base price (£${tiebreaker.basePrice})` 
      }, { status: 400 })
    }

    // Use transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Update all participants with their final bids
      for (const [teamId, bidAmount] of Object.entries(teamBids)) {
        const participant = tiebreaker.participants.find(p => p.teamId === teamId)
        if (participant && typeof bidAmount === 'number' && bidAmount >= tiebreaker.basePrice) {
          await tx.bulk_tiebreaker_participants.update({
            where: { id: participant.id },
            data: {
              currentBid: bidAmount,
              lastBidTime: new Date()
            }
          })

          // Add to bid history
          await tx.bulk_tiebreaker_bid_history.create({
            data: {
              tiebreakerId: tiebreakerId,
              teamId: teamId,
              bidAmount: bidAmount,
              bidTime: new Date()
            }
          })
        }
      }

      // Update tiebreaker status
      await tx.bulk_tiebreakers.update({
        where: { id: tiebreakerId },
        data: {
          status: 'completed',
          currentHighestBid: winningBid,
          currentHighestTeamId: winnerId,
          teamsRemaining: 1
        }
      })

      // Create transfer record
      const transferId = await generateTransferId()
      const transfer = await tx.transfer_history.create({
        data: {
          id: transferId,
          basePlayerId: tiebreaker.basePlayer.id,
          seasonId: tiebreaker.round.seasonId,
          teamId: winnerId,
          soldPrice: winningBid,
          roundId: tiebreaker.roundId,
          status: 'ACTIVE'
        }
      })

      // Get season team for budget update
      const seasonTeam = await tx.season_teams.findUnique({
        where: {
          seasonId_teamId: {
            seasonId: tiebreaker.round.seasonId,
            teamId: winnerId
          }
        }
      })

      if (!seasonTeam) {
        throw new Error('Season team not found')
      }

      const previousBudget = seasonTeam.currentBudget
      const newBudget = seasonTeam.currentBudget - winningBid

      // Update team budget
      await tx.season_teams.update({
        where: {
          seasonId_teamId: {
            seasonId: tiebreaker.round.seasonId,
            teamId: winnerId
          }
        },
        data: { currentBudget: newBudget }
      })

      // Create financial ledger entry
      const financialId = await generateFinancialId()
      await tx.financial_ledger.create({
        data: {
          id: financialId,
          seasonTeamId: seasonTeam.id,
          seasonId: tiebreaker.round.seasonId,
          transactionType: 'PLAYER_PURCHASE',
          amount: -winningBid,
          previousBalance: previousBudget,
          newBalance: newBudget,
          description: `Bulk tiebreaker ${tiebreakerId} - Manual resolution: ${tiebreaker.basePlayer.name}`,
          playerName: tiebreaker.basePlayer.name
        }
      })

      // Create audit log
      const auditId = await generateAuditId()
      await tx.audit_logs.create({
        data: {
          id: auditId,
          userId: session.user.id,
          userEmail: session.user.email || '',
          userRole: session.user.role,
          action: 'BULK_TIEBREAKER_MANUAL_RESOLVE',
          entityType: 'bulk_tiebreaker',
          entityId: tiebreakerId.toString(),
          seasonId: tiebreaker.round.seasonId,
          details: JSON.stringify({
            tiebreakerId,
            playerId: tiebreaker.basePlayer.id,
            playerName: tiebreaker.basePlayer.name,
            winnerId,
            winningBid,
            teamBids,
            resolvedBy: session.user.email
          })
        }
      })

      return { transfer, winnerId, winningBid }
    })

    // Check if this was the last active tiebreaker in the round
    const pendingTiebreakersCount = await prisma.bulk_tiebreakers.count({
      where: {
        roundId: tiebreaker.roundId,
        status: 'active'
      }
    })

    if (pendingTiebreakersCount === 0) {
      console.log(`🎉 All tiebreakers resolved for round ${tiebreaker.roundId}. Marking round as completed.`)
      await prisma.rounds.update({
        where: { id: tiebreaker.roundId },
        data: { status: 'completed' }
      })
    }

    console.log(`✅ Bulk tiebreaker ${tiebreakerId} manually resolved`)
    console.log(`   Winner: ${winnerId}`)
    console.log(`   Winning Bid: £${winningBid}`)

    // Notify winner and losing teams
    try {
      const playerName = tiebreaker.basePlayer.name;
      for (const participant of tiebreaker.participants) {
        const isWinner = participant.teamId === winnerId;
        const managerId = await getTeamManagerId(participant.teamId);
        if (managerId) {
          await sendPushNotificationRaw(managerId,
            isWinner
              ? { title: '🏅 Tiebreaker Won!', body: `You won the tiebreaker for ${playerName} at £${winningBid}. They're in your squad!`, url: '/team/squad' }
              : { title: '😔 Tiebreaker Lost', body: `You missed out on ${playerName} in the tiebreaker. Check your squad.`, url: '/team/auction' },
            'auctionWins'
          ).catch(() => {});
        }
      }
    } catch (notifErr) {
      console.warn('[Push] Bulk tiebreaker resolve notification failed (non-fatal):', notifErr);
    }

    // Trigger news for bulk tiebreaker resolution removed for speed

    return NextResponse.json({
      success: true,
      winnerId: result.winnerId,
      winningBid: result.winningBid,
      transferId: result.transfer.id
    })

  } catch (error) {
    console.error('Error resolving bulk tiebreaker:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to resolve bulk tiebreaker' },
      { status: 500 }
    )
  }
}
