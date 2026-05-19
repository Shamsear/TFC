import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import * as XLSX from 'xlsx';

/**
 * GET /api/admin/rounds/[id]/export - Export round results to Excel
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'SUB_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: roundId } = await params;

    // Get round details
    const round = await prisma.rounds.findUnique({
      where: { id: roundId },
      select: {
        id: true,
        roundNumber: true,
        position: true,
        status: true,
        seasonId: true,
        season: {
          select: {
            name: true
          }
        }
      }
    });

    if (!round) {
      return NextResponse.json({ error: 'Round not found' }, { status: 404 });
    }

    // Check if round is finalized or preview_finalized
    if (round.status !== 'completed' && round.status !== 'preview_finalized') {
      return NextResponse.json(
        { error: 'Round must be completed or preview_finalized to export' },
        { status: 400 }
      );
    }

    let exportData: any[] = [];

    if (round.status === 'completed') {
      // Get data from transfer_history
      const transfers = await prisma.transfer_history.findMany({
        where: {
          roundId: roundId
        },
        include: {
          basePlayer: {
            include: {
              seasonalPlayerStats: {
                where: {
                  seasonId: round.seasonId
                },
                select: {
                  position: true,
                  overallRating: true
                }
              }
            }
          },
          team: {
            select: {
              name: true
            }
          }
        },
        orderBy: {
          soldPrice: 'desc'
        }
      });

      // Get original bids from team_round_bids
      const teamBids = await prisma.team_round_bids.findMany({
        where: {
          roundId: roundId
        },
        select: {
          teamId: true,
          encryptedBids: true
        }
      });

      // Decrypt and build a map of player -> team -> original bid
      const { decryptBids } = await import('@/lib/auction/encryption');
      const originalBidsMap = new Map<string, Map<string, number>>();

      for (const tb of teamBids) {
        try {
          const decrypted = decryptBids(tb.encryptedBids);
          const parsed = JSON.parse(decrypted);
          
          for (const bid of parsed.bids || []) {
            if (!originalBidsMap.has(bid.base_player_id)) {
              originalBidsMap.set(bid.base_player_id, new Map());
            }
            originalBidsMap.get(bid.base_player_id)!.set(tb.teamId, bid.amount);
          }
        } catch (error) {
          console.error(`Failed to decrypt bids for team ${tb.teamId}:`, error);
        }
      }

      exportData = transfers.map(transfer => {
        const stats = transfer.basePlayer.seasonalPlayerStats[0];
        const originalBid = originalBidsMap.get(transfer.basePlayerId)?.get(transfer.teamId) || transfer.soldPrice;
        
        return {
          'Player Name': transfer.basePlayer.name,
          'Position': stats?.position || 'N/A',
          'Overall Rating': stats?.overallRating || 'N/A',
          'Team Name': transfer.team.name,
          'Final Bid Amount': transfer.soldPrice,
          'Status': round.status,
          'Phase': transfer.acquisitionType === 'tiebreaker_won' 
            ? 'Tiebreaker' 
            : transfer.acquisitionType === 'auto_assigned'
              ? 'Auto-assigned'
              : 'Normal Bidding',
          'Original Bid Amount': originalBid,
          'Notes': transfer.acquisitionNotes || 'N/A'
        };
      });
    } else if (round.status === 'preview_finalized') {
      // Get data from preview_allocations
      const previewAllocations = await prisma.preview_allocations.findMany({
        where: {
          roundId: roundId
        },
        include: {
          basePlayer: {
            include: {
              seasonalPlayerStats: {
                where: {
                  seasonId: round.seasonId
                },
                select: {
                  position: true,
                  overallRating: true
                }
              }
            }
          },
          team: {
            select: {
              name: true
            }
          }
        },
        orderBy: {
          amount: 'desc'
        }
      });

      // Get original bids
      const teamBids = await prisma.team_round_bids.findMany({
        where: {
          roundId: roundId
        },
        select: {
          teamId: true,
          encryptedBids: true
        }
      });

      const { decryptBids } = await import('@/lib/auction/encryption');
      const originalBidsMap = new Map<string, Map<string, number>>();

      for (const tb of teamBids) {
        try {
          const decrypted = decryptBids(tb.encryptedBids);
          const parsed = JSON.parse(decrypted);
          
          for (const bid of parsed.bids || []) {
            if (!originalBidsMap.has(bid.base_player_id)) {
              originalBidsMap.set(bid.base_player_id, new Map());
            }
            originalBidsMap.get(bid.base_player_id)!.set(tb.teamId, bid.amount);
          }
        } catch (error) {
          console.error(`Failed to decrypt bids for team ${tb.teamId}:`, error);
        }
      }

      exportData = previewAllocations.map(alloc => {
        const stats = alloc.basePlayer.seasonalPlayerStats[0];
        const originalBid = originalBidsMap.get(alloc.basePlayerId)?.get(alloc.teamId) || alloc.amount;
        
        return {
          'Player Name': alloc.playerName,
          'Position': stats?.position || 'N/A',
          'Overall Rating': stats?.overallRating || 'N/A',
          'Team Name': alloc.team.name,
          'Final Bid Amount': alloc.amount,
          'Status': 'Preview',
          'Phase': alloc.acquisitionType === 'tiebreaker_won' 
            ? 'Tiebreaker' 
            : alloc.acquisitionType === 'auto_assigned'
              ? 'Auto-assigned'
              : 'Normal Bidding',
          'Original Bid Amount': originalBid,
          'Notes': alloc.acquisitionNotes || 'N/A'
        };
      });
    }

    if (exportData.length === 0) {
      return NextResponse.json(
        { error: 'No data to export' },
        { status: 400 }
      );
    }

    // Create workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Round Results');

    // Set column widths
    worksheet['!cols'] = [
      { wch: 25 }, // Player Name
      { wch: 12 }, // Position
      { wch: 15 }, // Overall Rating
      { wch: 20 }, // Team Name
      { wch: 18 }, // Final Bid Amount
      { wch: 15 }, // Status
      { wch: 18 }, // Phase
      { wch: 20 }, // Original Bid Amount
      { wch: 30 }  // Notes
    ];

    // Generate Excel file buffer
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Create filename
    const filename = `Round_${round.roundNumber}_${round.season.name.replace(/\s+/g, '_')}_Results.xlsx`;

    // Return Excel file
    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });
  } catch (error) {
    console.error('Export round error:', error);
    return NextResponse.json(
      { error: 'Failed to export round results' },
      { status: 500 }
    );
  }
}
