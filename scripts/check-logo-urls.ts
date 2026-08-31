import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const teams = await prisma.teams.findMany()
  console.log(`Checking HTTP accessibility of logos for ${teams.length} teams...`)

  let brokenCount = 0

  for (const team of teams) {
    const url = team.logoUrl
    if (!url) {
      console.log(`❌ Empty/Null Logo: ID: ${team.id} | Team: ${team.name}`)
      brokenCount++
      continue
    }

    // Skip local assets or already checked default placeholders
    if (url.startsWith('/')) {
      console.log(`⚠️ Local path (non-ImageKit): ID: ${team.id} | Team: ${team.name} | Path: ${url}`)
      brokenCount++
      continue
    }

    try {
      const res = await fetch(url, { method: 'HEAD' })
      if (!res.ok) {
        console.log(`❌ Broken Logo (${res.status}): ID: ${team.id} | Team: ${team.name} | URL: ${url}`)
        brokenCount++
      } else {
        console.log(`✅ OK (${res.status}): ID: ${team.id} | Team: ${team.name}`)
      }
    } catch (err) {
      console.log(`❌ Fetch Error: ID: ${team.id} | Team: ${team.name} | Error: ${err instanceof Error ? err.message : err}`)
      brokenCount++
    }
  }

  console.log(`\nValidation Complete. Total teams checked: ${teams.length}. Broken/Placeholder logos: ${brokenCount}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
