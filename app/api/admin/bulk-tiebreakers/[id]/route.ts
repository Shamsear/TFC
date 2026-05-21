import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/bulk-tiebreakers/[id] - Get bulk tiebreaker details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await auth();
    if (!session || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'SUB_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const tiebreakerId = parseInt(id);
    if (isNaN(tiebreakerId)) {
      return NextResponse.json({ error: 'Invalid tiebreaker ID' }, { status: 400 });
    }

    // Get tiebreaker details
    const tiebreaker = await prisma.bulk_tiebreakers.findUnique({
      where: { id: tiebreakerId },
      include: {
        basePlayer: {
          select: {
            id: true,
            name: true,
            photoUrl: true
          }
        },
        round: {
          include: {
            season: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        participants: {
          include: {
            team: {
              select: {
                id: true,
                name: true,
                logoUrl: true
              }
            }
          },
          orderBy: {
            currentBid: 'desc'
          }
        },
        bidHistory: {
          include: {
            team: {
              select: {
                name: true,
                logoUrl: true
              }
            }
          },
          orderBy: {
            bidTime: 'desc'
          },
          take: 50
        }
      }
    });

    if (!tiebreaker) {
      return NextResponse.json({ error: 'Tiebreaker not found' }, { status: 404 });
    }

    // Calculate time remaining
    let timeRemaining = null;
    if (tiebreaker.maxEndTime && tiebreaker.status === 'pending') {
      const now = new Date();
      const endTime = new Date(tiebreaker.maxEndTime);
      const diffMs = endTime.getTime() - now.getTime();
      
      if (diffMs > 0) {
        timeRemaining = {
          milliseconds: diffMs,
          seconds: Math.floor(diffMs / 1000),
          minutes: Math.floor(diffMs / (1000 * 60)),
          hours: Math.floor(diffMs / (1000 * 60 * 60))
        };
      }
    }

    return NextResponse.json({
      success: true,
      tiebreaker: {
        ...tiebreaker,
        timeRemaining
      }
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (error) {
    console.error('Get bulk tiebreaker details error:', error);
    return NextResponse.json(
      { error: 'Failed to get tiebreaker details' },
      { status: 500 }
    );
  }
}
