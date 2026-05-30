import { prisma } from '../lib/prisma'
import { generateTeamId } from '../lib/id-generator'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

async function main() {
  console.log('🦁 Creating Aston Villa Team with Manager TFCMGR-35 (Shameenraja)...\n')

  const teamName = 'Aston Villa'
  const managerId = 'TFCMGR-35'
  const managerName = 'Shameenraja'

  // 1. Verify manager TFCMGR-35 exists
  const manager = await prisma.managers.findUnique({
    where: { id: managerId },
  })

  if (!manager) {
    console.error(`❌ Manager with ID '${managerId}' was not found in the database.`)
    process.exit(1)
  }
  console.log(`ℹ️ Found Manager: ${manager.name} (ID: ${manager.id})`)

  // 2. Check if team already exists
  const existingTeam = await prisma.teams.findFirst({
    where: {
      name: {
        equals: teamName,
        mode: 'insensitive',
      },
    },
  })

  if (existingTeam) {
    console.log(`⚠️ Team '${teamName}' already exists in the database (ID: ${existingTeam.id}).`)
    return
  }

  // 3. Generate a new Team ID using generateTeamId()
  const teamId = await generateTeamId()
  console.log(`🔑 Generated New Team ID: ${teamId}`)

  // 4. Create the team in the 'teams' table
  const team = await prisma.teams.create({
    data: {
      id: teamId,
      name: teamName,
      managerName: managerName,
      logoUrl: '/team-logos/default.png',
      updatedAt: new Date(),
    },
  })
  console.log(`✅ Created Team '${team.name}' with ID '${team.id}'.`)

  // 5. Update or link the manager to the new team in 'manager_teams'
  // First, deactivate any previous links or just set isCurrent = false for previous teams of this manager
  await prisma.manager_teams.updateMany({
    where: { managerId: managerId },
    data: { isCurrent: false },
  })

  // Upsert the new link
  await prisma.manager_teams.upsert({
    where: {
      managerId_teamId: {
        managerId: managerId,
        teamId: teamId,
      },
    },
    update: {
      isCurrent: true,
    },
    create: {
      managerId: managerId,
      teamId: teamId,
      isCurrent: true,
    },
  })
  console.log(`🔗 Linked Manager '${manager.name}' (ID: ${managerId}) to Team '${team.name}' (ID: ${teamId}) in 'manager_teams'.`)

  // 6. Update the manager's user account with the new teamId context
  const associatedUser = await prisma.users.findFirst({
    where: { managerId: managerId },
  })

  if (associatedUser) {
    await prisma.users.update({
      where: { id: associatedUser.id },
      data: { teamId: teamId },
    })
    console.log(`👤 Updated User '${associatedUser.email}' active team context to '${teamId}'.`)
  } else {
    console.log(`⚠️ Note: No user login account was found linked to manager ID '${managerId}'.`)
  }

  console.log('\n🎉 Successfully finished creating the team and updating all manager associations!')
}

main()
  .catch((e) => {
    console.error('\n❌ Fatal Error during execution:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
