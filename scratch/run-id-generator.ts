import { 
  validateId, 
  extractIdNumber, 
  generatePlayerId, 
  generateUserId, 
  generateTournamentId, 
  ID_PREFIXES 
} from '../lib/id-generator';
import { prisma } from '../lib/prisma';

async function main() {
  console.log("=== Testing ID Generator ===");

  // 1. Test validation
  console.log("\n--- Testing validation ---");
  const validPlayer = 'TFCP-123';
  const invalidPlayer = 'TFCP-abc';
  console.log(`Is '${validPlayer}' valid player ID?`, validateId(validPlayer, ID_PREFIXES.PLAYER));
  console.log(`Is '${invalidPlayer}' valid player ID?`, validateId(invalidPlayer, ID_PREFIXES.PLAYER));

  // 2. Test extraction
  console.log("\n--- Testing extraction ---");
  const testId = 'TFCT-9876';
  console.log(`Extracting number from '${testId}':`, extractIdNumber(testId));

  // 3. Test database-backed ID generation
  console.log("\n--- Testing sequential atomic ID generation ---");
  try {
    const newPlayerId = await generatePlayerId();
    console.log("Generated new Player ID:", newPlayerId);

    const newUserId = await generateUserId();
    console.log("Generated new User ID:", newUserId);

    const newTournamentId = await generateTournamentId();
    console.log("Generated new Tournament ID:", newTournamentId);
  } catch (error) {
    console.error("Error generating database-backed IDs:", error);
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
