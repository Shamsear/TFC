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
