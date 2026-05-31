import { prisma } from '../lib/prisma';

async function main() {
  console.log("=== Inspecting Rounds and Retentions in DB ===");

  try {
    // 1. Get sample round IDs
    const rounds = await prisma.rounds.findMany({
      take: 5,
      select: { id: true }
    });
    console.log("Rounds sample IDs:", rounds);

    // 2. Get sample retention IDs
    const retentions = await prisma.retentions.findMany({
      take: 5,
      select: { id: true }
    });
    console.log("Retentions sample IDs:", retentions);

    // 3. Get existing counters for TFCR and TFCRD
    const counters = await prisma.$queryRaw`
      SELECT * FROM id_counters WHERE prefix IN ('TFCR', 'TFCRD', 'TFCRT')
    `;
    console.log("Current counters in DB:", counters);

  } catch (error) {
    console.error("Error inspecting:", error);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
