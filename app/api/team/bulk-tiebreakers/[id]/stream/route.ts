import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { tiebreakerEvents } from '@/lib/auction/tiebreaker-events';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.teamId) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { id } = await params;
  const tiebreakerId = parseInt(id);
  if (isNaN(tiebreakerId)) {
    return new Response('Invalid ID', { status: 400 });
  }

  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      // Function to fetch and send current state
      const sendState = async () => {
        try {
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
                      name: true
                    }
                  }
                },
                orderBy: {
                  bidTime: 'desc'
                },
                take: 20
              }
            }
          });

          if (tiebreaker) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(tiebreaker)}\n\n`)
            );
          }
        } catch (err) {
          console.error('Error sending state:', err);
        }
      };

      // Send initial state immediately
      await sendState();

      // Listen for updates
      const listener = async () => {
        await sendState();
      };

      const eventName = `change:${tiebreakerId}`;
      tiebreakerEvents.on(eventName, listener);

      // Clean up when connection closed
      request.signal.addEventListener('abort', () => {
        tiebreakerEvents.off(eventName, listener);
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
}
