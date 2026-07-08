import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { createAuditLog } from '@/lib/audit'
import { generateIds, ID_PREFIXES } from '@/lib/id-generator'
import crypto from 'crypto'

export async function PUT(
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
    const {
      name,
      tournamentType,
      startDate,
      endDate,
      description,
      status,
      selectedTeams,
      numGroups,
      leagueLegs,
      playoffFormat,
      groupLegs,
      groupQualifiers,
      knockoutLegs,
      qualifyingTeams,
      qualifyingRound,
      isLinkedTournament,
      linkSourceTournamentId,
      linkType,
      linkQualificationConfig
    } = body

    if (!name || !tournamentType || !startDate) {
      return NextResponse.json(
        { error: 'Name, tournament type, and start date are required' },
        { status: 400 }
      )
    }

    const linked = !!isLinkedTournament
    if (!linked && (!selectedTeams || selectedTeams.length < 2)) {
      return NextResponse.json(
        { error: 'At least 2 teams are required to create/edit a manual tournament' },
        { status: 400 }
      )
    }

    if (linked && (!linkSourceTournamentId || !linkType || !linkQualificationConfig)) {
      return NextResponse.json(
        { error: 'Source tournament, link type, and qualification config are required for linked tournaments' },
        { status: 400 }
      )
    }

    // Verify tournament exists and belongs to the season
    const existingTournament = await prisma.tournaments.findUnique({
      where: { id: tournamentId },
      include: {
        standings: true,
        groups: true,
        incomingLinks: true
      }
    })

    if (!existingTournament || existingTournament.seasonId !== seasonId) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
    }

    const groupCount = tournamentType === 'GROUP_KNOCKOUT' ? (numGroups || 2) : 0
    const groupIds = groupCount > 0 ? await generateIds(ID_PREFIXES.GROUP, groupCount) : []

    const updatedTournament = await prisma.$transaction(async (tx) => {
      // 1. Delete all current matches, standings, groups, knockout rounds, and tournament teams to wipe existing layout
      await tx.matches.deleteMany({ where: { tournamentId } })
      await tx.standings.deleteMany({ where: { tournamentId } })
      await tx.groups.deleteMany({ where: { tournamentId } })
      await tx.knockout_rounds.deleteMany({ where: { tournamentId } })
      await tx.tournament_teams.deleteMany({ where: { tournamentId } })

      // 2. Update basic tournament fields
      const tourn = await tx.tournaments.update({
        where: { id: tournamentId },
        data: {
          name,
          tournamentType,
          startDate: new Date(startDate),
          endDate: endDate ? new Date(endDate) : null,
          description: description || null,
          status: status || existingTournament.status,
          requiresQualification: linked,
          qualificationStatus: linked ? 'PENDING' : 'COMPLETE',
          // League configuration
          leagueLegs: (tournamentType === 'LEAGUE_ONLY' || tournamentType === 'LEAGUE_PLAYOFF') 
            ? (leagueLegs || 2) 
            : null,
          playoffFormat: tournamentType === 'LEAGUE_PLAYOFF' 
            ? (playoffFormat || 'TOP_4_SEMI') 
            : null,
          // Group configuration
          groupLegs: tournamentType === 'GROUP_KNOCKOUT' 
            ? (groupLegs || 2) 
            : null,
          groupQualifiers: tournamentType === 'GROUP_KNOCKOUT' 
            ? (groupQualifiers || 2) 
            : null,
          // Knockout configuration
          knockoutConfig: (tournamentType === 'KNOCKOUT_ONLY' || tournamentType === 'GROUP_KNOCKOUT' || tournamentType === 'LEAGUE_PLAYOFF' || tournamentType === 'CUSTOM_KNOCKOUT')
            ? JSON.stringify({
                defaultLegs: knockoutLegs || 2,
                ...(tournamentType === 'CUSTOM_KNOCKOUT' ? {
                  qualifyingTeams: qualifyingTeams || 4,
                  qualifyingRound: qualifyingRound || 'SEMI_FINAL'
                } : {})
              })
            : null,
          updatedAt: new Date()
        }
      })

      // 3. Recreate groups if GROUP_KNOCKOUT type
      if (tournamentType === 'GROUP_KNOCKOUT' && groupCount > 0) {
        const groupNames = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
        await tx.groups.createMany({
          data: groupIds.map((groupId, i) => ({
            id: groupId,
            tournamentId,
            name: `Group ${groupNames[i]}`,
            groupOrder: i,
            updatedAt: new Date()
          }))
        })
      }

      // 4. Manage standings & incoming links (manual vs linked)
      if (!linked) {
        // Remove incoming link if any
        await tx.tournament_links.deleteMany({ where: { targetTournamentId: tournamentId } })

        // Create fresh standings and tournament_teams for the manually selected teams
        if (selectedTeams && selectedTeams.length > 0) {
          const standingIds = await generateIds(ID_PREFIXES.STANDING, selectedTeams.length)
          const groupNames = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
          
          const tournTeamsData = selectedTeams.map((teamId: string, i: number) => {
            let groupName = null
            if (tournamentType === 'GROUP_KNOCKOUT' && groupCount > 0) {
              const groupIndex = i % groupCount
              groupName = `Group ${groupNames[groupIndex]}`
            }
            return {
              id: `tt-${tournamentId}-${teamId}`,
              tournamentId,
              teamId,
              groupName,
              seedPosition: i + 1,
              updatedAt: new Date()
            }
          })

          // 1. Create tournament_teams records
          await tx.tournament_teams.createMany({
            data: tournTeamsData
          })

          // 2. Create standings records
          await tx.standings.createMany({
            data: selectedTeams.map((teamId: string, i: number) => {
              let groupName = null
              if (tournamentType === 'GROUP_KNOCKOUT' && groupCount > 0) {
                const groupIndex = i % groupCount
                groupName = `Group ${groupNames[groupIndex]}`
              }
              return {
                id: standingIds[i],
                tournamentId,
                teamId,
                groupName,
                updatedAt: new Date()
              }
            })
          })
        }
      } else {
        // Wipe qualifications for the link to trigger fresh calculations
        const existingLink = existingTournament.incomingLinks[0]
        if (existingLink) {
          await tx.tournament_team_qualifications.deleteMany({
            where: { tournamentLinkId: existingLink.id }
          })

          await tx.tournament_links.update({
            where: { id: existingLink.id },
            data: {
              sourceTournamentId: linkSourceTournamentId,
              linkType,
              qualificationConfig: linkQualificationConfig,
              updatedAt: new Date()
            }
          })
        } else {
          await tx.tournament_links.create({
            data: {
              id: crypto.randomUUID(),
              sourceTournamentId: linkSourceTournamentId,
              targetTournamentId: tournamentId,
              linkType,
              qualificationConfig: linkQualificationConfig,
              status: 'ACTIVE'
            }
          })
        }

        // Flag the source tournament as linked
        await tx.tournaments.update({
          where: { id: linkSourceTournamentId },
          data: { isLinked: true }
        })
      }

      return tourn
    })

    // Create audit log
    await createAuditLog({
      userId: session.user.id,
      userEmail: session.user.email!,
      userRole: session.user.role!,
      action: 'UPDATE_TOURNAMENT',
      entityType: 'tournament',
      entityId: tournamentId,
      entityName: name,
      seasonId,
      details: body,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    })

    return NextResponse.json(updatedTournament)
  } catch (error: any) {
    console.error('Error updating tournament:', error)
    return NextResponse.json(
      { error: 'Failed to update tournament', details: error.message },
      { status: 500 }
    )
  }
}

export async function PATCH(
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
    const { status } = body

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 })
    }

    // Verify tournament exists and belongs to the season
    const tournament = await prisma.tournaments.findUnique({
      where: { id: tournamentId }
    })

    if (!tournament || tournament.seasonId !== seasonId) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
    }

    const updatedTournament = await prisma.tournaments.update({
      where: { id: tournamentId },
      data: {
        status,
        updatedAt: new Date()
      }
    })

    // Create audit log
    await createAuditLog({
      userId: session.user.id,
      userEmail: session.user.email!,
      userRole: session.user.role!,
      action: 'UPDATE_TOURNAMENT',
      entityType: 'tournament',
      entityId: tournamentId,
      entityName: tournament.name,
      seasonId,
      details: { oldStatus: tournament.status, newStatus: status },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    })

    return NextResponse.json(updatedTournament)
  } catch (error: any) {
    console.error('Error updating tournament status:', error)
    return NextResponse.json(
      { error: 'Failed to update tournament status', details: error.message },
      { status: 500 }
    )
  }
}
