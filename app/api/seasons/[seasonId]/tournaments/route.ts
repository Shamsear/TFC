import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { createAuditLog } from '@/lib/audit'
import { generateTournamentId, generateIds, ID_PREFIXES } from '@/lib/id-generator'
import { triggerNews } from '@/lib/news/trigger'

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

    // Generate all IDs outside the transaction to prevent transaction timeouts
    const tournamentId = await generateTournamentId();
    
    const groupCount = tournamentType === 'GROUP_KNOCKOUT' ? (numGroups || 2) : 0;
    const groupIds = groupCount > 0 ? await generateIds(ID_PREFIXES.GROUP, groupCount) : [];
    
    const standingIds = await generateIds(ID_PREFIXES.STANDING, selectedTeams.length);

    // Create tournament with groups and standings
    const tournament = await prisma.$transaction(async (tx) => {
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
      if (tournamentType === 'GROUP_KNOCKOUT' && groupCount > 0) {
        const groupNames = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
        
        await tx.groups.createMany({
          data: groupIds.map((groupId, i) => ({
            id: groupId,
            tournamentId: newTournament.id,
            name: `Group ${groupNames[i]}`,
            groupOrder: i,
            updatedAt: new Date()
          }))
        })
      }

      // Create standings for selected teams in bulk
      if (selectedTeams.length > 0) {
        await tx.standings.createMany({
          data: selectedTeams.map((teamId: string, i: number) => ({
            id: standingIds[i],
            tournamentId: newTournament.id,
            teamId,
            updatedAt: new Date()
          }))
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

    // Generate AI news for tournament creation
    try {
      const season = await prisma.seasons.findUnique({
        where: { id: seasonId },
        select: { name: true }
      });

      await triggerNews('tournament_created', {
        season_id: seasonId,
        season_name: season?.name,
        metadata: {
          tournament_name: tournament.name,
          tournament_type: tournamentType,
          team_count: selectedTeams.length,
          start_date: startDate,
          has_groups: tournamentType === 'GROUP_KNOCKOUT',
          num_groups: numGroups
        }
      });
    } catch (newsErr) {
      console.warn('[News AI] Failed to generate tournament creation news:', newsErr);
    }

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
