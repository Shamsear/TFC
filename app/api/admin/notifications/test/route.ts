import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendPushNotificationRaw } from '@/lib/notifications-server'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    
    // Ensure only SUPER_ADMIN or SUB_ADMIN users can access
    if (!session?.user?.id || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'SUB_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { targetUserId, title, body, url, category, isBroadcast } = await req.json()

    if (!title || !body) {
      return NextResponse.json({ error: 'Title and Body are required' }, { status: 400 })
    }

    const payload = { title, body, url }

    if (isBroadcast) {
      // Fetch all users with active subscriptions
      const subscribers = await prisma.push_subscriptions.findMany({
        where: { isActive: true },
        select: { userId: true }
      });

      const uniqueUserIds = Array.from(new Set(subscribers.map(s => s.userId)));

      // Dispatch concurrent raw deliveries
      const dispatches = uniqueUserIds.map(async (userId) => {
        try {
          await sendPushNotificationRaw(userId, payload, category || 'general');
        } catch (err) {
          console.error(`Failed broadcast dispatch for user: ${userId}`, err);
        }
      });

      await Promise.all(dispatches);
      return NextResponse.json({ success: true, count: uniqueUserIds.length });
    } else {
      if (!targetUserId) {
        return NextResponse.json({ error: 'Target User ID required' }, { status: 400 })
      }

      await sendPushNotificationRaw(targetUserId, payload, category || 'general');
      return NextResponse.json({ success: true });
    }
  } catch (error: any) {
    console.error('[API] Test Notification Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
