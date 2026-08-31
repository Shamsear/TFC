import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const teams = await prisma.teams.findMany()
  console.log(`Checking ${teams.length} teams in database:`)
  let missing = 0
  for (const t of teams) {
    const isDefault = !t.logoUrl || t.logoUrl.includes('default.png') || t.logoUrl.trim() === ''
    if (isDefault) {
      missing++
      console.log(`❌ Missing: ID: ${t.id} | Name: ${t.name} | Logo: ${t.logoUrl}`)
    } else {
      console.log(`✅ OK: ID: ${t.id} | Name: ${t.name} | Logo: ${t.logoUrl}`)
    }
  }
  console.log(`Total missing: ${missing}/${teams.length}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
