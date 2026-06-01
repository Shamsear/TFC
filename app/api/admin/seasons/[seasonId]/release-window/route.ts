import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { triggerNews } from '@/lib/news/trigger'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ seasonId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'SUB_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { seasonId } = await params
    const body = await request.json()
    const { open } = body

    // Get season details
    const season = await prisma.seasons.findUnique({
      where: { id: seasonId },
      select: { name: true }
    })

    // Update season
    await prisma.seasons.update({
      where: { id: seasonId },
      data: { releaseWindowOpen: open },
    })

    // Trigger news for window open/close
    if (season) {
      try {
        await triggerNews(open ? 'release_window_opened' : 'release_window_closed', {
          season_id: seasonId,
          season_name: season.name,
          metadata: {
            window_status: open ? 'opened' : 'closed'
          }
        });
      } catch (newsErr) {
        console.warn('[News AI] Failed to generate release window news:', newsErr);
      }
    }

    return NextResponse.json({ success: true, releaseWindowOpen: open })
  } catch (error: any) {
    console.error('Error toggling release window:', error)
    return NextResponse.json(
      { error: 'Failed to toggle release window' },
      { status: 500 }
    )
  }
}
