import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Handle connection errors gracefully
prisma.$connect().catch((err) => {
  console.error("Failed to connect to database:", err);
});

// Disconnect idle connections to prevent pool exhaustion
const IDLE_TIMEOUT = 60000; // 60 seconds
let idleTimer: NodeJS.Timeout;

function resetIdleTimer() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(async () => {
    try {
      await prisma.$disconnect();
    } catch (err) {
      console.error("Error disconnecting idle connection:", err);
    }
  }, IDLE_TIMEOUT);
}

// Reset timer on any query
if (process.env.NODE_ENV === "production") {
  prisma.$use(async (params, next) => {
    resetIdleTimer();
    return next(params);
  });
}

// Handle disconnection on process exit
process.on('beforeExit', async () => {
  clearTimeout(idleTimer);
  await prisma.$disconnect();
});
