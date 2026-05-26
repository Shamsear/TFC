import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { checkAdminRole } from "@/lib/auth-utils"
import { generateIds } from "@/lib/id-generator"

export async function GET(
  request: Request,
  { params }: { params: { seasonId: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { seasonId } = await params

    const windows = await prisma.swap_windows.findMany({
      where: { seasonId },
      orderBy: { startDate: 'asc' },
      include: {
        _count: {
          select: { swapRequests: true }
        }
      }
    })

    return NextResponse.json(windows)
  } catch (error) {
    console.error("[SWAP_WINDOWS_GET]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: { seasonId: string } }
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

    const { seasonId } = await params
    const body = await request.json()
    const { name, startDate, endDate, status, swapLimit } = body

    if (!name || !startDate || !endDate) {
      return new NextResponse("Missing required fields", { status: 400 })
    }

    const [windowId] = await generateIds('TFCSW', 1)

    const window = await prisma.swap_windows.create({
      data: {
        id: windowId,
        seasonId,
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        status: status || 'UPCOMING',
        swapLimit: swapLimit !== undefined ? Number(swapLimit) : 5
      }
    })

    // Log the action
    await prisma.audit_logs.create({
      data: {
        id: crypto.randomUUID(),
        userId: session.user.id,
        userEmail: session.user.email || 'unknown',
        userRole: session.user.role || 'unknown',
        action: 'CREATE_SWAP_WINDOW',
        entityType: 'SWAP_WINDOW',
        entityId: window.id,
        entityName: window.name,
        seasonId,
        details: JSON.stringify(window)
      }
    })

    return NextResponse.json(window)
  } catch (error) {
    console.error("[SWAP_WINDOWS_POST]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
