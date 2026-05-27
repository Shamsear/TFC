import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { encrypt } from '@/lib/crypto-server'

const MAX_DEVICES_LIMIT = 10;

const SubscriptionSchema = z.object({
  subscription: z.object({
    endpoint: z.string().url(),
    keys: z.object({
      p256dh: z.string().min(10),
      auth: z.string().min(5)
    })
  }),
  deviceName: z.string().min(1).max(100),
  deviceType: z.string().min(1).max(50)
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const parsed = SubscriptionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.format() }, { status: 400 })
    }

    const { subscription, deviceName, deviceType } = parsed.data

    // 1. Device Limit Validation
    const activeDevices = await prisma.push_subscriptions.count({
      where: { userId: session.user.id, isActive: true }
    });

    if (activeDevices >= MAX_DEVICES_LIMIT) {
      return NextResponse.json({ 
        error: `Limit reached. Max ${MAX_DEVICES_LIMIT} registered devices allowed.` 
      }, { status: 429 });
    }

    // 2. Encryption before DB write
    const p256dhEnc = encrypt(subscription.keys.p256dh);
    const authEnc = encrypt(subscription.keys.auth);

    const saved = await prisma.push_subscriptions.upsert({
      where: { endpoint: subscription.endpoint },
      update: {
        userId: session.user.id,
        deviceName,
        deviceType,
        p256dhEnc,
        authEnc,
        isActive: true,
        lastUsedAt: new Date(),
      },
      create: {
        userId: session.user.id,
        deviceName,
        deviceType,
        endpoint: subscription.endpoint,
        p256dhEnc,
        authEnc,
      }
    });

    return NextResponse.json({ success: true, deviceId: saved.id }, {
      headers: { 'Cache-Control': 'no-store' }
    });
  } catch (error) {
    return NextResponse.json({ error: 'Subscription failed' }, { status: 500 })
  }
}
