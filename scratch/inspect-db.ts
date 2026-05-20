import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log("--- Teams table columns ---");
  const teamsCols = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'teams';
  `);
  console.dir(teamsCols, { depth: null });

  console.log("--- Season Teams table columns ---");
  const seasonTeamsCols = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'season_teams';
  `);
  console.dir(seasonTeamsCols, { depth: null });

  console.log("--- Auction Settings table columns ---");
  try {
    const auctionSettingsCols = await prisma.$queryRawUnsafe(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'auction_settings';
    `);
    console.dir(auctionSettingsCols, { depth: null });
  } catch (e) {
    console.error("auction_settings query failed:", e);
  }

  console.log("--- Password Reset Requests table columns ---");
  const pwdCols = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'password_reset_requests';
  `);
  console.dir(pwdCols, { depth: null });

  console.log("--- Password Reset Requests constraints ---");
  try {
    const pwdConstraints = await prisma.$queryRawUnsafe(`
      SELECT conname, pg_get_constraintdef(c.oid)
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE conrelid = 'password_reset_requests'::regclass;
    `);
    console.dir(pwdConstraints, { depth: null });
  } catch (e) {
    console.error("password_reset_requests constraints query failed:", e);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
