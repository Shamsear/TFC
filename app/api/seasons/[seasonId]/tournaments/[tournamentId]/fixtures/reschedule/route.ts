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
    
    // Parse the new date string (YYYY-MM-DD) as local/UTC components to construct safely without timezone shifts
    const [year, month, day] = newDate.split('-').map(Number)
    
    // Create updatedMatchDate from oldDate by safely updating year, month, and day to preserve time
    const updatedMatchDate = new Date(match.matchDate)
    updatedMatchDate.setDate(1) // Avoid JS date rollover bugs
    updatedMatchDate.setMonth(month - 1)
    updatedMatchDate.setFullYear(year)
    updatedMatchDate.setDate(day)

    // Calculate precision day difference
    const timeDiff = updatedMatchDate.getTime() - oldDate.getTime()
    const daysDiff = Math.round(timeDiff / (1000 * 60 * 60 * 24))
    const totalShift = daysDiff + (gapDays || 0)

    let updatedStartDate = null
    if (match.startDate) {
      updatedStartDate = new Date(match.startDate)
      updatedStartDate.setDate(updatedStartDate.getDate() + daysDiff)
    }

    if (pushSubsequent) {
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
            matchDate: updatedMatchDate,
            ...(updatedStartDate ? { startDate: updatedStartDate } : {}),
            updatedAt: new Date()
          }
        })

        // Push all subsequent matches
        for (const subMatch of subsequentMatches) {
          const newSubDate = new Date(subMatch.matchDate)
          newSubDate.setDate(newSubDate.getDate() + totalShift)
          
          let newSubStartDate = null
          if (subMatch.startDate) {
            newSubStartDate = new Date(subMatch.startDate)
            newSubStartDate.setDate(newSubStartDate.getDate() + totalShift)
          }

          await tx.matches.update({
            where: { id: subMatch.id },
            data: {
              matchDate: newSubDate,
              ...(newSubStartDate ? { startDate: newSubStartDate } : {}),
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
          matchDate: updatedMatchDate,
          ...(updatedStartDate ? { startDate: updatedStartDate } : {}),
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
        newDate: updatedMatchDate.toISOString(),
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
