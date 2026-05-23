import { prisma } from '@/lib/prisma';
import { calculateReserve } from '@/lib/auction/reserve-calculator-v2';

async function debugReserveCalculation() {
  const roundId = 'TFCR-14';
  const seasonId = 'TFCS-4';
  
  // Get all teams in this season with their current budget
  const seasonTeams = await prisma.season_teams.findMany({
    where: { seasonId },
    include: {
      team: { select: { name: true } }
    },
    orderBy: { currentBudget: 'asc' }
  });

  console.log('\n=== SEASON TEAMS BUDGETS ===');
  for (const st of seasonTeams) {
    const squadSize = await prisma.transfer_history.count({
      where: { teamId: st.teamId, seasonId }
    });
    console.log(`${st.team.name}: £${st.currentBudget.toLocaleString()} (${squadSize} players)`);
  }

  // Get round details
  const round = await prisma.rounds.findUnique({
    where: { id: roundId },
    select: { 
      roundNumber: true, 
      position: true,
      position_group: true 
    }
  });

  console.log(`\n=== ROUND ${round?.roundNumber} ===`);
  console.log(`Position: ${round?.position || 'N/A'}`);
  console.log(`Position Group: ${round?.position_group || 'N/A'}`);

  // Get auction settings
  const settings = await prisma.auction_settings.findUnique({
    where: { seasonId }
  });

  console.log('\n=== AUCTION SETTINGS ===');
  console.log(`Phase 1: Rounds 1-${settings?.phase_1_end_round} (Min: £${settings?.phase_1_min_balance})`);
  console.log(`Phase 2: Rounds ${(settings?.phase_1_end_round || 0) + 1}-${settings?.phase_2_end_round} (Min: £${settings?.phase_2_min_balance})`);
  console.log(`Phase 3: Rounds ${(settings?.phase_2_end_round || 0) + 1}+ (Min: £${settings?.phase_3_min_balance})`);
  console.log(`Min Squad: ${settings?.min_squad_size}, Max Squad: ${settings?.max_squad_size}`);

  // Find team with budget around £3,144
  const targetTeam = seasonTeams.find(st => st.currentBudget >= 3100 && st.currentBudget <= 3200);
  
  if (targetTeam) {
    console.log(`\n=== ANALYZING ${targetTeam.team.name.toUpperCase()} ===`);
    console.log(`Current Budget: £${targetTeam.currentBudget.toLocaleString()}`);
    
    const squadSize = await prisma.transfer_history.count({
      where: { teamId: targetTeam.teamId, seasonId }
    });
    console.log(`Squad Size: ${squadSize}`);

    // Calculate reserve
    const reserveInfo = await calculateReserve(targetTeam.teamId, roundId, seasonId);
    
    console.log('\n--- RESERVE CALCULATION ---');
    console.log(`Phase: ${reserveInfo.phase}`);
    console.log(`Calculation: ${reserveInfo.calculation}`);
    console.log(`\nBreakdown:`);
    if (reserveInfo.breakdown.phase1Reserve !== undefined) {
      console.log(`  Phase 1 Reserve: £${reserveInfo.breakdown.phase1Reserve}`);
    }
    if (reserveInfo.breakdown.phase2Reserve !== undefined) {
      console.log(`  Phase 2 Reserve: £${reserveInfo.breakdown.phase2Reserve}`);
    }
    if (reserveInfo.breakdown.phase3Reserve !== undefined) {
      console.log(`  Phase 3 Reserve: £${reserveInfo.breakdown.phase3Reserve}`);
    }
    console.log(`\nTotal Reserve: £${reserveInfo.reserve}`);
    console.log(`Floor Reserve: £${reserveInfo.floorReserve}`);
    console.log(`Max Bid (Hard Limit): £${reserveInfo.maxBid.toLocaleString()}`);
    console.log(`Max Recommended Bid: £${reserveInfo.maxRecommendedBid.toLocaleString()}`);
    
    // Manual calculation
    console.log('\n--- MANUAL VERIFICATION ---');
    if (round && settings) {
      const phase1Remaining = Math.max(0, settings.phase_1_end_round - round.roundNumber);
      const phase2Full = settings.phase_2_end_round - settings.phase_1_end_round;
      const playersAfterPhase1 = squadSize + 1 + phase1Remaining;
      const playersAfterPhase2 = playersAfterPhase1 + phase2Full;
      const phase3Slots = Math.max(0, settings.min_squad_size - playersAfterPhase2);
      
      console.log(`Current Round: ${round.roundNumber}`);
      console.log(`Phase 1 Remaining: ${phase1Remaining} rounds`);
      console.log(`Phase 2 Total: ${phase2Full} rounds`);
      console.log(`Players after this round: ${squadSize + 1}`);
      console.log(`Players after Phase 1: ${playersAfterPhase1}`);
      console.log(`Players after Phase 2: ${playersAfterPhase2}`);
      console.log(`Phase 3 slots needed: ${phase3Slots}`);
      
      const phase1Reserve = phase1Remaining * settings.phase_1_min_balance;
      const phase2Reserve = phase2Full * settings.phase_2_min_balance;
      const phase3Reserve = phase3Slots * settings.phase_3_min_balance;
      const floorReserve = phase1Reserve + phase3Reserve;
      
      console.log(`\nPhase 1 Reserve: ${phase1Remaining} × £${settings.phase_1_min_balance} = £${phase1Reserve}`);
      console.log(`Phase 2 Reserve: ${phase2Full} × £${settings.phase_2_min_balance} = £${phase2Reserve}`);
      console.log(`Phase 3 Reserve: ${phase3Slots} × £${settings.phase_3_min_balance} = £${phase3Reserve}`);
      console.log(`Floor Reserve: £${phase1Reserve} + £${phase3Reserve} = £${floorReserve}`);
      console.log(`Max Bid: £${targetTeam.currentBudget} - £${floorReserve} = £${targetTeam.currentBudget - floorReserve}`);
    }
  } else {
    console.log('\n⚠️ No team found with budget around £3,144');
    console.log('Available teams:');
    seasonTeams.forEach(st => {
      console.log(`  ${st.team.name}: £${st.currentBudget.toLocaleString()}`);
    });
  }

  await prisma.$disconnect();
}

debugReserveCalculation().catch(console.error);
