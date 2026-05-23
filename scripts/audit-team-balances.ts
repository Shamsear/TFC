import { prisma } from '../lib/prisma';

/**
 * Audit team balances for TFC Season 4
 * Check if current balance matches calculated balance from transactions
 */

interface TeamAudit {
  teamName: string;
  currentBalance: number;
  initialPurse: number;
  totalSpent: number;
  totalAdjustments: number;
  calculatedBalance: number;
  difference: number;
  hasError: boolean;
  transferCount: number;
  ledgerEntryCount: number;
}

async function auditTeamBalances() {
  console.log('\n💰 Auditing Team Balances for TFC Season 4...\n');

  try {
    const seasonId = 'TFCS-4';

    // Get all teams in the season
    const seasonTeams = await prisma.season_teams.findMany({
      where: {
        seasonId: seasonId
      },
      include: {
        team: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        team: {
          name: 'asc'
        }
      }
    });

    console.log(`📊 Found ${seasonTeams.length} teams in TFC Season 4\n`);

    const audits: TeamAudit[] = [];
    let totalErrors = 0;

    for (const seasonTeam of seasonTeams) {
      // Get all transfers for this team
      const transfers = await prisma.transfer_history.findMany({
        where: {
          seasonId: seasonId,
          teamId: seasonTeam.teamId
        },
        select: {
          soldPrice: true,
          basePlayer: {
            select: {
              name: true
            }
          }
        }
      });

      // Get all financial ledger entries
      const ledgerEntries = await prisma.financial_ledger.findMany({
        where: {
          seasonId: seasonId,
          seasonTeamId: seasonTeam.id
        },
        orderBy: {
          createdAt: 'asc'
        },
        select: {
          transactionType: true,
          amount: true,
          description: true
        }
      });

      // Calculate totals
      const initialPurse = ledgerEntries.find(e => e.transactionType === 'INITIAL_PURSE')?.amount || 0;
      const totalSpent = transfers.reduce((sum, t) => sum + t.soldPrice, 0);
      
      // Sum adjustments (positive adjustments only, excluding initial purse)
      const totalAdjustments = ledgerEntries
        .filter(e => e.transactionType === 'ADJUSTMENT' && e.amount > 0)
        .reduce((sum, e) => sum + e.amount, 0);

      // Calculate expected balance
      const calculatedBalance = initialPurse - totalSpent + totalAdjustments;
      const difference = seasonTeam.currentBudget - calculatedBalance;
      const hasError = Math.abs(difference) > 0;

      if (hasError) {
        totalErrors++;
      }

      audits.push({
        teamName: seasonTeam.team.name,
        currentBalance: seasonTeam.currentBudget,
        initialPurse,
        totalSpent,
        totalAdjustments,
        calculatedBalance,
        difference,
        hasError,
        transferCount: transfers.length,
        ledgerEntryCount: ledgerEntries.length
      });
    }

    // Display results
    console.log('═══════════════════════════════════════════════════════════════════════════════');
    console.log('                              TEAM BALANCE AUDIT                                ');
    console.log('═══════════════════════════════════════════════════════════════════════════════\n');

    // Show teams with errors first
    const teamsWithErrors = audits.filter(a => a.hasError);
    const teamsWithoutErrors = audits.filter(a => !a.hasError);

    if (teamsWithErrors.length > 0) {
      console.log('❌ TEAMS WITH BALANCE ERRORS:\n');
      
      for (const audit of teamsWithErrors) {
        console.log(`🏆 ${audit.teamName}`);
        console.log(`   Current Balance:     £${audit.currentBalance.toLocaleString()}`);
        console.log(`   Initial Purse:       £${audit.initialPurse.toLocaleString()}`);
        console.log(`   Total Spent:         £${audit.totalSpent.toLocaleString()} (${audit.transferCount} players)`);
        console.log(`   Adjustments:         £${audit.totalAdjustments.toLocaleString()}`);
        console.log(`   Calculated Balance:  £${audit.calculatedBalance.toLocaleString()}`);
        console.log(`   ⚠️  DIFFERENCE:        £${audit.difference.toLocaleString()}`);
        console.log(`   Ledger Entries:      ${audit.ledgerEntryCount}`);
        console.log('');
      }
    }

    if (teamsWithoutErrors.length > 0) {
      console.log('✅ TEAMS WITH CORRECT BALANCES:\n');
      
      for (const audit of teamsWithoutErrors) {
        console.log(`🏆 ${audit.teamName}`);
        console.log(`   Balance: £${audit.currentBalance.toLocaleString()} | Spent: £${audit.totalSpent.toLocaleString()} | Players: ${audit.transferCount}`);
        console.log('');
      }
    }

    // Summary
    console.log('═══════════════════════════════════════════════════════════════════════════════');
    console.log('                                   SUMMARY                                      ');
    console.log('═══════════════════════════════════════════════════════════════════════════════\n');
    console.log(`Total Teams:           ${audits.length}`);
    console.log(`Teams with Errors:     ${teamsWithErrors.length} ❌`);
    console.log(`Teams without Errors:  ${teamsWithoutErrors.length} ✅`);
    
    if (teamsWithErrors.length > 0) {
      const totalDifference = teamsWithErrors.reduce((sum, a) => sum + Math.abs(a.difference), 0);
      console.log(`Total Discrepancy:     £${totalDifference.toLocaleString()}`);
    }
    
    console.log('\n═══════════════════════════════════════════════════════════════════════════════\n');

    // Detailed breakdown for teams with errors
    if (teamsWithErrors.length > 0) {
      console.log('\n📋 DETAILED BREAKDOWN FOR TEAMS WITH ERRORS:\n');
      
      for (const audit of teamsWithErrors) {
        console.log(`\n🏆 ${audit.teamName} - Detailed Analysis:`);
        console.log('─────────────────────────────────────────────────────────────────────────────');
        
        // Get detailed ledger
        const seasonTeam = seasonTeams.find(st => st.team.name === audit.teamName);
        if (seasonTeam) {
          const detailedLedger = await prisma.financial_ledger.findMany({
            where: {
              seasonId: seasonId,
              seasonTeamId: seasonTeam.id
            },
            orderBy: {
              createdAt: 'asc'
            },
            select: {
              transactionType: true,
              amount: true,
              previousBalance: true,
              newBalance: true,
              description: true,
              playerName: true,
              createdAt: true
            }
          });

          console.log(`\n   Financial Ledger (${detailedLedger.length} entries):`);
          detailedLedger.forEach((entry, idx) => {
            const sign = entry.amount >= 0 ? '+' : '';
            console.log(`   ${idx + 1}. ${entry.transactionType.padEnd(20)} ${sign}£${entry.amount.toString().padStart(6)} | £${entry.previousBalance} → £${entry.newBalance}`);
            if (entry.playerName) {
              console.log(`      Player: ${entry.playerName}`);
            }
            if (entry.description) {
              console.log(`      Note: ${entry.description}`);
            }
          });

          // Get transfers
          const transfers = await prisma.transfer_history.findMany({
            where: {
              seasonId: seasonId,
              teamId: seasonTeam.teamId
            },
            select: {
              soldPrice: true,
              acquisitionType: true,
              basePlayer: {
                select: {
                  name: true
                }
              }
            },
            orderBy: {
              createdAt: 'asc'
            }
          });

          console.log(`\n   Transfers (${transfers.length} players):`);
          transfers.forEach((transfer, idx) => {
            console.log(`   ${idx + 1}. ${transfer.basePlayer.name.padEnd(30)} £${transfer.soldPrice.toString().padStart(6)} (${transfer.acquisitionType})`);
          });
        }
        
        console.log('─────────────────────────────────────────────────────────────────────────────');
      }
    }

  } catch (error) {
    console.error('\n❌ Error:', error);
    throw error;
  }
}

// Run the audit
auditTeamBalances()
  .then(() => {
    console.log('\n✅ Audit completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Audit failed:', error);
    process.exit(1);
  });
