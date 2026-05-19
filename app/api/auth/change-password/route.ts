import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hash } from "bcryptjs"
import { generateAuditId } from "@/lib/id-generator"

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { newPassword } = await request.json()

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      )
    }

    const passwordHash = await hash(newPassword, 10)

    // Update user's password and reset mustChangePassword flag
    const updatedUser = await prisma.users.update({
      where: { id: session.user.id },
      data: {
        passwordHash,
        mustChangePassword: false,
      },
    })

    // Create audit log
    await prisma.audit_logs.create({
      data: {
        id: await generateAuditId(),
        userId: session.user.id,
        userEmail: session.user.email || "",
        userRole: session.user.role,
        action: "PASSWORD_CHANGE",
        entityType: "USER",
        entityId: session.user.id,
        entityName: updatedUser.name || updatedUser.email,
        details: JSON.stringify({
          message: "User successfully changed initial password"
        }),
        ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown",
        userAgent: request.headers.get("user-agent") || "unknown",
      },
    })

    return NextResponse.json({
      message: "Password changed successfully",
    })
  } catch (error) {
    console.error("Error changing password:", error)
    return NextResponse.json(
      { error: "Failed to change password" },
      { status: 500 }
    )
  }
}
