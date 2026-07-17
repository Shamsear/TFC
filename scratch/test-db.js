const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getPreviousKnockoutRoundName = (currentRoundName) => {
  const flow = ['ROUND_OF_32', 'ROUND_OF_16', 'QUARTER_FINAL', 'SEMI_FINAL', 'FINAL']
  const idx = flow.indexOf(currentRoundName)
  if (idx > 0) {
    return flow[idx - 1]
  }
  return ''
}

const getRoundDisplayLabel = (name) => {
  const labels = {
    'ROUND_OF_32': 'Round of 32',
    'ROUND_OF_16': 'Round of 16',
    'QUARTER_FINAL': 'Quarter Final',
    'SEMI_FINAL': 'Semi Final',
    'THIRD_PLACE': 'Third Place',
    'FINAL': 'Final'
  }
  return labels[name] || name.replace(/_/g, ' ')
}

function getAutoPairingPlaceholders(roundName, pairingIndex, tournament) {
  return { team1Placeholder: 'Test 1', team2Placeholder: 'Test 2' };
}

async function generateKnockoutRoundId() {
  return 'TEST-R-' + Date.now() + Math.random().toString().substring(2, 6);
}
async function generateKnockoutPairingId() {
  return 'TEST-P-' + Date.now() + Math.random().toString().substring(2, 6);
}

async function main() {
  const tournament = await prisma.tournaments.findFirst({
    include: { groups: true }
  });
  if (!tournament) {
    console.log('No tournament found.');
    return;
  }
  
  console.log('Testing with tournament:', tournament.name, 'ID:', tournament.id);
  
  const roundName = 'QUARTER_FINAL';
  const legs = 2;
  const createFullBracket = true;
  const primaryPairingsCount = 4;
  const tournamentId = tournament.id;
  const roundOrder = 2;
  
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Create the round
      const roundId = await generateKnockoutRoundId()
      const round = await tx.knockout_rounds.create({
        data: {
          id: roundId,
          tournamentId,
          roundName,
          roundOrder,
          legs,
          status: 'PENDING',
          updatedAt: new Date()
        }
      })

      // Create pairings
      for (let i = 0; i < primaryPairingsCount; i++) {
        const pairingId = await generateKnockoutPairingId()
        const placeholders = getAutoPairingPlaceholders(roundName, i, tournament)
        await tx.knockout_pairings.create({
          data: {
            id: pairingId,
            knockoutRoundId: round.id,
            team1Id: null,
            team2Id: null,
            team1Placeholder: placeholders.team1Placeholder,
            team2Placeholder: placeholders.team2Placeholder,
            updatedAt: new Date()
          }
        })
      }

      // Automatically generate subsequent rounds if createFullBracket is true
      if (createFullBracket) {
        const subsequentRounds = [
          { name: 'SEMI_FINAL', order: 3, pairingsCount: 2 },
          { name: 'FINAL', order: 5, pairingsCount: 1 }
        ]

        for (const sub of subsequentRounds) {
          const exists = await tx.knockout_rounds.findUnique({
            where: {
              tournamentId_roundName: {
                tournamentId,
                roundName: sub.name
              }
            }
          })

          if (!exists) {
            const subRoundId = await generateKnockoutRoundId()
            const subRound = await tx.knockout_rounds.create({
              data: {
                id: subRoundId,
                tournamentId,
                roundName: sub.name,
                roundOrder: sub.order,
                legs,
                status: 'PENDING',
                updatedAt: new Date()
              }
            })

            // Create empty pairings for the subsequent round
            for (let i = 0; i < sub.pairingsCount; i++) {
              const pairingId = await generateKnockoutPairingId()
              const prevRoundName = getPreviousKnockoutRoundName(sub.name) || roundName
              const prevRoundLabel = getRoundDisplayLabel(prevRoundName)
              await tx.knockout_pairings.create({
                data: {
                  id: pairingId,
                  knockoutRoundId: subRound.id,
                  team1Id: null,
                  team2Id: null,
                  team1Placeholder: `Winner of ${prevRoundLabel} Match #${2 * i + 1}`,
                  team2Placeholder: `Winner of ${prevRoundLabel} Match #${2 * i + 2}`,
                  updatedAt: new Date()
                }
              })
            }
          }
        }
      }

      return round;
    });
    
    console.log('SUCCESS! Created round and pairings:', result);
    
    // Clean up to prevent cluttering DB
    console.log('Cleaning up...');
    const roundIds = await prisma.knockout_rounds.findMany({
      where: { tournamentId }
    });
    for (const r of roundIds) {
      if (r.id.startsWith('TEST-R-')) {
        await prisma.knockout_rounds.delete({ where: { id: r.id } });
      }
    }
    console.log('Cleaned up test records.');
  } catch (error) {
    console.error('TRANSACTION FAILED WITH ERROR:', error);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
