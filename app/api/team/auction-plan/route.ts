import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { encrypt, decrypt } from '@/lib/encryption'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.teamId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const seasonId = searchParams.get('seasonId')

    if (!seasonId) {
      return NextResponse.json({ error: 'Season ID required' }, { status: 400 })
    }

    // Get the season team
    const seasonTeam = await prisma.season_teams.findFirst({
      where: {
        teamId: session.user.teamId,
        seasonId: seasonId,
      },
    })

    if (!seasonTeam) {
      return NextResponse.json({ error: 'Team not found in season' }, { status: 404 })
    }

    // Get encrypted plan
    const auctionPlan = await prisma.auction_plans.findUnique({
      where: {
        season_team_id_season_id: {
          season_team_id: seasonTeam.id,
          season_id: seasonId,
        },
      },
    })

    if (!auctionPlan) {
      return NextResponse.json({ plan: null }, { status: 200 })
    }

    // Decrypt the plan
    const decryptedPlan = decrypt(auctionPlan.encrypted_plan_data)

    return NextResponse.json({
      plan: JSON.parse(decryptedPlan),
      lastUpdated: auctionPlan.last_updated,
    })
  } catch (error) {
    console.error('Error fetching auction plan:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.teamId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { seasonId, plan } = body

    if (!seasonId || !plan) {
      return NextResponse.json({ error: 'Season ID and plan required' }, { status: 400 })
    }

    // Get the season team
    const seasonTeam = await prisma.season_teams.findFirst({
      where: {
        teamId: session.user.teamId,
        seasonId: seasonId,
      },
    })

    if (!seasonTeam) {
      return NextResponse.json({ error: 'Team not found in season' }, { status: 404 })
    }

    // Encrypt the plan
    const encryptedPlan = encrypt(JSON.stringify(plan))

    // Upsert the plan
    const auctionPlan = await prisma.auction_plans.upsert({
      where: {
        season_team_id_season_id: {
          season_team_id: seasonTeam.id,
          season_id: seasonId,
        },
      },
      update: {
        encrypted_plan_data: encryptedPlan,
      },
      create: {
        season_team_id: seasonTeam.id,
        season_id: seasonId,
        team_id: session.user.teamId,
        encrypted_plan_data: encryptedPlan,
      },
    })

    return NextResponse.json({
      success: true,
      lastUpdated: auctionPlan.last_updated,
    })
  } catch (error) {
    console.error('Error saving auction plan:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.teamId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const seasonId = searchParams.get('seasonId')

    if (!seasonId) {
      return NextResponse.json({ error: 'Season ID required' }, { status: 400 })
    }

    // Get the season team
    const seasonTeam = await prisma.season_teams.findFirst({
      where: {
        teamId: session.user.teamId,
        seasonId: seasonId,
      },
    })

    if (!seasonTeam) {
      return NextResponse.json({ error: 'Team not found in season' }, { status: 404 })
    }

    // Delete the plan
    await prisma.auction_plans.delete({
      where: {
        season_team_id_season_id: {
          season_team_id: seasonTeam.id,
          season_id: seasonId,
        },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting auction plan:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
