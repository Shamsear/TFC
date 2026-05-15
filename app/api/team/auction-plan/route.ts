import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { encrypt, decrypt } from '@/lib/encryption'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const seasonId = searchParams.get('seasonId')

    if (!seasonId) {
      return NextResponse.json({ error: 'Season ID required' }, { status: 400 })
    }

    // Get team for this user and season
    const team = await prisma.team.findFirst({
      where: {
        seasonId,
        ownerId: session.user.id,
      },
    })

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    // Get encrypted plan
    const auctionPlan = await prisma.auctionPlan.findUnique({
      where: {
        teamId_seasonId: {
          teamId: team.id,
          seasonId,
        },
      },
    })

    if (!auctionPlan) {
      return NextResponse.json({ plan: null }, { status: 200 })
    }

    // Decrypt the plan
    const decryptedPlan = decrypt(auctionPlan.encryptedPlan)

    return NextResponse.json({
      plan: JSON.parse(decryptedPlan),
      lastUpdated: auctionPlan.updatedAt,
    })
  } catch (error) {
    console.error('Error fetching auction plan:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { seasonId, plan } = body

    if (!seasonId || !plan) {
      return NextResponse.json({ error: 'Season ID and plan required' }, { status: 400 })
    }

    // Get team for this user and season
    const team = await prisma.team.findFirst({
      where: {
        seasonId,
        ownerId: session.user.id,
      },
    })

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    // Encrypt the plan
    const encryptedPlan = encrypt(JSON.stringify(plan))

    // Upsert the plan
    const auctionPlan = await prisma.auctionPlan.upsert({
      where: {
        teamId_seasonId: {
          teamId: team.id,
          seasonId,
        },
      },
      update: {
        encryptedPlan,
      },
      create: {
        teamId: team.id,
        seasonId,
        encryptedPlan,
      },
    })

    return NextResponse.json({
      success: true,
      lastUpdated: auctionPlan.updatedAt,
    })
  } catch (error) {
    console.error('Error saving auction plan:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const seasonId = searchParams.get('seasonId')

    if (!seasonId) {
      return NextResponse.json({ error: 'Season ID required' }, { status: 400 })
    }

    // Get team for this user and season
    const team = await prisma.team.findFirst({
      where: {
        seasonId,
        ownerId: session.user.id,
      },
    })

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    // Delete the plan
    await prisma.auctionPlan.delete({
      where: {
        teamId_seasonId: {
          teamId: team.id,
          seasonId,
        },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting auction plan:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
