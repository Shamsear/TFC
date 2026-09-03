import { prisma } from '@/lib/prisma';
import { sendPushNotificationRaw, getTeamManagerId } from '@/lib/notifications-server';

/**
 * Auto-starts draft rounds whose scheduled startTime has arrived or passed (startTime <= now).
 */
export async function autoStartScheduledRounds(seasonId?: string): Promise<number> {
  try {
    const now = new Date();
    const where: any = {
      status: 'draft',
      startTime: {
        not: null,
        lte: now
      }
    };

    if (seasonId) {
      where.seasonId = seasonId;
    }

    const draftRounds = await prisma.rounds.findMany({
      where,
      select: {
        id: true,
        seasonId: true,
        roundNumber: true,
        position: true,
        durationSeconds: true,
        startTime: true,
        endTime: true
      }
    });

    let startedCount = 0;

    for (const round of draftRounds) {
      const startTime = now;
      let endTime: Date;

      if (round.endTime && new Date(round.endTime) > now) {
        endTime = new Date(round.endTime);
      } else {
        endTime = new Date(startTime.getTime() + (round.durationSeconds * 1000));
      }

      const updatedDurationSeconds = Math.max(1, Math.round((endTime.getTime() - startTime.getTime()) / 1000));

      const lockResult = await prisma.rounds.updateMany({
        where: {
          id: round.id,
          status: 'draft'
        },
        data: {
          status: 'active',
          startTime,
          endTime,
          durationSeconds: updatedDurationSeconds
        }
      });

      if (lockResult.count > 0) {
        startedCount++;

        // Notify managers via push notification
        try {
          const seasonTeams = await prisma.season_teams.findMany({
            where: { seasonId: round.seasonId },
            select: { teamId: true }
          });
          const managerIds = (await Promise.all(seasonTeams.map(st => getTeamManagerId(st.teamId)))).filter(Boolean) as string[];

          await Promise.all(managerIds.map(userId =>
            sendPushNotificationRaw(userId, {
              title: '🔥 New Round Open',
              body: `Round ${round.roundNumber}${round.position ? ` (${round.position})` : ''} is now open for bidding!`,
              url: '/team/auction'
            }, 'general').catch(() => {})
          ));
        } catch (notifErr) {
          console.warn('[Push] Auto round open notification failed (non-fatal):', notifErr);
        }
      }
    }

    return startedCount;
  } catch (error) {
    console.error('Error in autoStartScheduledRounds:', error);
    return 0;
  }
}
