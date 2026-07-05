import { prisma } from '../lib/prisma'
import {
  checkCircularDependency,
  checkGuaranteedQualifications,
  populateTournamentLink,
  clearPopulatedTeams,
  checkAndPopulateConfirmedTeams,
  getQualifiedTeams
} from '../lib/tournament-linking'
import { generateTournamentId, generateStandingId } from '../lib/id-generator'
import crypto from 'crypto'

async function runTests() {
  console.log('🧪 Starting Tournament Linking System verification tests...')

  // Step 1: Create a test season and tournaments
  const seasonId = `TEST-S-${Date.now().toString().substring(5)}`
  const sourceId = await generateTournamentId()
  const targetId = await generateTournamentId()
  const circularId = await generateTournamentId()

  const teamIds: string[] = []
  const seasonTeamIds: string[] = []

  try {
    console.log(`\n1. Setting up mock data (Season: ${seasonId}, Source: ${sourceId}, Target: ${targetId})`)
    
    const maxSeason = await prisma.seasons.aggregate({
      _max: { seasonNumber: true }
    })
    const nextSeasonNumber = (maxSeason._max.seasonNumber || 0) + 1

    await prisma.seasons.create({
      data: {
        id: seasonId,
        name: `Test Linking Season ${seasonId}`,
        startingPurse: 10000,
        seasonNumber: nextSeasonNumber,
        updatedAt: new Date()
      }
    })

    await prisma.tournaments.createMany({
      data: [
        {
          id: sourceId,
          seasonId,
          name: 'Test Source League',
          tournamentType: 'LEAGUE_ONLY',
          startDate: new Date(),
          status: 'UPCOMING',
          updatedAt: new Date()
        },
        {
          id: targetId,
          seasonId,
          name: 'Test Target Playoffs',
          tournamentType: 'KNOCKOUT_ONLY',
          startDate: new Date(),
          status: 'UPCOMING',
          updatedAt: new Date()
        },
        {
          id: circularId,
          seasonId,
          name: 'Test Circular Tournament',
          tournamentType: 'KNOCKOUT_ONLY',
          startDate: new Date(),
          status: 'UPCOMING',
          updatedAt: new Date()
        }
      ]
    })

    // Create 6 mock teams
    
    for (let i = 1; i <= 6; i++) {
      const teamId = `TEST-T-${i}-${Date.now().toString().substring(8)}`
      const seasonTeamId = `TEST-ST-${i}-${Date.now().toString().substring(8)}`
      teamIds.push(teamId)
      seasonTeamIds.push(seasonTeamId)

      const uniqueSuffix = Date.now().toString().substring(6)
      await prisma.teams.create({
        data: {
          id: teamId,
          name: `Test Team ${i} ${uniqueSuffix}`,
          logoUrl: '/logos/default.png',
          managerName: `Manager ${i} ${uniqueSuffix}`,
          primaryColor: '#000000',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })

      await prisma.season_teams.create({
        data: {
          id: seasonTeamId,
          seasonId,
          teamId,
          currentBudget: 1000,
          updatedAt: new Date()
        }
      })
    }

    // Set up standings in source tournament
    // Team 1: 15 pts (5 wins, 0 losses)
    // Team 2: 12 pts (4 wins, 1 loss)
    // Team 3: 9 pts (3 wins, 2 losses)
    // Team 4: 6 pts (2 wins, 3 losses)
    // Team 5: 3 pts (1 win, 4 losses)
    // Team 6: 0 pts (0 wins, 5 losses)
    for (let i = 0; i < 6; i++) {
      await prisma.standings.create({
        data: {
          id: await generateStandingId(),
          tournamentId: sourceId,
          teamId: seasonTeamIds[i],
          played: 5,
          won: 5 - i,
          drawn: 0,
          lost: i,
          goalsFor: (5 - i) * 2,
          goalsAgainst: i * 2,
          goalDiff: (5 - i) * 2 - i * 2,
          points: (5 - i) * 3,
          position: i + 1,
          updatedAt: new Date()
        }
      })
    }

    console.log('✓ Mock teams, seasons, tournaments, and standings created.')

    // Step 2: Test Circular Dependency Check
    console.log('\n2. Testing Circular Dependency prevention...')
    
    // Create link: Source -> Target
    const link1Id = crypto.randomUUID()
    await prisma.tournament_links.create({
      data: {
        id: link1Id,
        sourceTournamentId: sourceId,
        targetTournamentId: targetId,
        linkType: 'TOP_N',
        qualificationConfig: { count: 3 },
        status: 'ACTIVE'
      }
    })

    // Check if Target -> Source creates a loop (Should be true)
    let isCircular = await checkCircularDependency(targetId, sourceId)
    console.log(`- Path Target -> Source circular dependency check: ${isCircular ? 'PASS (Circular detected)' : 'FAIL'}`)
    if (!isCircular) throw new Error('Failed circular dependency check');

    // Create link: Target -> Circular
    const link2Id = crypto.randomUUID()
    await prisma.tournament_links.create({
      data: {
        id: link2Id,
        sourceTournamentId: targetId,
        targetTournamentId: circularId,
        linkType: 'TOP_N',
        qualificationConfig: { count: 1 },
        status: 'ACTIVE'
      }
    })

    // Check if Circular -> Source creates a loop (Should be true)
    isCircular = await checkCircularDependency(circularId, sourceId)
    console.log(`- Path Circular -> Source circular dependency check: ${isCircular ? 'PASS (Circular detected)' : 'FAIL'}`)
    if (!isCircular) throw new Error('Failed circular dependency chain check');

    // Check if Circular -> Target creates a loop (Should be true)
    isCircular = await checkCircularDependency(circularId, targetId)
    console.log(`- Path Circular -> Target circular dependency check: ${isCircular ? 'PASS (Circular detected)' : 'FAIL'}`)
    if (!isCircular) throw new Error('Failed circular dependency sub-chain check');

    // Check if Source -> Circular creates a loop (Should be false, it goes in same direction)
    isCircular = await checkCircularDependency(sourceId, circularId)
    console.log(`- Path Source -> Circular circular dependency check: ${isCircular ? 'FAIL (Detected circular when none existed)' : 'PASS (No circle)'}`)
    if (isCircular) throw new Error('Failed valid dependency check');

    // Clean up temporary circular links before proceeding
    await prisma.tournament_links.deleteMany({
      where: { id: { in: [link1Id, link2Id] } }
    })

    console.log('✓ Circular Dependency tests completed successfully.')

    // Step 3: Test Mathematical Certainty
    console.log('\n3. Testing Mathematical Certainty (Clinched qualification)...')
    
    // Create Link: Source (Top 3) -> Target
    const linkId = crypto.randomUUID()
    await prisma.tournament_links.create({
      data: {
        id: linkId,
        sourceTournamentId: sourceId,
        targetTournamentId: targetId,
        linkType: 'TOP_N',
        qualificationConfig: { count: 3 },
        status: 'ACTIVE'
      }
    })

    // We add some scheduled matches to see remaining games.
    // Let's add 1 scheduled match for Team 1 (vs Team 2)
    // Team 1 (15 pts) vs Team 2 (12 pts). Max points: Team 1 can reach 18, Team 2 can reach 15.
    // Team 3 (9 pts) has 0 matches remaining.
    // Let's see: Team 1 has 15 pts. The 4th place (Team 4) has 6 pts. Even if Team 4 has 1 match left, they can reach at most 9 pts.
    // So Team 1 is guaranteed to finish in the top 3!
    const matchId = `TEST-M-${Date.now().toString().substring(8)}`
    await prisma.matches.create({
      data: {
        id: matchId,
        tournamentId: sourceId,
        homeTeamId: seasonTeamIds[0], // Team 1
        awayTeamId: seasonTeamIds[1], // Team 2
        matchDate: new Date(),
        status: 'SCHEDULED',
        round: 'Gameweek 6',
        updatedAt: new Date()
      }
    })

    const confirmed = await checkGuaranteedQualifications(sourceId, linkId)
    console.log(`Confirmed qualifiers:`, confirmed.map(c => c.seasonTeamId))
    
    // Team 1 (seasonTeamIds[0]) and Team 2 (seasonTeamIds[1]) should be guaranteed top 3
    // Let's verify that Team 1 is confirmed
    const isTeam1Confirmed = confirmed.some(c => c.seasonTeamId === seasonTeamIds[0])
    console.log(`- Team 1 (15 pts) mathematically clinched top 3: ${isTeam1Confirmed ? 'PASS (Clinched)' : 'FAIL'}`)
    if (!isTeam1Confirmed) throw new Error('Team 1 should be confirmed');

    // Run auto-population check
    await checkAndPopulateConfirmedTeams(sourceId)

    // Check if qualification record exists for Team 1
    const qual1 = await prisma.tournament_team_qualifications.findFirst({
      where: { tournamentLinkId: linkId, seasonTeamId: seasonTeamIds[0] }
    })
    console.log(`- Team 1 qualification record created: ${qual1 ? `PASS (Status: ${qual1.status})` : 'FAIL'}`)
    if (!qual1 || qual1.status !== 'CONFIRMED') throw new Error('Team 1 qualification record missing or incorrect');

    // Check if Team 1 was added to target tournament teams
    const targetTeam1 = await prisma.tournament_teams.findUnique({
      where: {
        tournamentId_teamId: {
          tournamentId: targetId,
          teamId: seasonTeamIds[0]
        }
      }
    })
    console.log(`- Team 1 added to target tournament: ${targetTeam1 ? 'PASS' : 'FAIL'}`)
    if (!targetTeam1) throw new Error('Team 1 not added to target tournament teams');

    console.log('✓ Mathematical Certainty tests completed successfully.')

    // Step 4: Test Full/Forced Population (Source complete or forced)
    console.log('\n4. Testing Full/Forced Population...')

    // Force populate the link
    const populateResult = await populateTournamentLink(linkId, { force: true })
    console.log(`- Populate result:`, populateResult)
    
    // Verify all top 3 teams are populated with status FINAL
    const qualifications = await prisma.tournament_team_qualifications.findMany({
      where: { tournamentLinkId: linkId }
    })
    console.log(`- Total qualification records: ${qualifications.length} (Expected: 3)`)
    if (qualifications.length !== 3) throw new Error('Expected 3 qualified teams');

    const areAllFinal = qualifications.every(q => q.status === 'FINAL')
    console.log(`- All qualifications updated to FINAL: ${areAllFinal ? 'PASS' : 'FAIL'}`)
    if (!areAllFinal) throw new Error('Qualifications should be final');

    // Verify target tournament teams count
    const targetTeamsCount = await prisma.tournament_teams.count({
      where: { tournamentId: targetId }
    })
    console.log(`- Target tournament teams count: ${targetTeamsCount} (Expected: 3)`)
    if (targetTeamsCount !== 3) throw new Error('Target tournament should have 3 teams');

    console.log('✓ Full Population tests completed successfully.')

    // Step 5: Test Reset/Clear Logic
    console.log('\n5. Testing Clear/Reset Logic...')
    
    const clearResult = await clearPopulatedTeams(linkId)
    console.log(`- Clear result:`, clearResult)

    const postClearQuals = await prisma.tournament_team_qualifications.count({
      where: { tournamentLinkId: linkId }
    })
    console.log(`- Qualifications count post-clear: ${postClearQuals} (Expected: 0)`)
    if (postClearQuals !== 0) throw new Error('Qualifications should be cleared');

    const postClearTargetTeams = await prisma.tournament_teams.count({
      where: { tournamentId: targetId }
    })
    console.log(`- Target teams count post-clear: ${postClearTargetTeams} (Expected: 0)`)
    if (postClearTargetTeams !== 0) throw new Error('Target teams should be cleared');

    console.log('✓ Clear/Reset tests completed successfully.')

    // Step 6: Test Team Exclusions (Skipping Team 3)
    console.log('\n6. Testing Team Exclusions (Skipping Team 3)...')
    
    // Update link config to exclude Team 3 (index 2)
    await prisma.tournament_links.update({
      where: { id: linkId },
      data: {
        qualificationConfig: {
          count: 3,
          excludeTeamIds: [seasonTeamIds[2]]
        }
      }
    })

    const qualifiedWithExclusion = await getQualifiedTeams(sourceId, 'TOP_N', {
      count: 3,
      excludeTeamIds: [seasonTeamIds[2]]
    })
    console.log(`Qualified teams with Team 3 excluded:`, qualifiedWithExclusion.map(t => t.seasonTeamId))

    // Expected qualified teams are: Team 1 (index 0), Team 2 (index 1), Team 4 (index 3)
    const hasTeam3 = qualifiedWithExclusion.some(t => t.seasonTeamId === seasonTeamIds[2])
    const hasTeam4 = qualifiedWithExclusion.some(t => t.seasonTeamId === seasonTeamIds[3])
    
    console.log(`- Excluded Team 3 not present in qualified: ${!hasTeam3 ? 'PASS' : 'FAIL'}`)
    console.log(`- Team 4 rolled up and is present in qualified: ${hasTeam4 ? 'PASS' : 'FAIL'}`)
    
    if (hasTeam3) throw new Error('Team 3 should be excluded');
    if (!hasTeam4) throw new Error('Team 4 should have rolled up to qualify');

    console.log('✓ Team Exclusions tests completed successfully.')

    console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! The Tournament Linking System is working perfectly.')

  } catch (err) {
    console.error('\n❌ TEST RUN ENCOUNTERED CRITICAL FAILURE:', err)
  } finally {
    console.log('\n🗑 Cleaning up test database records...')
    // Cleanup everything
    try {
      await prisma.tournament_links.deleteMany({
        where: {
          sourceTournamentId: { in: [sourceId, targetId, circularId] }
        }
      })
      await prisma.matches.deleteMany({
        where: { tournamentId: sourceId }
      })
      await prisma.standings.deleteMany({
        where: { tournamentId: { in: [sourceId, targetId] } }
      })
      await prisma.tournament_teams.deleteMany({
        where: { tournamentId: { in: [sourceId, targetId, circularId] } }
      })
      await prisma.tournaments.deleteMany({
        where: { seasonId }
      })
      await prisma.season_teams.deleteMany({
        where: { seasonId }
      })
      await prisma.seasons.deleteMany({
        where: { id: seasonId }
      })
      await prisma.teams.deleteMany({
        where: { id: { in: teamIds } }
      })
      console.log('✓ Test database cleanup complete.')
    } catch (cleanErr) {
      console.error('Failed to clean up test database:', cleanErr)
    }
  }
}

runTests()
