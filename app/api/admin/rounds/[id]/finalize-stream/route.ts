import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/rounds/[id]/finalize-stream
 * Stream finalization logs in real-time using Server-Sent Events
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'SUB_ADMIN')) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { id: roundId } = await params;
  
  // Parse body for force parameter
  let body: { force?: boolean } = {};
  try {
    const contentType = request.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      body = await request.json();
    }
  } catch (error) {
    console.log('No JSON body provided, using defaults');
  }
  const { force = false } = body;

  // Create a readable stream for SSE
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // Helper to send log messages
      const sendLog = (message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'log', level: type, message, timestamp: new Date().toISOString() })}\n\n`)
        );
      };

      try {
        sendLog('🚀 Starting round finalization...', 'info');
        
        // Fetch round type first
        const round = await prisma.rounds.findUnique({
          where: { id: roundId },
          select: { roundType: true }
        });

        if (!round) {
          throw new Error('Round not found');
        }

        // Import the appropriate finalization logic based on round type
        let finalizationFunction: (id: string) => Promise<any>;
        let applyFunction: (id: string, allocations: any, conflicts?: any) => Promise<void>;
        
        if (round.roundType === 'bulk') {
          sendLog('📦 Detected bulk round, loading bulk finalization logic...', 'info');
          const { finalizeBulkRound, applyBulkFinalizationResults } = await import('@/lib/auction/finalize-bulk-round');
          finalizationFunction = finalizeBulkRound;
          applyFunction = applyBulkFinalizationResults;
        } else {
          sendLog('📊 Detected standard round, loading standard finalization logic...', 'info');
          const { finalizeRound, applyFinalizationResults } = await import('@/lib/auction/finalize-round');
          finalizationFunction = finalizeRound;
          applyFunction = applyFinalizationResults;
        }
        
        // Override console.log to capture logs
        const originalLog = console.log;
        const originalError = console.error;
        const originalWarn = console.warn;
        
        console.log = (...args: any[]) => {
          const message = args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
          ).join(' ');
          sendLog(message, 'info');
          originalLog(...args);
        };
        
        console.error = (...args: any[]) => {
          const message = args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
          ).join(' ');
          sendLog(message, 'error');
          originalError(...args);
        };
        
        console.warn = (...args: any[]) => {
          const message = args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
          ).join(' ');
          sendLog(message, 'warning');
          originalWarn(...args);
        };

        // Run finalization calculation
        const result = await finalizationFunction(roundId);

        // If successful or there are tie/conflicts to save, apply to DB
        // Normal rounds return success=false when there's a tie, but they still need to save state
        // Bulk rounds return success=true and include conflicts list
        if (result.success || result.tieDetected || result.conflicts?.length > 0) {
          try {
            sendLog('💾 Saving results to database...', 'info');
            
            if (round.roundType === 'bulk') {
              await applyFunction(roundId, result.allocations, result.conflicts);
            } else {
              // Standard round tie handling is usually done inside finalizeRound state saving,
              // but if it's completely successful with no ties, apply the allocations
              if (result.success) {
                await applyFunction(roundId, result.allocations);
              } else if (result.tieDetected) {
                // For standard round ties, the finalizeRound logic already saved state and created the tiebreaker
                sendLog('⏸️ Tie detected. State saved, awaiting tiebreaker resolution.', 'warning');
              }
            }
            
            sendLog('✅ Database updated successfully!', 'success');
          } catch (dbError: any) {
            sendLog(`❌ Failed to save to database: ${dbError.message}`, 'error');
            throw dbError; // Propagate to outer catch
          }
        }

        // Restore console
        console.log = originalLog;
        console.error = originalError;
        console.warn = originalWarn;

        if (result.success || result.tieDetected || result.conflicts?.length > 0) {
          sendLog('✅ Round finalization completed!', 'success');
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'complete', success: true, result })}\n\n`)
          );
        } else {
          sendLog(`❌ Finalization failed: ${result.error}`, 'error');
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'complete', success: false, error: result.error })}\n\n`)
          );
        }
      } catch (error: any) {
        sendLog(`💥 Fatal error: ${error.message}`, 'error');
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'complete', success: false, error: error.message })}\n\n`)
        );
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
