import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function POST() {
  try {
    const session = await auth()
    
    if (session?.user?.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    console.log('Starting tournament_teams migration...')

    // Step 1: Create the tournament_teams table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS tournament_teams (
        id TEXT PRIMARY KEY,
        tournament_id TEXT NOT NULL,
        team_id TEXT NOT NULL,
        group_name TEXT,
        seed_position INTEGER,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        
        CONSTRAINT fk_tournament_teams_tournament 
          FOREIGN KEY (tournament_id) 
          REFERENCES tournaments(id) 
          ON DELETE CASCADE,
        
        CONSTRAINT fk_tournament_teams_season_team 
          FOREIGN KEY (team_id) 
          REFERENCES season_teams(id) 
          ON DELETE CASCADE,
        
        CONSTRAINT uq_tournament_team 
          UNIQUE (tournament_id, team_id)
      )
    `)

    // Step 2: Create indexes
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_tournament_teams_tournament_id 
      ON tournament_teams(tournament_id)
    `)
    
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_tournament_teams_team_id 
      ON tournament_teams(team_id)
    `)

    // Step 3: Migrate existing data from matches
    await prisma.$executeRawUnsafe(`
      INSERT INTO tournament_teams (id, tournament_id, team_id, created_at, updated_at)
      SELECT 
        'tt-' || "tournamentId" || '-' || "homeTeamId" AS id,
        "tournamentId" as tournament_id,
        "homeTeamId" as team_id,
        CURRENT_TIMESTAMP AS created_at,
        CURRENT_TIMESTAMP AS updated_at
      FROM (
        SELECT DISTINCT 
          m."tournamentId",
          m."homeTeamId"
        FROM matches m
        
        UNION
        
        SELECT DISTINCT 
          m."tournamentId",
          m."awayTeamId"
        FROM matches m
      ) AS tournament_team_pairs
      ON CONFLICT (tournament_id, team_id) DO NOTHING
    `)

    // Step 4: Update group names for group stage tournaments
    await prisma.$executeRawUnsafe(`
      UPDATE tournament_teams tt
      SET group_name = (
        SELECT DISTINCT g.name
        FROM matches m
        JOIN groups g ON m."groupId" = g.id
        WHERE m."tournamentId" = tt.tournament_id
        AND (m."homeTeamId" = tt.team_id OR m."awayTeamId" = tt.team_id)
        AND g.name IS NOT NULL
        LIMIT 1
      )
      WHERE EXISTS (
        SELECT 1 
        FROM tournaments t 
        WHERE t.id = tt.tournament_id 
        AND t."tournamentType" = 'GROUP_KNOCKOUT'
      )
    `)

    // Verify the migration
    const count = await prisma.tournament_teams.count()

    return NextResponse.json({
      success: true,
      message: 'Migration completed successfully',
      recordsCreated: count
    })

  } catch (error: any) {
    console.error('Migration error:', error)
    
    if (error.message?.includes('already exists')) {
      // Table exists, check if it has data
      try {
        const count = await prisma.tournament_teams.count()
        
        if (count === 0) {
          // Run only data migration
          await prisma.$executeRawUnsafe(`
            INSERT INTO tournament_teams (id, tournament_id, team_id, created_at, updated_at)
            SELECT 
              'tt-' || "tournamentId" || '-' || "homeTeamId" AS id,
              "tournamentId" as tournament_id,
              "homeTeamId" as team_id,
              CURRENT_TIMESTAMP AS created_at,
              CURRENT_TIMESTAMP AS updated_at
            FROM (
              SELECT DISTINCT 
                m."tournamentId",
                m."homeTeamId"
              FROM matches m
              
              UNION
              
              SELECT DISTINCT 
                m."tournamentId",
                m."awayTeamId"
              FROM matches m
            ) AS tournament_team_pairs
            ON CONFLICT (tournament_id, team_id) DO NOTHING
          `)
          
          const newCount = await prisma.tournament_teams.count()
          
          return NextResponse.json({
            success: true,
            message: 'Table existed but was empty. Data migrated successfully.',
            recordsCreated: newCount
          })
        }
        
        return NextResponse.json({
          success: true,
          message: 'Table already exists with data',
          recordsCreated: count
        })
      } catch (countError) {
        return NextResponse.json({
          error: 'Failed to check existing data',
          details: countError instanceof Error ? countError.message : 'Unknown error'
        }, { status: 500 })
      }
    }
    
    return NextResponse.json({
      error: 'Migration failed',
      details: error.message
    }, { status: 500 })
  }
}
