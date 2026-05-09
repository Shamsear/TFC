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
  // Add connection pool settings for Neon
  // @ts-ignore - These options are valid but not in types
  __internal: {
    engine: {
      connection_limit: 10,
      pool_timeout: 10,
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

// Handle disconnection on process exit
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});
