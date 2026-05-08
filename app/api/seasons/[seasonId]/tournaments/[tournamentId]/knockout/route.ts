import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { createAuditLog } from '@/lib/audit'

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
    const { roundName, legs, teams, autoPair } = body

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
      const round = await tx.knockout_rounds.create({
        data: {
          id: `knockout-${tournamentId}-${roundName}-${Date.now()}`,
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
          await tx.knockout_pairings.create({
            data: {
              id: `pairing-${round.id}-${i}`,
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
          await tx.knockout_pairings.create({
            data: {
              id: `pairing-${round.id}-${i}`,
              knockoutRoundId: round.id,
              team1Id: sortedTeams[i * 2],
              team2Id: sortedTeams[i * 2 + 1],
              updatedAt: new Date()
            }
          })
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
