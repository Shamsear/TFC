import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { createAuditLog } from '@/lib/audit'
import { generateIds, ID_PREFIXES } from '@/lib/id-generator'
import { triggerNews } from '@/lib/news/trigger'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ seasonId: string; tournamentId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { tournamentId } = await params
    const body = await request.json()
    const { fixtures, venue, groupAssignments } = body

    if (!fixtures || fixtures.length === 0) {
      return NextResponse.json(
        { error: 'No fixtures provided' },
        { status: 400 }
      )
    }

    // Generate all IDs upfront in a single batch query to avoid transaction timeouts
    const matchIds = await generateIds(ID_PREFIXES.MATCH, fixtures.length)

    const dataToInsert = fixtures.map((fixture: any, index: number) => ({
      id: matchIds[index],
      tournamentId,
      groupId: fixture.groupId || null,
      homeTeamId: fixture.homeTeamId,
      awayTeamId: fixture.awayTeamId,
      startDate: fixture.startDate ? new Date(fixture.startDate) : null,
      matchDate: new Date(fixture.matchDate),
      venue: venue || null,
      round: fixture.round || null,
      matchType: fixture.matchType || 'LEAGUE',
      status: 'SCHEDULED',
      updatedAt: new Date()
    }))

    // Execute bulk insert and standings group name updates in a transaction
    await prisma.$transaction(async (tx) => {
      // 1. Create matches
      await tx.matches.createMany({
        data: dataToInsert
      })

      // 2. Update standings group names if groupAssignments is provided
      if (groupAssignments) {
        // Fetch group details to get group names
        const groups = await tx.groups.findMany({
          where: { tournamentId }
        })
        const groupMap = new Map(groups.map(g => [g.id, g.name]))

        for (const [groupId, teamIds] of Object.entries(groupAssignments)) {
          const groupName = groupMap.get(groupId)
          if (groupName && Array.isArray(teamIds) && teamIds.length > 0) {
            // Update groupName in standings for these teams
            await tx.standings.updateMany({
              where: {
                tournamentId,
                teamId: { in: teamIds }
              },
              data: {
                groupName,
                updatedAt: new Date()
              }
            })
          }
        }
      }
    })

    // Create audit log
    const { seasonId } = await params
    await createAuditLog({
      userId: session.user.id,
      userEmail: session.user.email!,
      userRole: session.user.role!,
      action: 'CREATE_MATCH',
      entityType: 'match',
      entityId: tournamentId,
      entityName: `${fixtures.length} fixtures`,
      seasonId,
      details: {
        tournamentId,
        fixtureCount: fixtures.length,
        venue,
        matchTypes: [...new Set(fixtures.map((f: any) => f.matchType || 'LEAGUE'))]
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    })

    // Trigger news for match scheduling (only for first few matches to avoid spam)
    if (fixtures.length > 0 && fixtures.length <= 5) {
      try {
        const tournament = await prisma.tournaments.findUnique({
          where: { id: tournamentId },
          select: { name: true }
        });
        const season = await prisma.seasons.findUnique({
          where: { id: seasonId },
          select: { name: true }
        });

        if (tournament && season) {
          await triggerNews('match_scheduled', {
            season_id: seasonId,
            season_name: season.name,
            metadata: {
              tournament_name: tournament.name,
              match_count: fixtures.length,
              venue: venue || 'TBD'
            }
          });
        }
      } catch (newsErr) {
        console.warn('[News AI] Failed to generate match scheduled news:', newsErr);
      }
    }

    return NextResponse.json(
      { message: `Created ${fixtures.length} fixtures` },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating fixtures:', error)
    return NextResponse.json(
      { error: 'Failed to create fixtures' },
      { status: 500 }
    )
  }
}
