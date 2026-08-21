const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { v4: uuidv4 } = require('uuid');

async function main() {
  const seasonId = 'TFCS-3';
  
  // 1. Get Tournament for S3 League
  const tournament = await prisma.tournaments.findFirst({
    where: { seasonId, name: { contains: 'League', mode: 'insensitive' } }
  });
  console.log("Tournament:", tournament);
  
  // 2. Check or Create Global Team
  let team = await prisma.teams.findFirst({
    where: { name: { contains: 'Aston Villa', mode: 'insensitive' } }
  });
  
  if (!team) {
    console.log("Creating team Aston Villa...");
    team = await prisma.teams.create({
      data: {
        id: `TFCT-${Date.now()}`,
        name: 'Aston Villa',
        managerName: 'Shameenraja',
        logoUrl: '/team-logos/default.png',
        updatedAt: new Date()
      }
    });
  }
  console.log("Team:", team);

  // 3. Check or Create Manager
  let manager = await prisma.managers.findFirst({
    where: { name: { equals: 'Shameenraja', mode: 'insensitive' } }
  });
  
  if (!manager) {
    console.log("Creating manager Shameenraja...");
    manager = await prisma.managers.create({
      data: {
        id: `TFCMGR-${Date.now()}`,
        name: 'Shameenraja'
      }
    });
  }
  console.log("Manager:", manager);
  
  // 4. Create manager_teams
  await prisma.manager_teams.upsert({
    where: { managerId_teamId: { managerId: manager.id, teamId: team.id } },
    update: {},
    create: { managerId: manager.id, teamId: team.id, isCurrent: true }
  });

  // 5. Create season_teams
  const seasonTeam = await prisma.season_teams.upsert({
    where: { seasonId_teamId: { seasonId, teamId: team.id } },
    update: { managerName: 'Shameenraja' },
    create: {
      id: `TFCST-${Date.now()}`,
      seasonId,
      teamId: team.id,
      managerName: 'Shameenraja',
      currentBudget: 20000,
      updatedAt: new Date()
    }
  });
  console.log("Season Team:", seasonTeam);

  // 6. Create standings
  if (tournament) {
    const standingId = `TFCSTD-${Date.now()}`;
    await prisma.standings.upsert({
      where: { 
        tournamentId_teamId_groupName: { 
          tournamentId: tournament.id, 
          teamId: seasonTeam.id,
          groupName: ''
        }
      },
      update: {
        position: 19,
        played: 33,
        won: 4,
        drawn: 7,
        lost: 22,
        goalsFor: 27,
        goalsAgainst: 85,
        goalDiff: -58,
        points: 19
      },
      create: {
        id: standingId,
        teamId: seasonTeam.id,
        tournamentId: tournament.id,
        groupName: '',
        position: 19,
        played: 33,
        won: 4,
        drawn: 7,
        lost: 22,
        goalsFor: 27,
        goalsAgainst: 85,
        goalDiff: -58,
        points: 19,
        updatedAt: new Date()
      }
    });
    console.log("Created Standings!");
    
    // 7. Add to tournament_teams
    await prisma.tournament_teams.upsert({
      where: { 
        tournamentId_teamId: { 
          tournamentId: tournament.id, 
          teamId: seasonTeam.id 
        } 
      },
      update: {},
      create: {
        id: `TFCTT-${Date.now()}`,
        tournamentId: tournament.id,
        teamId: seasonTeam.id,
        seedPosition: 19
      }
    });
    console.log("Added to tournament_teams!");
  }

  // 8. Add UECL stats
  const uecl = await prisma.tournaments.findFirst({
    where: { seasonId, name: 'UECL' }
  });
  if (uecl) {
    const standingIdUECL = `TFCSTD-${Date.now()}-UECL`;
    await prisma.standings.upsert({
      where: { 
        tournamentId_teamId_groupName: { 
          tournamentId: uecl.id, 
          teamId: seasonTeam.id,
          groupName: ''
        }
      },
      update: {
        position: 6,
        played: 7,
        won: 2,
        drawn: 0,
        lost: 5,
        goalsFor: 11,
        goalsAgainst: 18,
        goalDiff: -7,
        points: 29
      },
      create: {
        id: standingIdUECL,
        teamId: seasonTeam.id,
        tournamentId: uecl.id,
        groupName: '',
        position: 6,
        played: 7,
        won: 2,
        drawn: 0,
        lost: 5,
        goalsFor: 11,
        goalsAgainst: 18,
        goalDiff: -7,
        points: 29,
        updatedAt: new Date()
      }
    });
    console.log("Created UECL Standings!");
    
    await prisma.tournament_teams.upsert({
      where: { 
        tournamentId_teamId: { 
          tournamentId: uecl.id, 
          teamId: seasonTeam.id 
        } 
      },
      update: {},
      create: {
        id: `TFCTT-${Date.now()}-UECL`,
        tournamentId: uecl.id,
        teamId: seasonTeam.id,
        seedPosition: 6
      }
    });
    console.log("Added to UECL tournament_teams!");
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
