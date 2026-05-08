import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as fs from 'fs';
import * as path from 'path';

export async function POST() {
  try {
    const sqlPath = path.join(process.cwd(), 'ADD-PLAYER-SKILLS-COLUMNS.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');
    
    // Remove comments and split by ALTER TABLE
    const lines = sql.split('\n').filter(line => !line.trim().startsWith('--'));
    const cleanSql = lines.join('\n');
    
    // Match all ALTER TABLE statements (including multi-line)
    const alterTableRegex = /ALTER TABLE[\s\S]*?;/g;
    const statements = cleanSql.match(alterTableRegex) || [];
    
    console.log(`Executing ${statements.length} ALTER TABLE statements...`);
    
    const results = [];
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      console.log(`Executing statement ${i + 1}/${statements.length}...`);
      await prisma.$executeRawUnsafe(statement);
      results.push(`Statement ${i + 1} executed successfully`);
      console.log('✓ Success');
    }
    
    return NextResponse.json({
      success: true,
      message: 'Migration completed successfully',
      results
    });
  } catch (error: any) {
    console.error('Migration failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message
      },
      { status: 500 }
    );
  }
}
