import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateId } from '@/lib/id-generator'

// GET: Fetch all team awards for a tournament
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  try {
    const { tournamentId } = await params

    const awards = await prisma.team_awards.findMany({
      where: {
        tournamentId,
      },
      include: {
        seasonTeam: {
          include: {
            team: {
              select: {
                name: true,
                logoUrl: true,
              },
            },
          },
        },
      },
      orderBy: [
        { awardType: 'asc' },
        { matchdayNumber: 'asc' },
        { weekNumber: 'asc' },
      ],
    })

    return NextResponse.json(awards)
  } catch (error) {
    console.error('Error fetching team awards:', error)
    return NextResponse.json(
      { error: 'Failed to fetch team awards' },
      { status: 500 }
    )
  }
}

// POST: Save a new team award
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  try {
    const session = await auth()
    if (!session || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'SUB_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { tournamentId } = await params
    const body = await req.json()

    const {
      seasonTeamId,
      awardType,
      awardPeriod,
      matchdayNumber,
      weekNumber,
      pointsEarned,
      goalsFor,
      goalsAgainst,
      goalDifference,
      matchesPlayed,
      wins,
      draws,
      losses,
    } = body

    // Validate required fields
    if (!seasonTeamId || !awardType || !awardPeriod) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if award already exists for this period
    const existing = await prisma.team_awards.findFirst({
      where: {
        tournamentId,
        awardType,
        awardPeriod,
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Award already exists for this period' },
        { status: 409 }
      )
    }

    // Create the award
    const award = await prisma.team_awards.create({
      data: {
        id: await generateId('TFCTA'),
        tournamentId,
        seasonTeamId,
        awardType,
        awardPeriod,
        matchdayNumber: matchdayNumber || null,
        weekNumber: weekNumber || null,
        pointsEarned: pointsEarned || 0,
        goalsFor: goalsFor || 0,
        goalsAgainst: goalsAgainst || 0,
        goalDifference: goalDifference || 0,
        matchesPlayed: matchesPlayed || 0,
        wins: wins || 0,
        draws: draws || 0,
        losses: losses || 0,
      },
      include: {
        seasonTeam: {
          include: {
            team: {
              select: {
                name: true,
                logoUrl: true,
              },
            },
          },
        },
      },
    })

    return NextResponse.json(award, { status: 201 })
  } catch (error) {
    console.error('Error creating team award:', error)
    return NextResponse.json(
      { error: 'Failed to create team award' },
      { status: 500 }
    )
  }
}

// DELETE: Remove a team award
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth()
    if (!session || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'SUB_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const awardId = searchParams.get('awardId')

    if (!awardId) {
      return NextResponse.json(
        { error: 'Award ID is required' },
        { status: 400 }
      )
    }

    await prisma.team_awards.delete({
      where: { id: awardId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting team award:', error)
    return NextResponse.json(
      { error: 'Failed to delete team award' },
      { status: 500 }
    )
  }
}
