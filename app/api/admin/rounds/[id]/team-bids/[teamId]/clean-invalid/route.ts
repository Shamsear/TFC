import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { decryptBids, encryptBids } from '@/lib/auction/encryption'

/**
 * POST /api/admin/rounds/[id]/team-bids/[teamId]/clean-invalid - Remove invalid player bids
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; teamId: string }> }
) {
  try {
    const { id: roundId, teamId } = await params
    
    // Check authentication
    const session = await auth()
    if (!session || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'SUB_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get round details
    const round = await prisma.rounds.findUnique({
      where: { id: roundId },
      select: {
        id: true,
        roundType: true,
        status: true
      }
    })

    if (!round) {
      return NextResponse.json({ error: 'Round not found' }, { status: 404 })
    }

    // Only allow cleaning for active or draft rounds
    if (!['active', 'draft'].includes(round.status)) {
      return NextResponse.json(
        { error: `Cannot clean bids for round with status: ${round.status}` },
        { status: 400 }
      )
    }

    // Handle based on round type
    if (round.roundType === 'bulk') {
      // Get bulk selection
      const selection = await prisma.bulk_round_selections.findUnique({
        where: {
          roundId_teamId: {
            roundId,
            teamId
          }
        }
      })

      if (!selection) {
        return NextResponse.json(
          { error: 'No selection found for this team' },
          { status: 404 }
        )
      }

      // Parse selected players
      const parsed = JSON.parse(selection.selectedPlayers || '{}')
      const players = parsed.players || []

      if (players.length === 0) {
        return NextResponse.json(
          { error: 'No players in selection' },
          { status: 404 }
        )
      }

      // Get all player IDs
      const playerIds = players.map((p: any) => p.basePlayerId)

      // Check which players exist
      const existingPlayers = await prisma.base_players.findMany({
        where: { id: { in: playerIds } },
        select: { id: true }
      })
      const existingPlayerIds = new Set(existingPlayers.map(p => p.id))

      // Filter out invalid players
      const validPlayers = players.filter((p: any) => existingPlayerIds.has(p.basePlayerId))
      const removedCount = players.length - validPlayers.length

      if (removedCount === 0) {
        return NextResponse.json({
          success: true,
          message: 'No invalid players found',
          removedCount: 0,
          remainingCount: validPlayers.length
        })
      }

      // Update selection with only valid players
      const updatedSelection = {
        ...parsed,
        players: validPlayers
      }

      await prisma.bulk_round_selections.update({
        where: {
          roundId_teamId: {
            roundId,
            teamId
          }
        },
        data: {
          selectedPlayers: JSON.stringify(updatedSelection),
          submitted: false // Reset submission status so they can review and resubmit
        }
      })

      return NextResponse.json({
        success: true,
        message: `Removed ${removedCount} invalid player(s). Team can now review and resubmit.`,
        removedCount,
        remainingCount: validPlayers.length
      })
    } else {
      // Normal round - get encrypted bids
      const teamBids = await prisma.team_round_bids.findUnique({
        where: {
          roundId_teamId: {
            roundId,
            teamId
          }
        }
      })

      if (!teamBids) {
        return NextResponse.json(
          { error: 'No bids found for this team' },
          { status: 404 }
        )
      }

      // Decrypt bids
      const decrypted = decryptBids(teamBids.encryptedBids)
      const parsed = JSON.parse(decrypted)
      const bids = parsed.bids || []

      if (bids.length === 0) {
        return NextResponse.json(
          { error: 'No bids found' },
          { status: 404 }
        )
      }

      // Get all player IDs
      const playerIds = bids.map((b: any) => b.base_player_id)

      // Check which players exist
      const existingPlayers = await prisma.base_players.findMany({
        where: { id: { in: playerIds } },
        select: { id: true }
      })
      const existingPlayerIds = new Set(existingPlayers.map(p => p.id))

      // Filter out invalid bids
      const validBids = bids.filter((b: any) => existingPlayerIds.has(b.base_player_id))
      const removedCount = bids.length - validBids.length

      if (removedCount === 0) {
        return NextResponse.json({
          success: true,
          message: 'No invalid bids found',
          removedCount: 0,
          remainingCount: validBids.length
        })
      }

      // Update bids with only valid ones
      const updatedBids = {
        ...parsed,
        bids: validBids
      }

      const encrypted = encryptBids(JSON.stringify(updatedBids))

      await prisma.team_round_bids.update({
        where: {
          roundId_teamId: {
            roundId,
            teamId
          }
        },
        data: {
          encryptedBids: encrypted,
          bidCount: validBids.length,
          submitted: false // Reset submission status so they can review and resubmit
        }
      })

      return NextResponse.json({
        success: true,
        message: `Removed ${removedCount} invalid bid(s). Team can now review and resubmit.`,
        removedCount,
        remainingCount: validBids.length
      })
    }
  } catch (error) {
    console.error('Clean invalid bids error:', error)
    return NextResponse.json(
      { error: 'Failed to clean invalid bids' },
      { status: 500 }
    )
  }
}
