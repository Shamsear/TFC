/**
 * Script to inspect the efootball_latest.db structure
 * Run with: node scripts/inspect-efootball-db.js
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(process.cwd(), 'efootball_latest.db');

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
  console.log('Connected to efootball_latest.db\n');
});

// Get all tables
db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, tables) => {
  if (err) {
    console.error('Error fetching tables:', err.message);
    db.close();
    return;
  }

  console.log('=== TABLES ===');
  tables.forEach(table => console.log(`  - ${table.name}`));
  console.log('');

  // For each table, get schema and sample data
  let processed = 0;
  tables.forEach(table => {
    const tableName = table.name;
    
    // Get table schema
    db.all(`PRAGMA table_info(${tableName})`, [], (err, columns) => {
      if (err) {
        console.error(`Error fetching schema for ${tableName}:`, err.message);
        return;
      }

      console.log(`\n=== TABLE: ${tableName} ===`);
      console.log('Columns:');
      columns.forEach(col => {
        console.log(`  ${col.name} (${col.type})${col.pk ? ' PRIMARY KEY' : ''}${col.notnull ? ' NOT NULL' : ''}`);
      });

      // Get sample data (first 3 rows)
      db.all(`SELECT * FROM ${tableName} LIMIT 3`, [], (err, rows) => {
        if (err) {
          console.error(`Error fetching data from ${tableName}:`, err.message);
        } else if (rows.length > 0) {
          console.log('\nSample data:');
          rows.forEach((row, idx) => {
            console.log(`\nRow ${idx + 1}:`);
            Object.entries(row).forEach(([key, value]) => {
              const displayValue = typeof value === 'string' && value.length > 50 
                ? value.substring(0, 50) + '...' 
                : value;
              console.log(`  ${key}: ${displayValue}`);
            });
          });
        }

        // Get row count
        db.get(`SELECT COUNT(*) as count FROM ${tableName}`, [], (err, result) => {
          if (!err) {
            console.log(`\nTotal rows: ${result.count}`);
          }

          processed++;
          if (processed === tables.length) {
            db.close((err) => {
              if (err) {
                console.error('Error closing database:', err.message);
              } else {
                console.log('\n\nDatabase inspection complete.');
              }
            });
          }
        });
      });
    });
  });
});
