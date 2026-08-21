import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { createAuditLog } from '@/lib/audit'
import { generateSeasonTeamId, generateFinancialId, generateManagerId } from '@/lib/id-generator'
import { triggerNews } from '@/lib/news/trigger'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ seasonId: string }> }
) {
  try {
    const { seasonId } = await params

    const seasonTeams = await prisma.season_teams.findMany({
      where: { seasonId, isActive: true },
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
    }    const { seasonId } = await params
    const body = await request.json()
    const { assignments, teamIds } = body

    // Support both old format (teamIds) and new format (assignments)
    if (assignments && Array.isArray(assignments)) {
      // New manager-based flow
      return await handleManagerAssignments(seasonId, assignments, session, request)
    }

    // Legacy teamIds flow
    if (!teamIds || !Array.isArray(teamIds)) {
      return NextResponse.json(
        { error: 'Invalid request: provide assignments or teamIds' },
        { status: 400 }
      )
    }

    return await handleTeamIdsAssignment(seasonId, teamIds, session, request)
  } catch (error) {
    console.error('Error assigning teams:', error)
    return NextResponse.json(
      { error: 'Failed to assign teams' },
      { status: 500 }
    )
  }
}

interface ManagerAssignment {
  managerId: string
  managerName: string
  teamId: string | null
  newTeamName: string | null
  newTeamLogoUrl: string | null
}

async function handleManagerAssignments(
  seasonId: string,
  assignments: ManagerAssignment[],
  session: any,
  request: NextRequest
) {
  const season = await prisma.seasons.findUnique({ where: { id: seasonId } })
  if (!season) {
    return NextResponse.json({ error: 'Season not found' }, { status: 404 })
  }

  const newTeamNames = assignments.filter(a => a.newTeamName)
  const teamIdMap = new Map<string, string>() // newTeamId -> team name

  // Create new teams if needed (or find existing team by name)
  const createdTeams = await Promise.all(
    newTeamNames.map(async (a) => {
      // Check if a team with this name already exists
      const existingTeam = await prisma.teams.findFirst({
        where: { name: { equals: a.newTeamName!, mode: 'insensitive' } }
      })

      if (existingTeam) {
        throw new Error(`TEAM_EXISTS:${existingTeam.name}:${existingTeam.id}`)
      }

      const teamId = await generateSeasonTeamId()
      await prisma.teams.create({
        data: {
          id: teamId,
          name: a.newTeamName!,
          managerName: a.managerName,
          logoUrl: a.newTeamLogoUrl || '',
          updatedAt: new Date(),
        }
      })
      // Ensure manager has a managers record
      const managerRecord = await prisma.managers.findFirst({
        where: { name: { equals: a.managerName, mode: 'insensitive' } }
      })
      let managerId = a.managerId
      if (!managerRecord) {
        const newMgr = await prisma.managers.create({
          data: { id: await generateManagerId(), name: a.managerName, createdAt: new Date(), updatedAt: new Date() }
        })
        managerId = newMgr.id
      } else {
        managerId = managerRecord.id
      }

      // Link manager to team
      await prisma.manager_teams.create({
        data: { managerId, teamId, isCurrent: true }
      })
      teamIdMap.set(a.managerId, teamId)
      return { managerId: a.managerId, teamId }
    })
  )

  // Resolve final team IDs
  const finalAssignments = assignments.map(a => ({
    managerId: a.managerId,
    managerName: a.managerName,
    teamId: teamIdMap.get(a.managerId) || a.teamId!,
  }))

  // Get existing season teams
  const existingSeasonTeams = await prisma.season_teams.findMany({ where: { seasonId } })
  const existingTeamIds = existingSeasonTeams.map(st => st.teamId)
  const newTeamIds = finalAssignments.map(a => a.teamId)

  // Teams to remove (were in season but no longer assigned)
  const teamsToRemove = existingTeamIds.filter(id => !newTeamIds.includes(id))
  // Teams to add (new assignments not yet in season)
  const teamsToAdd = finalAssignments.filter(a => !existingTeamIds.includes(a.teamId))
  // Teams already in season but managerName needs updating
  const teamsToUpdate = finalAssignments.filter(a => {
    if (existingTeamIds.includes(a.teamId)) {
      const existing = existingSeasonTeams.find(st => st.teamId === a.teamId)
      return existing && existing.managerName?.toLowerCase() !== a.managerName.toLowerCase()
    }
    return false
  })

  // Generate IDs outside transaction
  const newSeasonTeamEntries = await Promise.all(
    teamsToAdd.map(async (a) => ({
      id: await generateSeasonTeamId(),
      teamId: a.teamId,
      ledgerId: await generateFinancialId(),
      managerName: a.managerName,
    }))
  )

  const transactionFn = async (tx: any) => {
      // Deactivate removed teams (never delete — preserves all data)
      if (teamsToRemove.length > 0) {
        await tx.season_teams.updateMany({
          where: { seasonId, teamId: { in: teamsToRemove } },
          data: { isActive: false, updatedAt: new Date() }
        })
      }

      for (const { id: seasonTeamId, teamId, ledgerId, managerName } of newSeasonTeamEntries) {
        // Check if there's an inactive record to reactivate
        const inactive = await tx.season_teams.findFirst({
          where: { seasonId, teamId, isActive: false }
        })
        if (inactive) {
          await tx.season_teams.update({
            where: { id: inactive.id },
            data: { isActive: true, managerName, currentBudget: season.startingPurse, updatedAt: new Date() }
          })
          // Reuse existing ledger or create new one
          const existingLedger = await tx.financial_ledger.findFirst({
            where: { seasonTeamId: inactive.id, transactionType: 'INITIAL_PURSE' }
          })
          if (!existingLedger) {
            await tx.financial_ledger.create({
              data: {
                id: ledgerId,
                seasonTeamId: inactive.id,
                seasonId,
                transactionType: 'INITIAL_PURSE',
                amount: season.startingPurse,
                previousBalance: 0,
                newBalance: season.startingPurse,
                description: 'Initial season purse'
              }
            })
          }
        } else {
          await tx.season_teams.create({
            data: {
              id: seasonTeamId,
              seasonId,
              teamId,
              managerName,
              currentBudget: season.startingPurse,
              finalBudget: null,
              updatedAt: new Date()
            }
          })

          await tx.financial_ledger.create({
            data: {
              id: ledgerId,
              seasonTeamId,
              seasonId,
              transactionType: 'INITIAL_PURSE',
              amount: season.startingPurse,
              previousBalance: 0,
              newBalance: season.startingPurse,
              description: 'Initial season purse'
            }
          })
        }
      }

      // Update managerName for teams already in season where manager changed
      for (const { teamId, managerName } of teamsToUpdate) {
        await tx.season_teams.updateMany({
          where: { seasonId, teamId, isActive: true },
          data: { managerName, updatedAt: new Date() }
        })
      }

      await tx.seasons.update({
        where: { id: seasonId },
        data: { defaultMaxBidsPerTeam: finalAssignments.length, updatedAt: new Date() }
      })
    }
  await prisma.$transaction(transactionFn, { maxWait: 10000, timeout: 30000 })

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
      managersAssigned: finalAssignments.map(a => ({ manager: a.managerName, teamId: a.teamId })),
      teamsRemoved: teamsToRemove,
      totalTeams: finalAssignments.length
    },
    ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown'
  })

  return NextResponse.json({
    success: true,
    added: teamsToAdd.length,
    removed: teamsToRemove.length,
    totalManagers: finalAssignments.length
  })
}

