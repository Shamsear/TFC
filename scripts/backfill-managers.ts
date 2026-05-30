import { PrismaClient } from '@prisma/client';
import { generateManagerId } from '../lib/id-generator';

const prisma = new PrismaClient();

async function main() {
  console.log("Starting Manager ID backfill...");
  
  // Find all managers that don't start with TFCMGR
  const managers = await prisma.managers.findMany({
    where: {
      NOT: {
        id: {
          startsWith: 'TFCMGR'
        }
      }
    }
  });
  
  console.log(`Found ${managers.length} managers needing ID updates.`);
  
  for (const manager of managers) {
    const newId = await generateManagerId();
    console.log(`Updating manager ${manager.name} from ${manager.id} to ${newId}`);
    
    // Because 'id' is the primary key and used in foreign keys, we must do this carefully.
    // In PostgreSQL, updating a primary key with cascading updates might be supported.
    // Let's try updating it directly since prisma schema says onDelete: Cascade but let's see if onUpdate is cascade.
    // Wait, prisma defaults to ON UPDATE CASCADE for relations in PostgreSQL if not specified otherwise.
    
    try {
      await prisma.$executeRaw`
        UPDATE managers 
        SET id = ${newId} 
        WHERE id = ${manager.id}
      `;
      console.log(`Successfully updated ${manager.name}`);
    } catch (e) {
      console.error(`Failed to update ${manager.name}:`, e);
    }
  }
  
  console.log("Finished backfill.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
