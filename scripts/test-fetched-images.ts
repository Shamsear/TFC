import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const teamNames = [
    'AS Monaco',
    'Bayer Leverkusen',
    'Burnley FC',
    'FC Porto',
    'FC Red Bull Salzburg',
    'Galatasaray',
    'Crystal Palace FC',
    'Inter Miami',
    'Napoli',
    'PSV'
  ]

  const teams = await prisma.teams.findMany({
    where: { name: { in: teamNames } }
  })

  console.log(`Checking ${teams.length} teams...`)

  for (const team of teams) {
    try {
      console.log(`Team: ${team.name} | Logo URL: ${team.logoUrl}`)
      const res = await fetch(team.logoUrl)
      const contentType = res.headers.get('content-type')
      const contentLength = res.headers.get('content-length')
      const text = await res.text()
      
      const isPNG = text.startsWith('\x89PNG') || text.startsWith('PNG')
      const isSVG = text.includes('<svg') || text.startsWith('<?xml')
      
      console.log(`- Status: ${res.status} ${res.statusText}`)
      console.log(`- Format detected: ${isPNG ? 'PNG' : isSVG ? 'SVG' : 'UNKNOWN'}`)
      console.log(`- Content-Type: ${contentType}`)
      console.log(`- Content-Length: ${contentLength}`)
      console.log(`- First 60 chars: "${text.substring(0, 60)}"\n`)
    } catch (err) {
      console.error(`- Failed to fetch logo for ${team.name}:`, err)
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
