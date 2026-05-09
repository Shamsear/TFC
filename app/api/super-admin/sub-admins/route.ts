import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'
import { generateUserId } from '@/lib/id-generator'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session || session.user?.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, email, password, isActive, assignedSeasons, createdBy } = body

    // Validate required fields
    if (!name || !email || !password || !assignedSeasons || assignedSeasons.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Check if email already exists
    const existingUser = await prisma.users.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Generate clean user ID
    const userId = await generateUserId()
    
    const newUser = await prisma.users.create({
      data: {
        id: userId,
        name,
        email,
        passwordHash: hashedPassword,
        role: 'SUB_ADMIN',
        createdBy: createdBy,
        isActive: isActive,
        assignedSeasons: assignedSeasons
      }
    })

    // Create audit log
    await createAuditLog({
      userId: session.user.id!,
      userEmail: session.user.email!,
      userRole: session.user.role!,
      action: 'CREATE_SUB_ADMIN',
      entityType: 'user',
      entityId: userId,
      entityName: name,
      details: {
        email,
        assignedSeasons,
        isActive
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Sub-admin created successfully',
      userId 
    })
  } catch (error: any) {
    console.error('Error creating sub-admin:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to create sub-admin' 
    }, { status: 500 })
  }
}
