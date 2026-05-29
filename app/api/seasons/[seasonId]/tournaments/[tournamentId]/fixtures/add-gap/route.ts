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
    const { afterDate, gapDays } = body

    if (!afterDate || !gapDays) {
      return NextResponse.json(
        { error: 'Date and gap days are required' },
        { status: 400 }
      )
    }

    const cutoffDate = new Date(afterDate + 'T23:59:59')

    // Get all matches after the specified date
    const subsequentMatches = await prisma.matches.findMany({
      where: {
        tournamentId,
        matchDate: {
          gt: cutoffDate
        }
      },
      orderBy: {
        matchDate: 'asc'
      }
    })

    // Push all subsequent matches by the gap days
    await prisma.$transaction(
      subsequentMatches.map(match => {
        const newDate = new Date(match.matchDate)
        newDate.setDate(newDate.getDate() + gapDays)
        
        let newStartDate = null
        if (match.startDate) {
          newStartDate = new Date(match.startDate)
          newStartDate.setDate(newStartDate.getDate() + gapDays)
        }
        
        return prisma.matches.update({
          where: { id: match.id },
          data: {
            matchDate: newDate,
            ...(newStartDate ? { startDate: newStartDate } : {}),
            updatedAt: new Date()
          }
        })
      })
    )

    // Create audit log
    const { seasonId } = await params
    await createAuditLog({
      userId: session.user.id,
      userEmail: session.user.email!,
      userRole: session.user.role!,
      action: 'UPDATE_MATCH',
      entityType: 'match',
      entityId: tournamentId,
      entityName: 'Add Gap to Fixtures',
      seasonId,
      details: {
        afterDate,
        gapDays,
        matchesUpdated: subsequentMatches.length
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    })

    return NextResponse.json({ 
      success: true, 
      matchesUpdated: subsequentMatches.length 
    })
  } catch (error) {
    console.error('Error adding gap:', error)
    return NextResponse.json(
      { error: 'Failed to add gap' },
      { status: 500 }
    )
  }
}
