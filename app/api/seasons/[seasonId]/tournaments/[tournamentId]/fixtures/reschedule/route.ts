import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { createAuditLog } from '@/lib/audit'

export async function PATCH(
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
    const { matchId, newDate, pushSubsequent, gapDays } = body

    if (!matchId || !newDate) {
      return NextResponse.json(
        { error: 'Match ID and new date are required' },
        { status: 400 }
      )
    }

    // Get the match being edited
    const match = await prisma.matches.findUnique({
      where: { id: matchId }
    })

    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 })
    }

    const oldDate = new Date(match.matchDate)
    const newMatchDate = new Date(newDate)

    if (pushSubsequent) {
      // Calculate the difference in days
      const daysDiff = Math.floor((newMatchDate.getTime() - oldDate.getTime()) / (1000 * 60 * 60 * 24))
      const totalShift = daysDiff + (gapDays || 0)

      // Get all matches after the old date
      const subsequentMatches = await prisma.matches.findMany({
        where: {
          tournamentId,
          matchDate: {
            gt: oldDate
          }
        },
        orderBy: {
          matchDate: 'asc'
        }
      })

      // Update all matches in a transaction
      await prisma.$transaction(async (tx) => {
        // Update the edited match
        await tx.matches.update({
          where: { id: matchId },
          data: {
            matchDate: newMatchDate,
            updatedAt: new Date()
          }
        })

        // Push all subsequent matches
        for (const subMatch of subsequentMatches) {
          const newSubDate = new Date(subMatch.matchDate)
          newSubDate.setDate(newSubDate.getDate() + totalShift)
          
          await tx.matches.update({
            where: { id: subMatch.id },
            data: {
              matchDate: newSubDate,
              updatedAt: new Date()
            }
          })
        }
      })
    } else {
      // Just update this match
      await prisma.matches.update({
        where: { id: matchId },
        data: {
          matchDate: newMatchDate,
          updatedAt: new Date()
        }
      })
    }

    // Create audit log
    const { seasonId } = await params
    await createAuditLog({
      userId: session.user.id,
      userEmail: session.user.email!,
      userRole: session.user.role!,
      action: 'UPDATE_MATCH',
      entityType: 'match',
      entityId: matchId,
      entityName: 'Fixture Reschedule',
      seasonId,
      details: {
        matchId,
        oldDate: oldDate.toISOString(),
        newDate: newMatchDate.toISOString(),
        pushSubsequent,
        gapDays,
        affectedMatches: pushSubsequent ? (await prisma.matches.count({
          where: {
            tournamentId,
            matchDate: { gt: oldDate }
          }
        })) : 1
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error rescheduling fixture:', error)
    return NextResponse.json(
      { error: 'Failed to reschedule fixture' },
      { status: 500 }
    )
  }
}
