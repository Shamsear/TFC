/**
 * Migration: Fix bulk_round_selections schema mismatch
 * 
 * This script:
 * 1. Backs up existing data
 * 2. Drops and recreates the table with correct types
 * 3. Restores the data with proper formatting
 */

import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
});

async function migrate() {
  const client = await pool.connect();
  
  try {
    console.log('Starting migration...');
    
    // Step 1: Backup existing data
    console.log('Step 1: Backing up existing data...');
    const backupResult = await client.query(`
      SELECT 
        round_id,
        team_id,
        selected_players,
        submitted,
        last_updated
      FROM bulk_round_selections
    `);
    
    console.log(`Found ${backupResult.rows.length} existing records`);
    
    // Step 2: Drop and recreate table
    console.log('Step 2: Dropping and recreating table...');
    await client.query(`DROP TABLE IF EXISTS bulk_round_selections CASCADE`);
    
    await client.query(`
      CREATE TABLE bulk_round_selections (
        id VARCHAR(50) PRIMARY KEY,
        round_id VARCHAR(20) NOT NULL,
        team_id VARCHAR(20) NOT NULL,
        selected_players TEXT NOT NULL DEFAULT '{}',
        submitted BOOLEAN DEFAULT FALSE,
        last_updated TIMESTAMPTZ DEFAULT NOW(),
        
        CONSTRAINT fk_bulk_round_selections_round 
          FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE CASCADE,
        CONSTRAINT fk_bulk_round_selections_team 
          FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
        CONSTRAINT unique_bulk_round_team UNIQUE (round_id, team_id)
      )
    `);
    
    // Create indexes
    await client.query(`
      CREATE INDEX idx_bulk_round_selections_round ON bulk_round_selections(round_id)
    `);
    await client.query(`
      CREATE INDEX idx_bulk_round_selections_team ON bulk_round_selections(team_id)
    `);
    
    console.log('Table recreated successfully');
    
    // Step 3: Restore data
    if (backupResult.rows.length > 0) {
      console.log('Step 3: Restoring data...');
      
      for (const row of backupResult.rows) {
        const id = `${row.round_id}_${row.team_id}`;
        
        // Convert JSONB to JSON string if needed
        let selectedPlayers: string;
        if (typeof row.selected_players === 'string') {
          selectedPlayers = row.selected_players;
        } else {
          selectedPlayers = JSON.stringify(row.selected_players);
        }
        
        await client.query(
          `INSERT INTO bulk_round_selections 
           (id, round_id, team_id, selected_players, submitted, last_updated)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [id, row.round_id, row.team_id, selectedPlayers, row.submitted, row.last_updated]
        );
      }
      
      console.log(`Restored ${backupResult.rows.length} records`);
    } else {
      console.log('Step 3: No data to restore');
    }
    
    console.log('Migration completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
