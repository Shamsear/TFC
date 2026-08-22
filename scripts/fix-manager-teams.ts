/**
 * Repair manager_teams.isCurrent links based on season_teams data.
 * 
 * Usage: npx tsx scripts/fix-manager-teams.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('=== Fixing manager_teams.isCurrent based on latest season_teams data ===\n')

  // Get all managers
  const managers = await prisma.managers.findMany({
    select: { id: true, name: true }
  })

  // Get all season_teams ordered by season number (from ID)
  const allSeasonTeams = await prisma.season_teams.findMany({
    select: {
      managerName: true,
      teamId: true,
      seasonId: true,
      season: { select: { id: true, seasonNumber: true } }
    }
  })

  // Sort by season number descending to get latest first
  allSeasonTeams.sort((a, b) => {
    const numA = parseInt(a.season.id.replace('TFCS-', ''), 10) || 0
    const numB = parseInt(b.season.id.replace('TFCS-', ''), 10) || 0
    return numB - numA
  })

  let fixesApplied = 0

  // Debug: check Valdez specifically
  const valdezSeasonTeams = allSeasonTeams.filter(st => st.managerName?.toLowerCase() === 'valdez')
  console.log('Valdez season_teams:', JSON.stringify(valdezSeasonTeams.map(st => ({ seasonId: st.seasonId, teamId: st.teamId, seasonNum: st.season.seasonNumber })), null, 2))

  const valdezMgrLinks = await prisma.manager_teams.findMany({
    where: { manager: { name: { equals: 'Valdez', mode: 'insensitive' } } },
    include: { manager: true, team: true }
  })
  console.log('Valdez manager_teams:', JSON.stringify(valdezMgrLinks.map(l => ({ manager: l.manager.name, team: l.team.name, isCurrent: l.isCurrent })), null, 2))

  for (const mgr of managers) {
    // Find this manager's latest season_teams entry
    const latestEntry = allSeasonTeams.find(
      st => st.managerName && st.managerName.toLowerCase() === mgr.name.toLowerCase()
    )

    if (!latestEntry) continue

    // Check current manager_teams.isCurrent
    const currentLink = await prisma.manager_teams.findFirst({
      where: { managerId: mgr.id, isCurrent: true }
    })

    const correctTeamId = latestEntry.teamId

    if (currentLink && currentLink.teamId === correctTeamId) {
      // Already correct
      continue
    }

    console.log(`Fixing ${mgr.name}:`)
    if (currentLink) {
      console.log(`  Old: isCurrent → ${currentLink.teamId}`)
    } else {
      console.log(`  Old: no isCurrent link`)
    }
    console.log(`  New: isCurrent → ${correctTeamId} (from ${latestEntry.seasonId})`)

    // Deactivate all old isCurrent links
    await prisma.manager_teams.updateMany({
      where: { managerId: mgr.id, isCurrent: true },
      data: { isCurrent: false }
    })

    // Set correct link as isCurrent
    await prisma.manager_teams.upsert({
      where: { managerId_teamId: { managerId: mgr.id, teamId: correctTeamId } },
      update: { isCurrent: true },
      create: { managerId: mgr.id, teamId: correctTeamId, isCurrent: true },
    })

    fixesApplied++
    console.log(`  ✅ Fixed\n`)
  }

  console.log(`\n=== Done: ${fixesApplied} manager_teams.isCurrent links fixed ===`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
