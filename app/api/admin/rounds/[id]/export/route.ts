import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import ExcelJS from 'exceljs';

/**
 * GET /api/admin/rounds/[id]/export - Export round results to Excel with styling
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

    // Create workbook and worksheet with ExcelJS
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Turf Cats';
    workbook.created = new Date();
    
    const worksheet = workbook.addWorksheet('Round Results', {
      properties: { tabColor: { argb: 'FFE8A800' } }
    });

    // Define columns with proper styling
    worksheet.columns = [
      { header: 'Player Name', key: 'playerName', width: 25 },
      { header: 'Position', key: 'position', width: 12 },
      { header: 'Overall Rating', key: 'overallRating', width: 15 },
      { header: 'Team Name', key: 'teamName', width: 22 },
      { header: 'Final Bid Amount', key: 'finalBid', width: 18 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Phase', key: 'phase', width: 18 },
      { header: 'Original Bid Amount', key: 'originalBid', width: 20 },
      { header: 'Notes', key: 'notes', width: 35 }
    ];

    // Add title row
    worksheet.insertRow(1, [`Round ${round.roundNumber} - ${round.season.name} - ${round.position || 'All Positions'}`]);
    worksheet.mergeCells('A1:I1');
    const titleRow = worksheet.getRow(1);
    titleRow.font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    titleRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0A0A0A' }
    };
    titleRow.alignment = { vertical: 'middle', horizontal: 'center' };
    titleRow.height = 30;

    // Style header row (now row 2)
    const headerRow = worksheet.getRow(2);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE8A800' }
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 25;
    headerRow.border = {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thin', color: { argb: 'FF000000' } }
    };

    // Add data rows
    exportData.forEach((data, index) => {
      const row = worksheet.addRow({
        playerName: data['Player Name'],
        position: data['Position'],
        overallRating: data['Overall Rating'],
        teamName: data['Team Name'],
        finalBid: data['Final Bid Amount'],
        status: data['Status'],
        phase: data['Phase'],
        originalBid: data['Original Bid Amount'],
        notes: data['Notes']
      });

      // Alternate row colors
      if (index % 2 === 0) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF5F5F5' }
        };
      }

      // Center align specific columns
      row.getCell('position').alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell('overallRating').alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell('finalBid').alignment = { horizontal: 'right', vertical: 'middle' };
      row.getCell('originalBid').alignment = { horizontal: 'right', vertical: 'middle' };
      row.getCell('status').alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell('phase').alignment = { horizontal: 'center', vertical: 'middle' };

      // Format currency
      row.getCell('finalBid').numFmt = '£#,##0';
      row.getCell('originalBid').numFmt = '£#,##0';

      // Color code by phase
      const phaseCell = row.getCell('phase');
      if (data['Phase'] === 'Tiebreaker') {
        phaseCell.font = { color: { argb: 'FFFF6B35' }, bold: true };
      } else if (data['Phase'] === 'Auto-assigned') {
        phaseCell.font = { color: { argb: 'FF9B59B6' }, bold: true };
      } else {
        phaseCell.font = { color: { argb: 'FF27AE60' }, bold: true };
      }

      // Add borders to all cells
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
          left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
          bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
          right: { style: 'thin', color: { argb: 'FFD0D0D0' } }
        };
      });
    });

    // Add summary row
    const summaryRowNum = worksheet.rowCount + 2;
    worksheet.getRow(summaryRowNum).values = [
      'Total Players:', 
      exportData.length,
      '',
      '',
      exportData.reduce((sum, d) => sum + (d['Final Bid Amount'] || 0), 0),
      '',
      '',
      exportData.reduce((sum, d) => sum + (d['Original Bid Amount'] || 0), 0),
      ''
    ];
    
    const summaryRow = worksheet.getRow(summaryRowNum);
    summaryRow.font = { bold: true, size: 11 };
    summaryRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFD700' }
    };
    summaryRow.getCell(5).numFmt = '£#,##0';
    summaryRow.getCell(8).numFmt = '£#,##0';
    summaryRow.alignment = { vertical: 'middle' };
    summaryRow.height = 25;

    // Freeze header rows
    worksheet.views = [
      { state: 'frozen', xSplit: 0, ySplit: 2 }
    ];

    // Generate Excel file buffer
    const excelBuffer = await workbook.xlsx.writeBuffer();

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
