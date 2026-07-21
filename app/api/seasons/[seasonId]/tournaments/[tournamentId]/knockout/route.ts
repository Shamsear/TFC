import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { createAuditLog } from '@/lib/audit'
import { generateIds, ID_PREFIXES } from '@/lib/id-generator'
import { resolveAndPopulateKnockoutBracket, getAutoPairingPlaceholders } from '@/lib/tournament-linking'
import { RoundStatus } from '@prisma/client'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ seasonId: string; tournamentId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { seasonId, tournamentId } = await params
    const body = await request.json()
    const { roundName, legs, teams, autoPair, customPairings, createFullBracket } = body

    if (!roundName || !legs) {
      return NextResponse.json(
        { error: 'Round name and legs are required' },
        { status: 400 }
      )
    }

    if (!createFullBracket && (!teams || teams.length < 2)) {
      return NextResponse.json(
        { error: 'Teams are required for manual selection mode' },
        { status: 400 }
      )
    }

    const tournament = await prisma.tournaments.findUnique({
      where: { id: tournamentId },
      include: { groups: true }
    })

    if (!tournament) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      )
    }

    // Check if round already exists
    const existingRound = await prisma.knockout_rounds.findUnique({
      where: {
        tournamentId_roundName: {
          tournamentId,
          roundName
        }
      }
    })

    if (existingRound) {
      return NextResponse.json(
        { error: 'This knockout round already exists' },
        { status: 400 }
      )
    }

    // Helper functions for round placeholders
    const getPreviousKnockoutRoundName = (currentRoundName: string): string => {
      const flow = ['ROUND_OF_32', 'ROUND_OF_16', 'QUARTER_FINAL', 'SEMI_FINAL', 'FINAL']
      const idx = flow.indexOf(currentRoundName)
      if (idx > 0) {
        return flow[idx - 1]
      }
      return ''
    }

    const getRoundDisplayLabel = (name: string): string => {
      const labels: Record<string, string> = {
        'ROUND_OF_32': 'Round of 32',
        'ROUND_OF_16': 'Round of 16',
        'QUARTER_FINAL': 'Quarter Final',
        'SEMI_FINAL': 'Semi Final',
        'THIRD_PLACE': 'Third Place',
        'FINAL': 'Final'
      }
      return labels[name] || name.replace(/_/g, ' ')
    }

    // Determine round order
    const roundOrderMap: Record<string, number> = {
      'ROUND_OF_32': 0,
      'ROUND_OF_16': 1,
      'QUARTER_FINAL': 2,
      'SEMI_FINAL': 3,
      'THIRD_PLACE': 4,
      'FINAL': 5
    }
    const roundOrder = roundOrderMap[roundName] || 0

    const roundPairingsCountMap: Record<string, number> = {
      'ROUND_OF_32': 16,
      'ROUND_OF_16': 8,
      'QUARTER_FINAL': 4,
      'SEMI_FINAL': 2,
      'THIRD_PLACE': 1,
      'FINAL': 1
    }
    const primaryPairingsCount = roundPairingsCountMap[roundName] || 1

    // Fetch all existing rounds in tournament to avoid duplicates
    const existingRoundsInDb = await prisma.knockout_rounds.findMany({
      where: { tournamentId }
    })
    const existingRoundNames = new Set(existingRoundsInDb.map(r => r.roundName))

    const subsequentRounds = []
    if (roundName === 'ROUND_OF_32') {
      subsequentRounds.push(
        { name: 'ROUND_OF_16', order: 1, pairingsCount: 8 },
        { name: 'QUARTER_FINAL', order: 2, pairingsCount: 4 },
        { name: 'SEMI_FINAL', order: 3, pairingsCount: 2 },
        { name: 'FINAL', order: 5, pairingsCount: 1 }
      )
    } else if (roundName === 'ROUND_OF_16') {
      subsequentRounds.push(
        { name: 'QUARTER_FINAL', order: 2, pairingsCount: 4 },
        { name: 'SEMI_FINAL', order: 3, pairingsCount: 2 },
        { name: 'FINAL', order: 5, pairingsCount: 1 }
      )
    } else if (roundName === 'QUARTER_FINAL') {
      subsequentRounds.push(
        { name: 'SEMI_FINAL', order: 3, pairingsCount: 2 },
        { name: 'FINAL', order: 5, pairingsCount: 1 }
      )
    } else if (roundName === 'SEMI_FINAL') {
      subsequentRounds.push(
        { name: 'FINAL', order: 5, pairingsCount: 1 }
      )
    }

    const roundsToCreate = createFullBracket 
      ? subsequentRounds.filter(sub => !existingRoundNames.has(sub.name))
      : []

    // Calculate total counts for batch ID generation
    const totalRoundsCount = 1 + roundsToCreate.length
    
    let primaryPairingsCountExpected = 0
    if (customPairings && customPairings.length > 0) {
      primaryPairingsCountExpected = customPairings.length
    } else if (createFullBracket) {
      primaryPairingsCountExpected = primaryPairingsCount
    } else {
      const sortedTeams = [...teams]
      primaryPairingsCountExpected = Math.floor(sortedTeams.length / 2)
    }

    let totalPairingsCount = primaryPairingsCountExpected
    for (const sub of roundsToCreate) {
      totalPairingsCount += sub.pairingsCount
    }

    // Batch generate all IDs upfront outside the transaction
    const roundIds = await generateIds(ID_PREFIXES.KNOCKOUT_ROUND, totalRoundsCount)
    const pairingIds = await generateIds(ID_PREFIXES.KNOCKOUT_PAIRING, totalPairingsCount)

    let roundIndex = 0
    let pairingIndex = 0

    // Create knockout round with pairings
    const knockoutRound = await prisma.$transaction(async (tx) => {
      // Revert tournament status to IN_PROGRESS if it was marked as COMPLETED
      if (tournament.status === 'COMPLETED') {
        await tx.tournaments.update({
          where: { id: tournamentId },
          data: { status: 'IN_PROGRESS', updatedAt: new Date() }
        })
      }

      // Create the round
      const roundId = roundIds[roundIndex++]
      const round = await tx.knockout_rounds.create({
        data: {
          id: roundId,
          tournamentId,
          roundName,
          roundOrder,
          legs,
          status: 'PENDING',
          updatedAt: new Date()
        }
      })

      // Create pairings
      const primaryPairingsData = []

      if (customPairings && customPairings.length > 0) {
        for (let i = 0; i < customPairings.length; i++) {
          const cp = customPairings[i]
          const pairingId = pairingIds[pairingIndex++]
          
          const isManual = teams && teams.length > 0
          if (isManual) {
            primaryPairingsData.push({
              id: pairingId,
              knockoutRoundId: round.id,
              team1Id: cp.team1,
              team2Id: cp.team2,
              team1Placeholder: null,
              team2Placeholder: null,
              updatedAt: new Date()
            })
          } else {
            primaryPairingsData.push({
              id: pairingId,
              knockoutRoundId: round.id,
              team1Id: null,
              team2Id: null,
              team1Placeholder: cp.team1,
              team2Placeholder: cp.team2,
              updatedAt: new Date()
            })
          }
        }
      } else if (createFullBracket && (!teams || teams.length === 0)) {
        // Auto mode starts with empty pairings to populate on the go
        for (let i = 0; i < primaryPairingsCount; i++) {
          const pairingId = pairingIds[pairingIndex++]
          const placeholders = getAutoPairingPlaceholders(roundName, i, tournament)
          primaryPairingsData.push({
            id: pairingId,
            knockoutRoundId: round.id,
            team1Id: null,
            team2Id: null,
            team1Placeholder: placeholders.team1Placeholder,
            team2Placeholder: placeholders.team2Placeholder,
            updatedAt: new Date()
          })
        }
      } else {
        // Manual mode: teams list is populated (e.g. selected manually)
        const sortedTeams = [...teams]
        const numPairings = Math.floor(sortedTeams.length / 2)

        if (autoPair) {
          // Automatic pairing: 1 vs last, 2 vs second-last, etc.
          for (let i = 0; i < numPairings; i++) {
            const pairingId = pairingIds[pairingIndex++]
            primaryPairingsData.push({
              id: pairingId,
              knockoutRoundId: round.id,
              team1Id: sortedTeams[i],
              team2Id: sortedTeams[sortedTeams.length - 1 - i],
              team1Placeholder: null,
              team2Placeholder: null,
              updatedAt: new Date()
            })
          }
        } else {
          // Manual pairing: 1 vs 2, 3 vs 4, etc.
          for (let i = 0; i < numPairings; i++) {
            const pairingId = pairingIds[pairingIndex++]
            primaryPairingsData.push({
              id: pairingId,
              knockoutRoundId: round.id,
              team1Id: sortedTeams[i * 2],
              team2Id: sortedTeams[i * 2 + 1],
              team1Placeholder: null,
              team2Placeholder: null,
              updatedAt: new Date()
            })
          }
        }
      }

      await tx.knockout_pairings.createMany({ data: primaryPairingsData })

      // Automatically generate subsequent rounds if createFullBracket is true
      if (createFullBracket && roundsToCreate.length > 0) {
        const roundsData = []
        const pairingsData = []

        for (const sub of roundsToCreate) {
          const subRoundId = roundIds[roundIndex++]
          roundsData.push({
            id: subRoundId,
            tournamentId,
            roundName: sub.name,
            roundOrder: sub.order,
            legs,
            status: 'PENDING' as RoundStatus,
            updatedAt: new Date()
          })

          // Generate empty pairings data for this subsequent round
          for (let i = 0; i < sub.pairingsCount; i++) {
            const pairingId = pairingIds[pairingIndex++]
            const prevRoundName = getPreviousKnockoutRoundName(sub.name) || roundName
            const prevRoundLabel = getRoundDisplayLabel(prevRoundName)
            pairingsData.push({
              id: pairingId,
              knockoutRoundId: subRoundId,
              team1Id: null,
              team2Id: null,
              team1Placeholder: `Winner of ${prevRoundLabel} Match #${2 * i + 1}`,
              team2Placeholder: `Winner of ${prevRoundLabel} Match #${2 * i + 2}`,
              updatedAt: new Date()
            })
          }
        }

        // Batch insert subsequent rounds and pairings in single database calls
        await tx.knockout_rounds.createMany({ data: roundsData })
        await tx.knockout_pairings.createMany({ data: pairingsData })
      }

      return round
    })

    // Immediately resolve and populate pairings on the go if matching conditions exist
    await resolveAndPopulateKnockoutBracket(tournamentId).catch((err) => {
      console.error('Failed to resolve bracket immediately on round creation:', err)
    })

    // Create audit log
    await createAuditLog({
      userId: session.user.id,
      userEmail: session.user.email!,
      userRole: session.user.role!,
      action: 'CREATE_TOURNAMENT',
      entityType: 'knockout_round',
      entityId: knockoutRound.id,
      entityName: roundName,
      seasonId,
      details: {
        tournamentId,
        roundName,
        legs,
        createFullBracket,
        autoPair
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    })

    return NextResponse.json(knockoutRound, { status: 201 })
  } catch (error) {
    console.error('Error creating knockout round:', error)
    return NextResponse.json(
      { error: `Failed to create knockout round: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ seasonId: string; tournamentId: string }> }
) {
  try {
    const { tournamentId } = await params

    const rounds = await prisma.knockout_rounds.findMany({
      where: { tournamentId },
      include: {
        pairings: true,
        _count: {
          select: {
            pairings: true
          }
        }
      },
      orderBy: {
        roundOrder: 'asc'
      }
    })

    return NextResponse.json(rounds)
  } catch (error) {
    console.error('Error fetching knockout rounds:', error)
    return NextResponse.json(
      { error: 'Failed to fetch knockout rounds' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ seasonId: string; tournamentId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { seasonId, tournamentId } = await params

    const tournament = await prisma.tournaments.findUnique({
      where: { id: tournamentId }
    })

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
    }

    // Find all pairings to delete their matches
    const pairings = await prisma.knockout_pairings.findMany({
      where: {
        knockoutRound: {
          tournamentId
        }
      },
      select: {
        leg1MatchId: true,
        leg2MatchId: true
      }
    })

    const matchIds = pairings
      .flatMap(p => [p.leg1MatchId, p.leg2MatchId])
      .filter((id): id is string => !!id)

    // Execute in a transaction
    await prisma.$transaction(async (tx) => {
      // 1. Delete matches
      if (matchIds.length > 0) {
        await tx.matches.deleteMany({
          where: {
            id: {
              in: matchIds
            }
          }
        })
      }

      // 2. Delete knockout rounds (this will cascade delete pairings)
      await tx.knockout_rounds.deleteMany({
        where: {
          tournamentId
        }
      })

      // 3. Reset tournament status to IN_PROGRESS if it was COMPLETED
      if (tournament.status === 'COMPLETED') {
        await tx.tournaments.update({
          where: { id: tournamentId },
          data: { status: 'IN_PROGRESS', updatedAt: new Date() }
        })
      }
    })

    // Create audit log
    await createAuditLog({
      userId: session.user.id,
      userEmail: session.user.email!,
      userRole: session.user.role!,
      action: 'DELETE_TOURNAMENT',
      entityType: 'knockout_rounds',
      entityId: tournamentId,
      entityName: `Reset knockout bracket for ${tournament.name}`,
      seasonId,
      details: {
        tournamentId,
        matchIdsDeleted: matchIds.length
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    })

    return NextResponse.json({ message: 'Knockout bracket reset successfully' })
  } catch (error) {
    console.error('Error resetting knockout bracket:', error)
    return NextResponse.json(
      { error: `Failed to reset knockout bracket: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    )
  }
}
