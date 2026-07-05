import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { populateTournamentLink } from '@/lib/tournament-linking'

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
    
    // Parse body safely
    let force = false
    try {
      const body = await request.json()
      force = !!body.force
    } catch {
      // Body might be empty
    }

    const result = await populateTournamentLink(linkId, { force })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Error populating tournament link teams:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to populate teams' },
      { status: 500 }
    )
  }
}
