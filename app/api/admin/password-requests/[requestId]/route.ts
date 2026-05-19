import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { generateAuditId } from "@/lib/id-generator"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const { requestId } = await params
    const session = await auth()

    if (!session?.user || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized: Super admin access required" },
        { status: 401 }
      )
    }

    const { status } = await request.json()

    if (status !== "approved" && status !== "declined") {
      return NextResponse.json(
        { error: "Invalid status. Must be approved or declined" },
        { status: 400 }
      )
    }

    // Check if the request exists
    const resetRequest = await prisma.password_reset_requests.findUnique({
      where: { id: requestId },
      include: { user: true }
    })

    if (!resetRequest) {
      return NextResponse.json(
        { error: "Reset request not found" },
        { status: 404 }
      )
    }

    if (resetRequest.status !== "pending") {
      return NextResponse.json(
        { error: `Request has already been reviewed (Current status: ${resetRequest.status})` },
        { status: 400 }
      )
    }

    // Update the request status
    const updatedRequest = await prisma.password_reset_requests.update({
      where: { id: requestId },
      data: {
        status,
        reviewedBy: session.user.id,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      }
    })

    // Create audit log
    await prisma.audit_logs.create({
      data: {
        id: await generateAuditId(),
        userId: session.user.id,
        userEmail: session.user.email || "",
        userRole: session.user.role,
        action: `PASSWORD_RESET_${status.toUpperCase()}`,
        entityType: "PASSWORD_RESET_REQUEST",
        entityId: requestId,
        entityName: resetRequest.teamName,
        details: JSON.stringify({
          userId: resetRequest.userId,
          userEmail: resetRequest.user.email,
          status,
          reviewedBy: session.user.email,
        }),
        ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown",
        userAgent: request.headers.get("user-agent") || "unknown",
      },
    })

    return NextResponse.json({
      message: `Password reset request ${status} successfully.`,
      request: updatedRequest
    })
  } catch (error) {
    console.error("Error updating reset request status:", error)
    return NextResponse.json(
      { error: "Failed to update reset request status" },
      { status: 500 }
    )
  }
}
