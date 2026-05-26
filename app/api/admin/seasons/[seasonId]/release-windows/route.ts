import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"
import { checkAdminRole } from "@/lib/auth-utils"
import { generateIds } from "@/lib/id-generator"

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ seasonId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { seasonId } = await context.params

    const windows = await prisma.release_windows.findMany({
      where: { seasonId },
      orderBy: { startDate: 'asc' },
      include: {
        _count: {
          select: { releaseRequests: true }
        }
      }
    })

    return NextResponse.json(windows)
  } catch (error) {
    console.error("[RELEASE_WINDOWS_GET]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ seasonId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const isAdmin = await checkAdminRole(session.user.id)
    if (!isAdmin) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    const { seasonId } = await context.params
    const body = await request.json()
    const { name, startDate, endDate, status, releaseLimit } = body

    if (!name || !startDate || !endDate) {
      return new NextResponse("Missing required fields", { status: 400 })
    }

    const [windowId] = await generateIds('TFCRW', 1)

    const window = await prisma.release_windows.create({
      data: {
        id: windowId,
        seasonId,
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        status: status || 'UPCOMING',
        releaseLimit: releaseLimit !== undefined ? Number(releaseLimit) : 3
      }
    })

    // Log the action
    await prisma.audit_logs.create({
      data: {
        id: crypto.randomUUID(),
        userId: session.user.id,
        userEmail: session.user.email || 'unknown',
        userRole: session.user.role || 'unknown',
        action: 'CREATE_RELEASE_WINDOW',
        entityType: 'RELEASE_WINDOW',
        entityId: window.id,
        entityName: window.name,
        seasonId,
        details: JSON.stringify(window)
      }
    })

    return NextResponse.json(window)
  } catch (error) {
    console.error("[RELEASE_WINDOWS_POST]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
