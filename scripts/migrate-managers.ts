import { PrismaClient } from "@prisma/client";
import { generateUniqueEmail } from "../lib/password-generator";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting manager migration...");

  const users = await prisma.users.findMany({
    where: { role: "TEAM_MANAGER" },
  });

  console.log(`Found ${users.length} TEAM_MANAGER users.`);

  let migratedCount = 0;
  let skippedCount = 0;

  for (const user of users) {
    if (user.managerId) {
      console.log(`User ${user.email} already linked to manager ${user.managerId}. Skipping.`);
      skippedCount++;
      continue;
    }

    const name = user.name || "Unknown Manager";

    // Find or create manager record
    let manager = await prisma.managers.findUnique({
      where: { name },
    });

    if (!manager) {
      manager = await prisma.managers.create({
        data: { name },
      });
      console.log(`Created new manager record: ${name}`);
    } else {
      console.log(`Found existing manager record: ${name}`);
    }

    // Generate manager-based email
    // Clean name for email (lowercase, no spaces, letters only)
    const normalizedManagerName = name.toLowerCase().replace(/[^a-z0-9]/g, "");
    
    // We only update email if it doesn't already contain the manager's name
    // (If someone manually created it or it was already migrated)
    let newEmail = user.email;
    if (!newEmail.includes(normalizedManagerName)) {
        // Find a unique email
        let baseEmail = `${normalizedManagerName}@tfc.com`;
        let existingUser = await prisma.users.findFirst({ where: { email: baseEmail, id: { not: user.id } } });
        let counter = 1;
        while (existingUser) {
            baseEmail = `${normalizedManagerName}${counter}@tfc.com`;
            existingUser = await prisma.users.findFirst({ where: { email: baseEmail, id: { not: user.id } } });
            counter++;
        }
        newEmail = baseEmail;
    }

    // Update user
    await prisma.users.update({
      where: { id: user.id },
      data: {
        managerId: manager.id,
        email: newEmail,
      },
    });

    console.log(`Updated user ${user.id}: Linked to manager ${manager.id}, Email changed from ${user.email} to ${newEmail}`);
    migratedCount++;
  }

  console.log(`\nMigration complete. Migrated: ${migratedCount}, Skipped: ${skippedCount}`);
}

main()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
