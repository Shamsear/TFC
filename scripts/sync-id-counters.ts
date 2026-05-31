import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PREF_TABLE_MAP: Record<string, string> = {
  'TFCP': 'players',
  'TFCS': 'seasons',
  'TFCU': 'users',
  'TFCT': 'tournaments',
  'TFCM': 'teams',
  'TFCF': 'fixtures',
  'TFCMA': 'matches',
  'TFCTH': 'transfer_history',
  'TFCTB': 'tiebreaker_rules',
  'TFCBA': 'bid_audit_logs', // Verify table name
  'TFCA': 'auction_plans', // Or auction_settings?
  'TFCAS': 'auction_slots', // Or similar
  'TFCRT': 'retentions',
  'TFCST': 'season_teams',
  'TFCPS': 'seasonal_player_stats',
  'TFCFL': 'financial_ledger',
  'TFCAL': 'audit_logs',
  'TFCTT': 'tournament_teams',
  'TFCKR': 'knockout_rounds',
  'TFCKP': 'knockout_pairings',
  'TFCG': 'tournament_groups', // Verify table name
  'TFCSD': 'standings',
  'TFCR': 'rounds',
  'TFCRW': 'release_windows',
  'TFCSW': 'swap_windows',
};

async function main() {
  console.log("Starting ID Counters Sync...");

  // We can also just query all tables in public schema and look at all IDs
  const tablesResult: any[] = await prisma.$queryRaw`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name NOT IN ('_prisma_migrations', 'id_counters');
  `;

  const tables = tablesResult.map((t) => t.table_name);
  
  // Track max by prefix
  const maxByPrefix: Record<string, number> = {};

  for (const table of tables) {
    try {
      // Check if table has an id column
      const columns: any[] = await prisma.$queryRawUnsafe(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = '${table}' AND column_name = 'id';
      `);
      
      if (columns.length > 0) {
        // Get all IDs
        const ids: any[] = await prisma.$queryRawUnsafe(`
          SELECT id FROM "${table}" WHERE id IS NOT NULL;
        `);

        for (const row of ids) {
          const id = row.id;
          if (typeof id === 'string' && id.includes('-')) {
            const parts = id.split('-');
            const prefix = parts[0];
            const num = parseInt(parts[1], 10);
            
            if (prefix && PREF_TABLE_MAP[prefix] && !isNaN(num)) {
              if (!maxByPrefix[prefix] || num > maxByPrefix[prefix]) {
                maxByPrefix[prefix] = num;
              }
            }
          }
        }
      }
    } catch (e) {
      console.log(`Skipping table ${table} due to error`);
    }
  }

  console.log("Found max counters:");
  console.log(maxByPrefix);

  // Update id_counters
  for (const [prefix, maxCount] of Object.entries(maxByPrefix)) {
    console.log(`Updating ${prefix} to ${maxCount}`);
    await prisma.$executeRaw`
      INSERT INTO id_counters (prefix, counter, updated_at)
      VALUES (${prefix}, ${maxCount}, NOW())
      ON CONFLICT (prefix) 
      DO UPDATE SET 
        counter = GREATEST(id_counters.counter, ${maxCount}),
        updated_at = NOW();
    `;
  }

  console.log("ID Counters Sync Complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
