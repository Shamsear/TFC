import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { createAuditLog } from '@/lib/audit'
import { generateTournamentId, generateGroupId, generateStandingId } from '@/lib/id-generator'

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
    const {
      name,
      tournamentType,
      startDate,
      endDate,
      description,
      selectedTeams,
      numGroups,
      leagueLegs,
      playoffFormat,
      groupLegs,
      groupQualifiers,
      knockoutLegs,
      qualifyingTeams,
      qualifyingRound
    } = body

    if (!name || !tournamentType || !startDate || !selectedTeams || selectedTeams.length < 2) {
      return NextResponse.json(
        { error: 'Name, tournament type, start date, and at least 2 teams are required' },
        { status: 400 }
      )
    }

    // Create tournament with groups and standings
    const tournament = await prisma.$transaction(async (tx) => {
      // Generate clean tournament ID
      const tournamentId = await generateTournamentId();
      
      // Create the tournament with advanced configuration
      const newTournament = await tx.tournaments.create({
        data: {
          id: tournamentId,
          seasonId,
          name,
          tournamentType,
          startDate: new Date(startDate),
          endDate: endDate ? new Date(endDate) : null,
          description: description || null,
          status: 'UPCOMING',
          updatedAt: new Date(),
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
          // Knockout configuration (stored as JSON for per-round customization)
          knockoutConfig: (tournamentType === 'KNOCKOUT_ONLY' || tournamentType === 'GROUP_KNOCKOUT' || tournamentType === 'LEAGUE_PLAYOFF' || tournamentType === 'CUSTOM_KNOCKOUT')
            ? JSON.stringify({
                defaultLegs: knockoutLegs || 2,
                ...(tournamentType === 'CUSTOM_KNOCKOUT' ? {
                  qualifyingTeams: qualifyingTeams || 4,
                  qualifyingRound: qualifyingRound || 'SEMI_FINAL'
                } : {})
              })
            : null
        }
      })

      // Create groups if GROUP_KNOCKOUT type
      if (tournamentType === 'GROUP_KNOCKOUT') {
        const groupNames = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
        const groupCount = numGroups || 2
        
        for (let i = 0; i < groupCount; i++) {
          const groupId = await generateGroupId();
          await tx.groups.create({
            data: {
              id: groupId,
              tournamentId: newTournament.id,
              name: `Group ${groupNames[i]}`,
              groupOrder: i,
              updatedAt: new Date()
            }
          })
        }
      }

      // Create standings for selected teams
      for (const teamId of selectedTeams) {
        const standingId = await generateStandingId();
        await tx.standings.create({
          data: {
            id: standingId,
            tournamentId: newTournament.id,
            teamId,
            updatedAt: new Date()
          }
        })
      }

      return newTournament
    })

    // Create audit log
    await createAuditLog({
      userId: session.user.id,
      userEmail: session.user.email!,
      userRole: session.user.role!,
      action: 'CREATE_TOURNAMENT',
      entityType: 'tournament',
      entityId: tournament.id,
      entityName: tournament.name,
      seasonId,
      details: {
        tournamentType,
        startDate,
        endDate,
        numTeams: selectedTeams.length,
        numGroups,
        leagueLegs,
        playoffFormat,
        groupLegs,
        groupQualifiers,
        knockoutLegs,
        qualifyingTeams,
        qualifyingRound
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    })

    return NextResponse.json(tournament, { status: 201 })
  } catch (error) {
    console.error('Error creating tournament:', error)
    return NextResponse.json(
      { error: 'Failed to create tournament' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ seasonId: string }> }
) {
  try {
    const { seasonId } = await params

    const tournaments = await prisma.tournaments.findMany({
      where: { seasonId },
      select: {
        id: true,
        name: true,
        tournamentType: true,
        status: true,
        startDate: true,
        endDate: true,
        description: true,
        leagueLegs: true,
        playoffFormat: true,
        groupLegs: true,
        groupQualifiers: true,
        knockoutConfig: true,
        _count: {
          select: {
            matches: true,
            groups: true
          }
        }
      },
      orderBy: {
        startDate: 'desc'
      },
      take: 50 // Limit to 50 tournaments
    })

    return NextResponse.json(tournaments)
  } catch (error) {
    console.error('Error fetching tournaments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tournaments' },
      { status: 500 }
    )
  }
}
