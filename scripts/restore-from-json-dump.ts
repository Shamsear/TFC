import { prisma } from '../lib/prisma';
import fs from 'fs';
import path from 'path';

/**
 * Script to restore database data from a JSON dump exported from Neon SQL Editor.
 * Usage: npx tsx scripts/restore-from-json-dump.ts <path-to-json-file>
 */
async function main() {
  const filePath = process.argv[2] || path.join(__dirname, '../backup.json');

  if (!fs.existsSync(filePath)) {
    console.error(`❌ Backup file not found at: ${filePath}`);
    console.log(`Usage: npx tsx scripts/restore-from-json-dump.ts path/to/backup.json`);
    process.exit(1);
  }

  console.log(`\n================================================================================`);
  console.log(`📦 RESTORING DATABASE FROM JSON DUMP`);
  console.log(`File: ${filePath}`);
  console.log(`================================================================================\n`);

  const rawData = fs.readFileSync(filePath, 'utf-8');
  const dump = JSON.parse(rawData);

  // Function to clean dates in data
  const sanitize = (data: any[]) => {
    if (!Array.isArray(data)) return [];
    return data.map(item => {
      const obj = { ...item };
      for (const key of Object.keys(obj)) {
        if (typeof obj[key] === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(obj[key])) {
          obj[key] = new Date(obj[key]);
        }
      }
      return obj;
    });
  };

  console.log(`Found tables in backup: ${Object.keys(dump).join(', ')}`);

  // Insert tables in dependency order
  const tableOrder = [
    { name: 'users', model: prisma.users },
    { name: 'seasons', model: prisma.seasons },
    { name: 'teams', model: prisma.teams },
    { name: 'base_players', model: prisma.base_players },
    { name: 'season_teams', model: prisma.season_teams },
    { name: 'seasonal_player_stats', model: prisma.seasonal_player_stats },
    { name: 'rounds', model: prisma.rounds },
    { name: 'team_round_bids', model: prisma.team_round_bids },
    { name: 'transfer_history', model: prisma.transfer_history },
    { name: 'financial_ledger', model: prisma.financial_ledger },
    { name: 'tournaments', model: prisma.tournaments },
    { name: 'tournament_teams', model: prisma.tournament_teams },
    { name: 'matches', model: prisma.matches },
    { name: 'standings', model: prisma.standings },
    { name: 'starred_players', model: prisma.starred_players },
    { name: 'auction_settings', model: prisma.auction_settings },
    { name: 'id_counters', model: prisma.id_counters }
  ];

  for (const { name, model } of tableOrder) {
    const records = sanitize(dump[name] || []);
    if (records.length === 0) {
      console.log(`- ${name}: 0 records (skipped)`);
      continue;
    }

    try {
      // Chunk inserts in batches of 100
      let inserted = 0;
      const chunkSize = 100;
      for (let i = 0; i < records.length; i += chunkSize) {
        const chunk = records.slice(i, i + chunkSize);
        await (model as any).createMany({
          data: chunk,
          skipDuplicates: true
        });
        inserted += chunk.length;
      }
      console.log(`✓ ${name}: ${inserted} records restored`);
    } catch (err) {
      console.error(`❌ Failed to restore ${name}:`, err);
    }
  }

  console.log(`\n================================================================================`);
  console.log(`🎉 DATABASE RESTORATION COMPLETE!`);
  console.log(`================================================================================\n`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
