import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

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

    // Find the user
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

    // Find the latest password reset request for this user
    const resetRequest = await prisma.password_reset_requests.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }
    })

    if (!resetRequest) {
      return NextResponse.json({
        status: "none",
        message: "No password reset requests found for this account."
      })
    }

    return NextResponse.json({
      status: resetRequest.status,
      requestId: resetRequest.id,
      teamName: resetRequest.teamName,
      createdAt: resetRequest.createdAt,
      reviewedAt: resetRequest.reviewedAt
    })
  } catch (error) {
    console.error("Error checking reset request status:", error)
    return NextResponse.json(
      { error: "Failed to check status" },
      { status: 500 }
    )
  }
}
