import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { createAuditLog } from '@/lib/audit'
import { generateKnockoutRoundId, generateKnockoutPairingId } from '@/lib/id-generator'

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
    const { roundName, legs, teams, autoPair, createFullBracket } = body

    if (!roundName || !legs || !teams || teams.length < 2) {
      return NextResponse.json(
        { error: 'Round name, legs, and at least 2 teams are required' },
        { status: 400 }
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

    // Create knockout round with pairings
    const knockoutRound = await prisma.$transaction(async (tx) => {
      // Create the round
      const roundId = await generateKnockoutRoundId()
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
      const sortedTeams = [...teams]
      const numPairings = Math.floor(sortedTeams.length / 2)

      if (autoPair) {
        // Automatic pairing: 1 vs last, 2 vs second-last, etc.
        for (let i = 0; i < numPairings; i++) {
          const pairingId = await generateKnockoutPairingId()
          await tx.knockout_pairings.create({
            data: {
              id: pairingId,
              knockoutRoundId: round.id,
              team1Id: sortedTeams[i],
              team2Id: sortedTeams[sortedTeams.length - 1 - i],
              updatedAt: new Date()
            }
          })
        }
      } else {
        // Manual pairing: create empty pairings to be filled later
        for (let i = 0; i < numPairings; i++) {
          const pairingId = await generateKnockoutPairingId()
          await tx.knockout_pairings.create({
            data: {
              id: pairingId,
              knockoutRoundId: round.id,
              team1Id: sortedTeams[i * 2],
              team2Id: sortedTeams[i * 2 + 1],
              updatedAt: new Date()
            }
          })
        }
      }

      // Automatically generate subsequent rounds if createFullBracket is true
      if (createFullBracket) {
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

        for (const sub of subsequentRounds) {
          const exists = await tx.knockout_rounds.findUnique({
            where: {
              tournamentId_roundName: {
                tournamentId,
                roundName: sub.name
              }
            }
          })

          if (!exists) {
            const subRoundId = await generateKnockoutRoundId()
            const subRound = await tx.knockout_rounds.create({
              data: {
                id: subRoundId,
                tournamentId,
                roundName: sub.name,
                roundOrder: sub.order,
                legs,
                status: 'PENDING',
                updatedAt: new Date()
              }
            })

            // Create empty pairings for the subsequent round
            for (let i = 0; i < sub.pairingsCount; i++) {
              const pairingId = await generateKnockoutPairingId()
              await tx.knockout_pairings.create({
                data: {
                  id: pairingId,
                  knockoutRoundId: subRound.id,
                  team1Id: null,
                  team2Id: null,
                  updatedAt: new Date()
                }
              })
            }
          }
        }
      }

      return round
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
        numTeams: teams.length,
        autoPair
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    })

    return NextResponse.json(knockoutRound, { status: 201 })
  } catch (error) {
    console.error('Error creating knockout round:', error)
    return NextResponse.json(
      { error: 'Failed to create knockout round' },
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
