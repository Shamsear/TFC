import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { hash } from "bcryptjs"
import { generateAuditId } from "@/lib/id-generator"

export async function POST(request: NextRequest) {
  try {
    const { requestId, newPassword } = await request.json()

    if (!requestId) {
      return NextResponse.json(
        { error: "Request ID is required" },
        { status: 400 }
      )
    }

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      )
    }

    // Find the request and verify it is approved
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

    if (resetRequest.status !== "approved") {
      return NextResponse.json(
        { error: `This request cannot be completed (Current status: ${resetRequest.status})` },
        { status: 400 }
      )
    }

    const passwordHash = await hash(newPassword, 10)

    // Update user's password in a transaction
    await prisma.$transaction([
      // Update password
      prisma.users.update({
        where: { id: resetRequest.userId },
        data: {
          passwordHash,
          mustChangePassword: false // Clear flag on manual admin-approved reset
        }
      }),
      // Mark request as completed
      prisma.password_reset_requests.update({
        where: { id: requestId },
        data: {
          status: "completed",
          updatedAt: new Date()
        }
      })
    ])

    // Create audit log
    await prisma.audit_logs.create({
      data: {
        id: await generateAuditId(),
        userId: resetRequest.userId,
        userEmail: resetRequest.user.email || "",
        userRole: resetRequest.user.role,
        action: "PASSWORD_RESET_COMPLETED",
        entityType: "USER",
        entityId: resetRequest.userId,
        entityName: resetRequest.user.name || resetRequest.user.email,
        details: JSON.stringify({
          requestId,
          message: "User successfully reset their password via approved reset request"
        }),
        ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown",
        userAgent: request.headers.get("user-agent") || "unknown",
      },
    })

    return NextResponse.json({
      message: "Password reset successfully! You can now log in with your new password.",
    })
  } catch (error) {
    console.error("Error executing password reset:", error)
    return NextResponse.json(
      { error: "Failed to reset password" },
      { status: 500 }
    )
  }
}
