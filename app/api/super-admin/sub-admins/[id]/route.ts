import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session || session.user?.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { name, isActive, assignedSeasons } = body

    // Get current user data
    const currentUserResult = await prisma.$queryRawUnsafe<any[]>(`
      SELECT id, name, email, role, is_active, assigned_seasons
      FROM users 
      WHERE id = $1
    `, id)

    if (!currentUserResult || currentUserResult.length === 0) {
      return NextResponse.json({ error: 'Sub-admin not found' }, { status: 404 })
    }

    const currentUser = currentUserResult[0]
    if (currentUser.role !== 'SUB_ADMIN') {
      return NextResponse.json({ error: 'Can only update sub-admin accounts' }, { status: 400 })
    }

    // Update sub-admin
    await prisma.$executeRaw`
      UPDATE users
      SET 
        name = ${name},
        is_active = ${isActive},
        assigned_seasons = ${JSON.stringify(assignedSeasons)},
        updated_at = NOW()
      WHERE id = ${id}
    `

    // Track changes
    const changes: any = {}
    if (currentUser.name !== name) changes.name = { from: currentUser.name, to: name }
    if (currentUser.is_active !== isActive) changes.isActive = { from: currentUser.is_active, to: isActive }
    
    // Create audit log
    await createAuditLog({
      userId: session.user.id!,
      userEmail: session.user.email!,
      userRole: session.user.role!,
      action: 'UPDATE_SUB_ADMIN',
      entityType: 'user',
      entityId: id,
      entityName: name,
      details: {
        changes,
        assignedSeasons
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Sub-admin updated successfully'
    })
  } catch (error: any) {
    console.error('Error updating sub-admin:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to update sub-admin' 
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session || session.user?.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Get user data before deactivation
    const user = await prisma.users.findUnique({
      where: { id }
    })

    if (!user) {
      return NextResponse.json({ error: 'Sub-admin not found' }, { status: 404 })
    }

    if (user.role !== 'SUB_ADMIN') {
      return NextResponse.json({ error: 'Can only deactivate sub-admin accounts' }, { status: 400 })
    }

    // Deactivate instead of delete
    await prisma.$executeRaw`
      UPDATE users
      SET is_active = false, updated_at = NOW()
      WHERE id = ${id}
    `

    // Create audit log
    await createAuditLog({
      userId: session.user.id!,
      userEmail: session.user.email!,
      userRole: session.user.role!,
      action: 'DEACTIVATE_SUB_ADMIN',
      entityType: 'user',
      entityId: id,
      entityName: user.name || 'Unknown User',
      details: {
        email: user.email,
        reason: 'Deactivated by super admin'
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Sub-admin deactivated successfully'
    })
  } catch (error: any) {
    console.error('Error deactivating sub-admin:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to deactivate sub-admin' 
    }, { status: 500 })
  }
}
