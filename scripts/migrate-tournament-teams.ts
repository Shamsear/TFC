import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function migrateTournamentTeams() {
  console.log('🚀 Starting tournament_teams migration...\n')

  try {
    // Step 1: Create the tournament_teams table
    console.log('📝 Creating tournament_teams table...')
    
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
    
    console.log('✅ Table created\n')

    // Step 2: Create indexes
    console.log('📝 Creating indexes...')
    
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_tournament_teams_tournament_id 
      ON tournament_teams(tournament_id)
    `)
    
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_tournament_teams_team_id 
      ON tournament_teams(team_id)
    `)
    
    console.log('✅ Indexes created\n')

    // Step 3: Migrate existing data from matches
    console.log('📝 Migrating existing tournament-team relationships from matches...')
    
    await prisma.$executeRawUnsafe(`
      INSERT INTO tournament_teams (id, tournament_id, team_id, created_at, updated_at)
      SELECT 
        'tt-' || "tournamentId" || '-' || team_id AS id,
        "tournamentId" as tournament_id,
        team_id,
        CURRENT_TIMESTAMP AS created_at,
        CURRENT_TIMESTAMP AS updated_at
      FROM (
        SELECT DISTINCT 
          m."tournamentId",
          m."homeTeamId" AS team_id
        FROM matches m
        
        UNION
        
        SELECT DISTINCT 
          m."tournamentId",
          m."awayTeamId" AS team_id
        FROM matches m
      ) AS tournament_team_pairs
      ON CONFLICT (tournament_id, team_id) DO NOTHING
    `)
    
    console.log('✅ Data migrated\n')

    // Step 4: Update group names for group stage tournaments
    console.log('📝 Assigning group names...')
    
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
    
    console.log('✅ Group names assigned\n')

    // Step 5: Verify the migration
    console.log('🔍 Verifying migration...\n')
    
    const count = await prisma.tournament_teams.count()
    console.log(`✅ tournament_teams table has ${count} records\n`)

    // Show sample data
    const sampleData = await prisma.tournament_teams.findMany({
      take: 5,
      include: {
        tournament: {
          select: { name: true }
        },
        seasonTeam: {
          include: {
            team: {
              select: { name: true }
            }
          }
        }
      }
    })

    if (sampleData.length > 0) {
      console.log('📊 Sample migrated data:')
      sampleData.forEach((tt, index) => {
        console.log(`   ${index + 1}. ${tt.tournament.name} - ${tt.seasonTeam.team.name}${tt.groupName ? ` (${tt.groupName})` : ''}`)
      })
      console.log('')
    }

    console.log('✨ Migration completed successfully!')
    console.log('\n📌 Next steps:')
    console.log('   1. Restart your development server')
    console.log('   2. Visit any tournament page to see the teams\n')

  } catch (error: any) {
    if (error.message?.includes('already exists')) {
      console.log('⚠️  Table already exists, checking data...\n')
      
      const count = await prisma.tournament_teams.count()
      console.log(`✅ tournament_teams table has ${count} records`)
      
      if (count === 0) {
        console.log('\n⚠️  Table exists but is empty. Running data migration only...\n')
        
        // Run only the data migration part
        await prisma.$executeRawUnsafe(`
          INSERT INTO tournament_teams (id, tournament_id, team_id, created_at, updated_at)
          SELECT 
            'tt-' || "tournamentId" || '-' || team_id AS id,
            "tournamentId" as tournament_id,
            team_id,
            CURRENT_TIMESTAMP AS created_at,
            CURRENT_TIMESTAMP AS updated_at
          FROM (
            SELECT DISTINCT 
              m."tournamentId",
              m."homeTeamId" AS team_id
            FROM matches m
            
            UNION
            
            SELECT DISTINCT 
              m."tournamentId",
              m."awayTeamId" AS team_id
            FROM matches m
          ) AS tournament_team_pairs
          ON CONFLICT (tournament_id, team_id) DO NOTHING
        `)
        
        const newCount = await prisma.tournament_teams.count()
        console.log(`✅ Migrated ${newCount} tournament-team relationships\n`)
      }
    } else {
      console.error('\n❌ Migration failed:', error)
      throw error
    }
  } finally {
    await prisma.$disconnect()
  }
}

migrateTournamentTeams()
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
