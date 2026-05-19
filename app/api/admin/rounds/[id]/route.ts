import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

/**
 * GET /api/admin/rounds/[id] - Get round details
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

    const { id: roundId } = await params;

    // Fetch round with related data
    const round = await prisma.rounds.findUnique({
      where: { id: roundId },
      include: {
        season: {
          select: {
            id: true,
            name: true,
            seasonNumber: true
          }
        },
        teamRoundBids: {
          select: {
            teamId: true,
            submitted: true,
            bidCount: true,
            lastUpdated: true,
            submittedAt: true
          }
        },
        tiebreakers: {
          select: {
            id: true,
            basePlayerId: true,
            originalAmount: true,
            tiedTeamsCount: true,
            status: true,
            winningTeamId: true,
            winningBid: true,
            basePlayer: {
              select: {
                name: true,
                photoUrl: true
              }
            },
            teamTiebreakerBids: {
              select: {
                id: true,
                teamId: true,
                submitted: true,
                oldBidAmount: true,
                newBidAmount: true
              }
            }
          }
        },
        _count: {
          select: {
            teamRoundBids: true,
            tiebreakers: true
          }
        }
      }
    });

    if (!round) {
      return NextResponse.json({ error: 'Round not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      round
    });
  } catch (error) {
    console.error('Get round error:', error);
    return NextResponse.json(
      { error: 'Failed to get round details' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/rounds/[id] - Update round
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await auth();
    if (!session || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'SUB_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: roundId } = await params;
    const body = await request.json();

    // Check if round exists
    const existingRound = await prisma.rounds.findUnique({
      where: { id: roundId }
    });

    if (!existingRound) {
      return NextResponse.json({ error: 'Round not found' }, { status: 404 });
    }

    // Only allow updates if round is in draft or active status
    if (!['draft', 'active'].includes(existingRound.status)) {
      return NextResponse.json(
        { error: 'Can only update rounds in draft or active status' },
        { status: 400 }
      );
    }

    // Build update data
    const updateData: any = {
      maxBidsPerTeam: body.maxBidsPerTeam,
      basePrice: body.basePrice,
      finalizationMode: body.finalizationMode
    };

    // Only update position if provided (for draft rounds)
    if (body.position !== undefined) {
      updateData.position = body.position;
    }

    // Update round
    const updatedRound = await prisma.rounds.update({
      where: { id: roundId },
      data: updateData
    });

    return NextResponse.json({
      success: true,
      round: updatedRound
    });
  } catch (error) {
    console.error('Update round error:', error);
    return NextResponse.json(
      { error: 'Failed to update round' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/rounds/[id] - Delete round
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await auth();
    if (!session || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: roundId } = await params;

    // Check if round exists
    const existingRound = await prisma.rounds.findUnique({
      where: { id: roundId }
    });

    if (!existingRound) {
      return NextResponse.json({ error: 'Round not found' }, { status: 404 });
    }

    // Only allow deletion if round is in draft status
    if (existingRound.status !== 'draft') {
      return NextResponse.json(
        { error: 'Can only delete rounds in draft status' },
        { status: 400 }
      );
    }

    // Delete round (cascade will delete related records)
    await prisma.rounds.delete({
      where: { id: roundId }
    });

    return NextResponse.json({
      success: true,
      message: 'Round deleted successfully'
    });
  } catch (error) {
    console.error('Delete round error:', error);
    return NextResponse.json(
      { error: 'Failed to delete round' },
      { status: 500 }
    );
  }
}
