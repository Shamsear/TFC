import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    // 1. Delete all push subscriptions
    await prisma.push_subscriptions.deleteMany({
      where: { userId: session.user.id }
    });
    // 2. Wipe in-app persistence
    await prisma.notifications_inbox.deleteMany({
      where: { userId: session.user.id }
    });

    return NextResponse.json({ success: true, message: 'All notification tracking records wiped.' });
  } catch (error) {
    return NextResponse.json({ error: 'Erasure operation failed' }, { status: 500 });
  }
}
