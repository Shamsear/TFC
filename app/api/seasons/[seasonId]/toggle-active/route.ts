import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { logError, extractRequestContext } from "@/lib/logger"
import { createAuditLog } from "@/lib/audit"
import { triggerNews } from "@/lib/news/trigger"

/**
 * PATCH /api/seasons/[seasonId]/toggle-active
 * Toggle season active status (only one season can be active at a time)
 * Restricted to Super Admin role
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ seasonId: string }> }
) {
  const context = extractRequestContext(request)
  const { seasonId } = await params
  
  try {
    // Check authentication
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in to continue." },
        { status: 401 }
      )
    }

    // Check Super Admin role
    if (session.user.role !== "SUPER_ADMIN") {
      logError(
        "Forbidden access attempt to toggle season status",
        new Error("Non-super-admin attempted season toggle"),
        { ...context, userId: session.user.id, userRole: session.user.role }
      )
      
      return NextResponse.json(
        { error: "Forbidden: Super Admin access required" },
        { status: 403 }
      )
    }

    // Get current season
    const currentSeason = await prisma.seasons.findUnique({
      where: { id: seasonId }
    })

    if (!currentSeason) {
      return NextResponse.json(
        { error: "Season not found" },
        { status: 404 }
      )
    }

    const newActiveStatus = !currentSeason.isActive

    // If activating this season, deactivate all others
    if (newActiveStatus) {
      await prisma.seasons.updateMany({
        where: { 
          id: { not: seasonId },
          isActive: true
        },
        data: { 
          isActive: false,
          updatedAt: new Date()
        }
      })
    }

    // Update the target season
    const updatedSeason = await prisma.seasons.update({
      where: { id: seasonId },
      data: { 
        isActive: newActiveStatus,
        updatedAt: new Date()
      },
      include: {
        seasonTeams: {
          include: {
            team: true
          }
        },
        transferHistory: true,
        seasonalPlayerStats: true
      }
    })

    // Create audit log
    await createAuditLog({
      userId: session.user.id,
      userEmail: session.user.email!,
      userRole: session.user.role!,
      action: newActiveStatus ? 'ACTIVATE_SEASON' : 'DEACTIVATE_SEASON',
      entityType: 'season',
      entityId: updatedSeason.id,
      entityName: updatedSeason.name,
      seasonId: updatedSeason.id,
      details: {
        previousStatus: currentSeason.isActive,
        newStatus: newActiveStatus
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    })

    // Generate AI news for season activation
    if (newActiveStatus) {
      try {
        await triggerNews('season_activated', {
          season_id: updatedSeason.id,
          season_name: updatedSeason.name,
          metadata: {
            team_count: updatedSeason.seasonTeams.length,
            player_count: updatedSeason.seasonalPlayerStats.length,
            starting_purse: updatedSeason.startingPurse
          }
        });
      } catch (newsErr) {
        console.warn('[News AI] Failed to generate season activation news:', newsErr);
      }
    }

    return NextResponse.json(updatedSeason)
  } catch (error) {
    logError("Failed to toggle season status", error, context)
    
    return NextResponse.json(
      { error: "Failed to toggle season status. Please try again later." },
      { status: 500 }
    )
  }
}
