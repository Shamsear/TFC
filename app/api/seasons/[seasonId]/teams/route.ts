import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { createAuditLog } from '@/lib/audit'
import { generateSeasonTeamId, generateFinancialId } from '@/lib/id-generator'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ seasonId: string }> }
) {
  try {
    const { seasonId } = await params

    const seasonTeams = await prisma.season_teams.findMany({
      where: { seasonId },
      include: {
        team: true
      }
    })

    const teams = seasonTeams.map(st => ({
      id: st.team.id,
      name: st.team.name,
      logoUrl: st.team.logoUrl,
      currentBudget: st.currentBudget
    }))

    return NextResponse.json(teams)
  } catch (error) {
    console.error('Error fetching teams:', error)
    return NextResponse.json(
      { error: 'Failed to fetch teams' },
      { status: 500 }
    )
  }
}

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
    const { teamIds } = body

    if (!teamIds || !Array.isArray(teamIds)) {
      return NextResponse.json(
        { error: 'Invalid team IDs' },
        { status: 400 }
      )
    }

    // Get season to get starting purse
    const season = await prisma.seasons.findUnique({
      where: { id: seasonId }
    })

    if (!season) {
      return NextResponse.json(
        { error: 'Season not found' },
        { status: 404 }
      )
    }

    // Get existing season teams
    const existingSeasonTeams = await prisma.season_teams.findMany({
      where: { seasonId }
    })

    const existingTeamIds = existingSeasonTeams.map(st => st.teamId)

    // Determine which teams to add and which to remove
    const teamsToAdd = teamIds.filter((id: string) => !existingTeamIds.includes(id))
    const teamsToRemove = existingTeamIds.filter(id => !teamIds.includes(id))

    // Generate IDs outside transaction
    const newSeasonTeams = await Promise.all(
      teamsToAdd.map(async (teamId) => ({
        id: await generateSeasonTeamId(),
        teamId,
        ledgerId: await generateFinancialId()
      }))
    )

    // Use transaction to add and remove teams
    await prisma.$transaction(
      async (tx) => {
        // Remove teams
        if (teamsToRemove.length > 0) {
          await tx.season_teams.deleteMany({
            where: {
              seasonId,
              teamId: { in: teamsToRemove }
            }
          })
        }

        // Add new teams and create ledger entries
        for (const { id: seasonTeamId, teamId, ledgerId } of newSeasonTeams) {
          // Create season team
          await tx.season_teams.create({
            data: {
              id: seasonTeamId,
              seasonId,
              teamId,
              currentBudget: season.startingPurse,
              finalBudget: null,
              updatedAt: new Date()
            }
          })

          // Create initial financial ledger entry
          await tx.financial_ledger.create({
            data: {
              id: ledgerId,
              seasonTeamId: seasonTeamId,
              seasonId,
              transactionType: 'INITIAL_PURSE',
              amount: season.startingPurse,
              previousBalance: 0,
              newBalance: season.startingPurse,
              description: 'Initial season purse'
            }
          })
        }
      },
      {
        maxWait: 10000, // 10 seconds max wait
        timeout: 30000, // 30 seconds timeout
      }
    )

    // Create audit log
    await createAuditLog({
      userId: session.user.id,
      userEmail: session.user.email!,
      userRole: session.user.role!,
      action: 'UPDATE_TEAM',
      entityType: 'season_teams',
      entityId: seasonId,
      entityName: 'Season Teams',
      seasonId,
      details: {
        teamsAdded: teamsToAdd,
        teamsRemoved: teamsToRemove,
        totalTeams: teamIds.length
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    })

    return NextResponse.json({ 
      success: true,
      added: teamsToAdd.length,
      removed: teamsToRemove.length
    })
  } catch (error) {
    console.error('Error assigning teams:', error)
    return NextResponse.json(
      { error: 'Failed to assign teams' },
      { status: 500 }
    )
  }
}
