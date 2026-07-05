import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { clearPopulatedTeams } from '@/lib/tournament-linking'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ linkId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!['SUPER_ADMIN', 'SUB_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { linkId } = await params

    const result = await clearPopulatedTeams(linkId)

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Error clearing populated teams from link:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to clear populated teams' },
      { status: 500 }
    )
  }
}
