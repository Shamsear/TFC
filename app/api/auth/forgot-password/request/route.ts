import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import crypto from "crypto"

export async function POST(request: NextRequest) {
  try {
    const { identity } = await request.json()

    if (!identity || identity.trim() === "") {
      return NextResponse.json(
        { error: "Please enter your team name, username, or email" },
        { status: 400 }
      )
    }

    const queryValue = identity.trim()

    // Find the user by email, username, or assigned team name
    const user = await prisma.users.findFirst({
      where: {
        OR: [
          { email: { equals: queryValue, mode: 'insensitive' } },
          { name: { equals: queryValue, mode: 'insensitive' } },
          { team: { name: { equals: queryValue, mode: 'insensitive' } } }
        ]
      },
      include: {
        team: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: "No account found matching that team name, email, or username" },
        { status: 404 }
      )
    }

    // Check if there is already a pending request
    const existingRequest = await prisma.password_reset_requests.findFirst({
      where: {
        userId: user.id,
        status: { in: ["pending", "approved"] }
      },
      orderBy: { createdAt: 'desc' }
    })

    if (existingRequest) {
      if (existingRequest.status === "pending") {
        return NextResponse.json({
          status: "pending",
          message: "A password reset request is already pending Super Admin approval.",
          requestId: existingRequest.id
        })
      } else if (existingRequest.status === "approved") {
        return NextResponse.json({
          status: "approved",
          message: "Your reset request has been approved! You can now proceed to reset your password.",
          requestId: existingRequest.id
        })
      }
    }

    // Create a new request
    const requestId = `TFCPRR-${crypto.randomUUID()}`
    const teamName = user.team?.name || user.name || "Admin/Staff"

    await prisma.password_reset_requests.create({
      data: {
        id: requestId,
        userId: user.id,
        teamName: teamName,
        status: "pending"
      }
    })

    return NextResponse.json({
      status: "pending",
      message: "Password reset request submitted successfully. Please contact your Super Admin for approval.",
      requestId
    })
  } catch (error) {
    console.error("Error creating reset request:", error)
    return NextResponse.json(
      { error: "Failed to submit request" },
      { status: 500 }
    )
  }
}
