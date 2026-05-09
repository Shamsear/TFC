import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const prisma = new PrismaClient()

async function exportSchema() {
  console.log('🔍 Exporting database schema from Neon...\n')

  try {
    // Get all table names
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename
    `

    console.log(`Found ${tables.length} tables:\n`)
    tables.forEach(t => console.log(`  - ${t.tablename}`))

    let fullSchema = `-- TFC Database Schema Export
-- Generated: ${new Date().toISOString()}
-- Database: Neon PostgreSQL
-- 
-- This schema can be used to create a replica database
--

-- Enable UUID extension (if needed)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ENUM types first
`

    // Get all enum types
    const enums = await prisma.$queryRaw<Array<{ 
      typname: string
      enumlabel: string 
    }>>`
      SELECT t.typname, e.enumlabel
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid  
      JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
      ORDER BY t.typname, e.enumsortorder
    `

    // Group enums by type
    const enumTypes = new Map<string, string[]>()
    enums.forEach(e => {
      if (!enumTypes.has(e.typname)) {
        enumTypes.set(e.typname, [])
      }
      enumTypes.get(e.typname)!.push(e.enumlabel)
    })

    // Add enum definitions
    for (const [typname, labels] of enumTypes) {
      fullSchema += `\nCREATE TYPE "${typname}" AS ENUM (${labels.map(l => `'${l}'`).join(', ')});\n`
    }

    fullSchema += '\n-- Create tables\n'

    // Get schema for each table
    for (const table of tables) {
      const tableName = table.tablename

      // Get table definition
      const columns = await prisma.$queryRaw<Array<{
        column_name: string
        data_type: string
        is_nullable: string
        column_default: string | null
        character_maximum_length: number | null
        udt_name: string
      }>>`
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default,
          character_maximum_length,
          udt_name
        FROM information_schema.columns
        WHERE table_schema = 'public' 
          AND table_name = ${tableName}
        ORDER BY ordinal_position
      `

      fullSchema += `\n-- Table: ${tableName}\n`
      fullSchema += `CREATE TABLE "${tableName}" (\n`

      const columnDefs = columns.map(col => {
        let def = `  "${col.column_name}" `

        // Handle data type
        if (col.data_type === 'USER-DEFINED') {
          def += `"${col.udt_name}"`
        } else if (col.data_type === 'character varying') {
          def += col.character_maximum_length 
            ? `VARCHAR(${col.character_maximum_length})`
            : 'VARCHAR'
        } else {
          def += col.data_type.toUpperCase()
        }

        // Handle nullable
        if (col.is_nullable === 'NO') {
          def += ' NOT NULL'
        }

        // Handle default
        if (col.column_default) {
          def += ` DEFAULT ${col.column_default}`
        }

        return def
      })

      fullSchema += columnDefs.join(',\n')

      // Get primary key
      const primaryKey = await prisma.$queryRaw<Array<{ column_name: string }>>`
        SELECT a.attname as column_name
        FROM pg_index i
        JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
        WHERE i.indrelid = ${tableName}::regclass AND i.indisprimary
      `

      if (primaryKey.length > 0) {
        const pkColumns = primaryKey.map(pk => `"${pk.column_name}"`).join(', ')
        fullSchema += `,\n  PRIMARY KEY (${pkColumns})`
      }

      fullSchema += '\n);\n'

      // Get indexes
      const indexes = await prisma.$queryRaw<Array<{
        indexname: string
        indexdef: string
      }>>`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE schemaname = 'public' 
          AND tablename = ${tableName}
          AND indexname NOT LIKE '%_pkey'
        ORDER BY indexname
      `

      if (indexes.length > 0) {
        fullSchema += `\n-- Indexes for ${tableName}\n`
        indexes.forEach(idx => {
          fullSchema += `${idx.indexdef};\n`
        })
      }
    }

    // Get foreign keys
    fullSchema += '\n-- Foreign Key Constraints\n'
    const foreignKeys = await prisma.$queryRaw<Array<{
      constraint_name: string
      table_name: string
      column_name: string
      foreign_table_name: string
      foreign_column_name: string
      update_rule: string
      delete_rule: string
    }>>`
      SELECT
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        rc.update_rule,
        rc.delete_rule
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      JOIN information_schema.referential_constraints AS rc
        ON rc.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
      ORDER BY tc.table_name, tc.constraint_name
    `

    foreignKeys.forEach(fk => {
      fullSchema += `ALTER TABLE "${fk.table_name}" ADD CONSTRAINT "${fk.constraint_name}" `
      fullSchema += `FOREIGN KEY ("${fk.column_name}") `
      fullSchema += `REFERENCES "${fk.foreign_table_name}" ("${fk.foreign_column_name}") `
      fullSchema += `ON UPDATE ${fk.update_rule} ON DELETE ${fk.delete_rule};\n`
    })

    // Get unique constraints
    fullSchema += '\n-- Unique Constraints\n'
    const uniqueConstraints = await prisma.$queryRaw<Array<{
      constraint_name: string
      table_name: string
      column_name: string
    }>>`
      SELECT
        tc.constraint_name,
        tc.table_name,
        kcu.column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      WHERE tc.constraint_type = 'UNIQUE'
        AND tc.table_schema = 'public'
      ORDER BY tc.table_name, tc.constraint_name
    `

    const uniqueByTable = new Map<string, Map<string, string[]>>()
    uniqueConstraints.forEach(uc => {
      if (!uniqueByTable.has(uc.table_name)) {
        uniqueByTable.set(uc.table_name, new Map())
      }
      const tableConstraints = uniqueByTable.get(uc.table_name)!
      if (!tableConstraints.has(uc.constraint_name)) {
        tableConstraints.set(uc.constraint_name, [])
      }
      tableConstraints.get(uc.constraint_name)!.push(uc.column_name)
    })

    for (const [tableName, constraints] of uniqueByTable) {
      for (const [constraintName, columns] of constraints) {
        fullSchema += `ALTER TABLE "${tableName}" ADD CONSTRAINT "${constraintName}" `
        fullSchema += `UNIQUE (${columns.map(c => `"${c}"`).join(', ')});\n`
      }
    }

    // Save to file
    const outputPath = path.join(process.cwd(), 'scripts', 'exported-schema.sql')
    fs.writeFileSync(outputPath, fullSchema)

    console.log('\n✅ Schema exported successfully!')
    console.log(`📄 File: ${outputPath}`)
    console.log(`📊 Size: ${(fullSchema.length / 1024).toFixed(2)} KB`)
    console.log(`📋 Tables: ${tables.length}`)
    console.log(`🔑 Enums: ${enumTypes.size}`)
    console.log(`🔗 Foreign Keys: ${foreignKeys.length}`)
    console.log(`🔒 Unique Constraints: ${uniqueConstraints.length}`)

    console.log('\n📝 To use this schema:')
    console.log('1. Create a new PostgreSQL database')
    console.log('2. Run: psql -U username -d database_name -f scripts/exported-schema.sql')
    console.log('3. Update your .env with the new DATABASE_URL')

  } catch (error) {
    console.error('❌ Error exporting schema:', error)
    throw error
  }
}

exportSchema()
  .catch((e) => {
    console.error('\n❌ Fatal Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
