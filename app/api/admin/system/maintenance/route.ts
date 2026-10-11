import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { isMaintenanceModeActive, setMaintenanceMode } from '@/lib/maintenance'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const isMaintenance = await isMaintenanceModeActive()
    return NextResponse.json({ isMaintenance })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch maintenance status' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const role = session.user.role
    if (role !== 'SUPER_ADMIN' && role !== 'SUB_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { enabled } = body

    if (typeof enabled !== 'boolean') {
      return NextResponse.json({ error: 'Invalid enabled parameter' }, { status: 400 })
    }

    await setMaintenanceMode(enabled)

    return NextResponse.json({ success: true, isMaintenance: enabled })
  } catch (error) {
    console.error('Error in maintenance API:', error)
    return NextResponse.json({ error: 'Failed to update maintenance status' }, { status: 500 })
  }
}
