import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { checkAdminRole } from "@/lib/auth-utils"

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ seasonId: string; windowId: string }> }
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

    const { seasonId, windowId } = await context.params
    const body = await request.json()
    const { name, startDate, endDate, status, swapLimit } = body

    if (status === 'ACTIVE') {
      await prisma.swap_windows.updateMany({
        where: { seasonId, status: 'ACTIVE', NOT: { id: windowId } },
        data: { status: 'CLOSED' }
      })
    }

    const window = await prisma.swap_windows.update({
      where: { id: windowId, seasonId },
      data: {
        ...(name && { name }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate && { endDate: new Date(endDate) }),
        ...(status && { status }),
        ...(swapLimit !== undefined && { swapLimit: Number(swapLimit) })
      }
    })

    // Log the action
    await prisma.audit_logs.create({
      data: {
        id: crypto.randomUUID(),
        userId: session.user.id,
        userEmail: session.user.email || 'unknown',
        userRole: session.user.role || 'unknown',
        action: 'UPDATE_SWAP_WINDOW',
        entityType: 'SWAP_WINDOW',
        entityId: window.id,
        entityName: window.name,
        seasonId,
        details: JSON.stringify(body)
      }
    })

    return NextResponse.json(window)
  } catch (error) {
    console.error("[SWAP_WINDOW_PATCH]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ seasonId: string; windowId: string }> }
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

    const { seasonId, windowId } = await context.params

    const window = await prisma.swap_windows.findUnique({
      where: { id: windowId, seasonId },
      include: {
        _count: {
          select: { swapRequests: true }
        }
      }
    })

    if (!window) {
      return new NextResponse("Not found", { status: 404 })
    }

    if (window._count.swapRequests > 0) {
      return new NextResponse("Cannot delete a window that has swap requests attached", { status: 400 })
    }

    await prisma.swap_windows.delete({
      where: { id: windowId, seasonId }
    })

    // Log the action
    await prisma.audit_logs.create({
      data: {
        id: crypto.randomUUID(),
        userId: session.user.id,
        userEmail: session.user.email || 'unknown',
        userRole: session.user.role || 'unknown',
        action: 'DELETE_SWAP_WINDOW',
        entityType: 'SWAP_WINDOW',
        entityId: window.id,
        entityName: window.name,
        seasonId
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[SWAP_WINDOW_DELETE]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
