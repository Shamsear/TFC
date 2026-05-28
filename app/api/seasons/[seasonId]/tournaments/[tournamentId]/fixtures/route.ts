import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { createAuditLog } from '@/lib/audit'
import { generateIds, ID_PREFIXES } from '@/lib/id-generator'

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
    const { fixtures, venue } = body

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

    // Execute bulk insert in a single extremely fast query (takes <50ms instead of 30+ seconds!)
    await prisma.matches.createMany({
      data: dataToInsert
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