async function handleTeamIdsAssignment(
  seasonId: string,
  teamIds: string[],
  session: any,
  request: NextRequest
) {
  const season = await prisma.seasons.findUnique({ where: { id: seasonId } })
  if (!season) {
    return NextResponse.json({ error: 'Season not found' }, { status: 404 })
  }

  const existingSeasonTeams = await prisma.season_teams.findMany({ where: { seasonId } })
  const existingTeamIds = existingSeasonTeams.map(st => st.teamId)
  const teamsToAdd = teamIds.filter((id: string) => !existingTeamIds.includes(id))
  const teamsToRemove = existingTeamIds.filter(id => !teamIds.includes(id))

  const newSeasonTeams = await Promise.all(
    teamsToAdd.map(async (teamId) => ({
      id: await generateSeasonTeamId(),
      teamId,
      ledgerId: await generateFinancialId()
    }))
  )

  const transactionFn = async (tx: any) => {
      // Deactivate removed teams (never delete — preserves all data)
      if (teamsToRemove.length > 0) {
        await tx.season_teams.updateMany({
          where: { seasonId, teamId: { in: teamsToRemove } },
          data: { isActive: false, updatedAt: new Date() }
        })
      }

      for (const { id: seasonTeamId, teamId, ledgerId } of newSeasonTeams) {
        // Resolve managerName from team's managerLinks
        const team = await prisma.teams.findUnique({
          where: { id: teamId },
          include: { managerLinks: { where: { isCurrent: true }, include: { manager: true }, take: 1 } }
        })
        const managerName = team?.managerLinks[0]?.manager?.name || team?.managerName || ''

        await tx.season_teams.create({
          data: {
            id: seasonTeamId,
            seasonId,
            teamId,
            managerName,
            currentBudget: season.startingPurse,
            finalBudget: null,
            updatedAt: new Date()
          }
        })

        await tx.financial_ledger.create({
          data: {
            id: ledgerId,
            seasonTeamId,
            seasonId,
            transactionType: 'INITIAL_PURSE',
            amount: season.startingPurse,
            previousBalance: 0,
            newBalance: season.startingPurse,
            description: 'Initial season purse'
          }
        })
      }

      await tx.seasons.update({
        where: { id: seasonId },
        data: { defaultMaxBidsPerTeam: teamIds.length, updatedAt: new Date() }
      })
    }
  await prisma.$transaction(transactionFn, { maxWait: 10000, timeout: 30000 })

  await createAuditLog({
    userId: session.user.id,
    userEmail: session.user.email!,
    userRole: session.user.role!,
    action: 'UPDATE_TEAM',
    entityType: 'season_teams',
    entityId: seasonId,
    entityName: 'Season Teams',
    seasonId,
    details: { teamsAdded: teamsToAdd, teamsRemoved: teamsToRemove, totalTeams: teamIds.length },
    ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown'
  })

  return NextResponse.json({ success: true, added: teamsToAdd.length, removed: teamsToRemove.length })
}
