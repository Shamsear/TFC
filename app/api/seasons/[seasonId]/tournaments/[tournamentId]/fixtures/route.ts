import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { createAuditLog } from '@/lib/audit'
import { generateMatchId } from '@/lib/id-generator'

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

    // Create all fixtures in a transaction
    const createdMatches = await prisma.$transaction(async (tx) => {
      const matches = []
      for (let index = 0; index < fixtures.length; index++) {
        const fixture = fixtures[index]
        const matchId = await generateMatchId()
        const match = await tx.matches.create({
          data: {
            id: matchId,
            tournamentId,
            groupId: fixture.groupId || null,
            homeTeamId: fixture.homeTeamId,
            awayTeamId: fixture.awayTeamId,
            matchDate: new Date(fixture.matchDate),
            venue: venue || null,
            round: fixture.round || null,
            matchType: fixture.matchType || 'LEAGUE',
            status: 'SCHEDULED',
            updatedAt: new Date()
          }
        })
        matches.push(match)
      }
      return matches
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
      entityName: `${createdMatches.length} fixtures`,
      seasonId,
      details: {
        tournamentId,
        fixtureCount: createdMatches.length,
        venue,
        matchTypes: [...new Set(fixtures.map((f: any) => f.matchType || 'LEAGUE'))]
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    })

    return NextResponse.json(
      { message: `Created ${createdMatches.length} fixtures`, matches: createdMatches },
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
