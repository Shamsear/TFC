import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized: Super admin access required" },
        { status: 401 }
      )
    }

    // Retrieve all password reset requests
    const requests = await prisma.password_reset_requests.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          }
        },
        reviewer: {
          select: {
            id: true,
            email: true,
            name: true,
          }
        }
      }
    })

    return NextResponse.json(requests)
  } catch (error) {
    console.error("Error retrieving reset requests:", error)
    return NextResponse.json(
      { error: "Failed to retrieve reset requests" },
      { status: 500 }
    )
  }
}
