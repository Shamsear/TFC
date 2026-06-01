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
    const currentUser = await prisma.users.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        subAdminSeasons: {
          select: { seasonId: true }
        }
      }
    })

    if (!currentUser) {
      return NextResponse.json({ error: 'Sub-admin not found' }, { status: 404 })
    }

    if (currentUser.role !== 'SUB_ADMIN') {
      return NextResponse.json({ error: 'Can only update sub-admin accounts' }, { status: 400 })
    }

    // Update sub-admin and season assignments in a transaction
    await prisma.$transaction(async (tx) => {
      // Update user
      await tx.users.update({
        where: { id },
        data: {
          name,
          isActive
        }
      })

      // Delete existing season assignments
      await tx.sub_admin_seasons.deleteMany({
        where: { userId: id }
      })

      // Create new season assignments
      if (assignedSeasons && assignedSeasons.length > 0) {
        await tx.sub_admin_seasons.createMany({
          data: assignedSeasons.map((seasonId: string) => ({
            userId: id,
            seasonId: seasonId
          }))
        })
      }
    })

    // Track changes
    const changes: any = {}
    if (currentUser.name !== name) changes.name = { from: currentUser.name, to: name }
    if (currentUser.isActive !== isActive) changes.isActive = { from: currentUser.isActive, to: isActive }
    
    const oldSeasonIds = currentUser.subAdminSeasons.map(s => s.seasonId).sort()
    const newSeasonIds = [...assignedSeasons].sort()
    if (JSON.stringify(oldSeasonIds) !== JSON.stringify(newSeasonIds)) {
      changes.assignedSeasons = { from: oldSeasonIds, to: newSeasonIds }
    }
    
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
    await prisma.users.update({
      where: { id },
      data: { isActive: false }
    })

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
