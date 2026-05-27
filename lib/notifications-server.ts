import 'server-only' // Enforces compilation environment boundaries

import webpush from 'web-push'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/crypto-server'
import { z } from 'zod'

export const runtime = 'nodejs' // Forces Node.js stack (prevents WebPush from crashing Edge runtime)

function setupVapidDetails(): boolean {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    console.warn('[VAPID Warning] Missing VAPID environment variables. Cannot set VAPID details.');
    return false;
  }
  webpush.setVapidDetails(
    process.env.VAPID_CONTACT_EMAIL || 'mailto:admin@tfc.com',
    publicKey,
    privateKey
  );
  return true;
}

const QuietHoursSchema = z.string().regex(/^\d{2}:\d{2}$/);
const PayloadSchema = z.object({
  title: z.string().min(1).max(60).transform(val => val.replace(/<\/?[^>]+(>|$)/g, "")),
  body: z.string().min(1).max(250).transform(val => val.replace(/<\/?[^>]+(>|$)/g, "")),
  url: z.string().url().optional()
});

function timeToMinutes(hm: string): number {
  const [h, m] = hm.split(':').map(Number);
  return h * 60 + m;
}

export async function sendPushNotificationRaw(userId: string, rawPayload: any, category: 'auctionWins' | 'outbids' | 'trades' | 'general' = 'general') {
  const parsed = PayloadSchema.safeParse(rawPayload);
  if (!parsed.success) return;
  const payload = parsed.data;

  // Initialize VAPID lazily. If keys are missing, write to inbox as a fallback and return early
  if (!setupVapidDetails()) {
    await prisma.notifications_inbox.create({
      data: { userId, title: payload.title, body: payload.body, category, url: payload.url }
    }).catch(() => {});
    return;
  }

  // 1. Fetch User preferences & evaluate Quiet Hours strictly
  const user = await prisma.users.findUnique({
    where: { id: userId },
    select: { notificationPreferences: true, quietHoursStart: true, quietHoursEnd: true }
  });

  const prefs = (user?.notificationPreferences as any) || { auctionWins: true, outbids: true, trades: true, general: true };
  if (!prefs[category]) return;

  // Validate and parse Quiet Hours using precise numeric minute sorting
  if (user?.quietHoursStart && user?.quietHoursEnd) {
    const isStartValid = QuietHoursSchema.safeParse(user.quietHoursStart).success;
    const isEndValid = QuietHoursSchema.safeParse(user.quietHoursEnd).success;

    if (isStartValid && isEndValid) {
      const now = new Date();
      const currentMin = now.getHours() * 60 + now.getMinutes();
      const startMin = timeToMinutes(user.quietHoursStart);
      const endMin = timeToMinutes(user.quietHoursEnd);

      const isMuted = startMin > endMin
        ? (currentMin >= startMin || currentMin <= endMin) // Wraps past midnight (e.g. 23:00 to 07:00)
        : (currentMin >= startMin && currentMin <= endMin); // Same day (e.g. 13:00 to 14:00)

      if (isMuted) {
        // Silent persist into notifications_inbox as historical fallback
        await prisma.notifications_inbox.create({
          data: { userId, title: payload.title, body: payload.body, category, url: payload.url }
        }).catch(() => {});
        return; 
      }
    }
  }

  // 2. Load active devices
  const subscriptions = await prisma.push_subscriptions.findMany({
    where: { userId, isActive: true }
  });

  let pushSucceeded = false;

  const dispatches = subscriptions.map(async (sub) => {
    // Cryptographic decryption before delivery
    const decryptedKeys = {
      p256dh: decrypt(sub.p256dhEnc),
      auth: decrypt(sub.authEnc)
    };

    const subObj = {
      endpoint: sub.endpoint,
      keys: decryptedKeys
    };

    let logStatus = 'SUCCESS';
    let errorMsg = null;

    try {
      await webpush.sendNotification(subObj, JSON.stringify(payload));
      pushSucceeded = true;
    } catch (err: any) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        logStatus = '410_EXPIRED';
        await prisma.push_subscriptions.update({
          where: { id: sub.id },
          data: { isActive: false }
        });
      } else if (err.statusCode === 429) {
        logStatus = '429_RATE_LIMIT';
        errorMsg = 'Rate limited by vendor browser service';
      } else {
        logStatus = 'FAILED';
        errorMsg = err.message || 'Unknown network error';
      }
    }

    // 3. Log Observability logs
    await prisma.push_delivery_log.create({
      data: {
        subscriptionId: sub.id,
        status: logStatus,
        errorMessage: errorMsg,
        category
      }
    }).catch(() => {});
  });

  await Promise.all(dispatches);
  
  // Persistent fallback inbox creation ONLY when push fails on all registered devices
  if (!pushSucceeded) {
    await prisma.notifications_inbox.create({
      data: { userId, title: payload.title, body: payload.body, category, url: payload.url }
    }).catch(() => {});
  }
}
