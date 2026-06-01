import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { createAuditLog } from '@/lib/audit'
import { generateUserId } from '@/lib/id-generator'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session || session.user?.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, email, password, assignedSeasons, createdBy } = body

    // Validate required fields
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.users.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }

    // Hash password with bcrypt (cost 12, $2b$ prefix)
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create sub-admin and season assignments in a transaction
    const userId = await generateUserId()
    
    await prisma.$transaction(async (tx) => {
      // Create the user
      await tx.users.create({
        data: {
          id: userId,
          name,
          email,
          passwordHash: hashedPassword,
          role: 'SUB_ADMIN',
          createdBy: createdBy,
          isActive: true
        }
      })

      // Create season assignments
      if (assignedSeasons && assignedSeasons.length > 0) {
        await tx.sub_admin_seasons.createMany({
          data: assignedSeasons.map((seasonId: string) => ({
            userId: userId,
            seasonId: seasonId
          }))
        })
      }
    })

    // Create audit log
    await createAuditLog({
      userId: session.user.id!,
      userEmail: session.user.email!,
      userRole: session.user.role!,
      action: 'CREATE_SUB_ADMIN',
      entityType: 'USER',
      entityId: userId,
      entityName: name,
      details: {
        email,
        assignedSeasons: assignedSeasons || []
      },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined
    })

    return NextResponse.json({
      success: true,
      userId
    })
  } catch (error) {
    console.error('Error creating sub-admin:', error)
    return NextResponse.json(
      { error: 'Failed to create sub-admin' },
      { status: 500 }
    )
  }
}
