import { EventEmitter } from 'events';

// Global Event Emitter
// In Next.js hot-reloads, global variables get re-initialized.
// Using a global symbol prevents this in development.
const globalForEvents = global as unknown as {
  tiebreakerEvents?: EventEmitter;
};

export const tiebreakerEvents =
  globalForEvents.tiebreakerEvents ?? new EventEmitter();

if (process.env.NODE_ENV !== 'production') {
  globalForEvents.tiebreakerEvents = tiebreakerEvents;
}

/**
 * High-performance helper to query full updated tiebreaker state 
 * and emit it directly as a payload to all listeners (SSE streams).
 * This eliminates the database query entirely for each connected user stream.
 */
export const emitTiebreakerChange = async (tiebreakerId: number) => {
  try {
    const { prisma } = await import('../prisma');
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

    if (tiebreaker) {
      tiebreakerEvents.emit(`change:${tiebreakerId}`, tiebreaker);
    } else {
      tiebreakerEvents.emit(`change:${tiebreakerId}`);
    }
  } catch (error) {
    console.error('Error emitting tiebreaker change event with payload:', error);
    // Fallback without payload
    tiebreakerEvents.emit(`change:${tiebreakerId}`);
  }
};
