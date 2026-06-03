import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateMatchNews } from '@/lib/news/trigger'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'SUB_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { matchId } = await req.json()

    if (!matchId) {
      return NextResponse.json({ error: 'Match ID required' }, { status: 400 })
    }

    // Get match details
    const match = await prisma.matches.findUnique({
      where: { id: matchId },
      include: {
        homeTeam: {
          include: { team: true },
        },
        awayTeam: {
          include: { team: true },
        },
        tournament: {
          include: { season: true },
        },
      },
    })

    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 })
    }

    if (match.status !== 'COMPLETED') {
      return NextResponse.json(
        { error: 'Match must be completed to generate news' },
        { status: 400 }
      )
    }

    // Check if news already exists
    const existingNews = await prisma.news.findFirst({
      where: {
        matchId: match.id,
      },
    })

    if (existingNews) {
      // Delete existing news to regenerate
      await prisma.news.delete({
        where: { id: existingNews.id },
      })
    }

    // Generate news
    console.log(`[News Manager] Generating news for match ${matchId}`)
    await generateMatchNews(match)

    return NextResponse.json({
      success: true,
      message: 'News generated successfully',
    })
  } catch (error: any) {
    console.error('[News Manager] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate news' },
      { status: 500 }
    )
  }
}
