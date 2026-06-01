import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { sendPushNotificationRaw, getTeamManagerId } from '@/lib/notifications-server';
import { triggerNews } from '@/lib/news/trigger';

/**
 * POST /api/admin/bulk-tiebreakers/[id]/start - Start/activate a bulk tiebreaker
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tiebreakerId = parseInt(id);

    // Check authentication
    const session = await auth();
    if (!session || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'SUB_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get tiebreaker
    const tiebreaker = await prisma.bulk_tiebreakers.findUnique({
      where: { id: tiebreakerId },
      select: {
        id: true,
        status: true,
        basePlayer: {
          select: {
            name: true
          }
        },
        round: {
          select: {
            seasonId: true,
            season: {
              select: {
                name: true
              }
            }
          }
        },
        participants: {
          select: {
            teamId: true
          }
        }
      }
    });

    if (!tiebreaker) {
      return NextResponse.json({ error: 'Tiebreaker not found' }, { status: 404 });
    }

    if (tiebreaker.status !== 'pending') {
      return NextResponse.json(
        { error: `Tiebreaker is already ${tiebreaker.status}` },
        { status: 400 }
      );
    }

    // Update tiebreaker to active
    await prisma.bulk_tiebreakers.update({
      where: { id: tiebreakerId },
      data: {
        status: 'active',
        startTime: new Date()
      }
    });

    try {
      const { emitTiebreakerChange } = await import('@/lib/auction/tiebreaker-events');
      await emitTiebreakerChange(tiebreakerId);
    } catch (e) {
      console.error('Error emitting tiebreaker change event on activation:', e);
    }

    console.log(`✅ Bulk tiebreaker ${tiebreakerId} activated for ${tiebreaker.basePlayer.name}`);

    // Trigger news for bulk tiebreaker creation/start
    try {
      await triggerNews('bulk_tiebreaker_created', {
        season_id: tiebreaker.round.seasonId,
        season_name: tiebreaker.round.season.name,
        metadata: {
          player_name: tiebreaker.basePlayer.name,
          participant_count: tiebreaker.participants.length
        }
      });
    } catch (newsErr) {
      console.warn('[News AI] Failed to generate bulk tiebreaker start news:', newsErr);
    }

    // Notify all participating teams that the bulk tiebreaker is now live
    try {
      const full = await prisma.bulk_tiebreakers.findUnique({
        where: { id: tiebreakerId },
        select: {
          basePlayer: { select: { name: true } },
          participants: { select: { teamId: true } }
        }
      });
      if (full) {
        await Promise.all(full.participants.map(async p => {
          const managerId = await getTeamManagerId(p.teamId);
          if (managerId) {
            await sendPushNotificationRaw(managerId, {
              title: '⚡ Bulk Tiebreaker Live!',
              body: `Tiebreaker for ${full.basePlayer.name} is now open. Submit your bid before time runs out!`,
              url: '/team/auction'
            }, 'auctionWins').catch(() => {});
          }
        }));
      }
    } catch (notifErr) {
      console.warn('[Push] Bulk tiebreaker start notification failed (non-fatal):', notifErr);
    }

    return NextResponse.json({
      success: true,
      message: `Tiebreaker for ${tiebreaker.basePlayer.name} is now active`
    });
  } catch (error) {
    console.error('Start bulk tiebreaker error:', error);
    return NextResponse.json(
      { error: 'Failed to start tiebreaker' },
      { status: 500 }
    );
  }
}
