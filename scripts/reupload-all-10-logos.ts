import { PrismaClient } from '@prisma/client'
import ImageKit from 'imagekit'
import * as dotenv from 'dotenv'

dotenv.config()

const prisma = new PrismaClient()

// 10 teams that we updated
const TARGET_TEAMS = [
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

async function main() {
  console.log('🧪 Starting re-upload script for 10 target teams...\n')

  const publicKey = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY
  const urlEndpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT

  if (!publicKey || !privateKey || !urlEndpoint) {
    console.error('❌ ImageKit credentials are not configured in environment!')
    process.exit(1)
  }

  const imagekit = new ImageKit({
    publicKey,
    privateKey,
    urlEndpoint
  })

  // Fetch target teams
  const teams = await prisma.teams.findMany({
    where: {
      name: {
        in: TARGET_TEAMS
      }
    }
  })

  console.log(`Found ${teams.length} teams to update.`)

  for (const team of teams) {
    try {
      console.log(`\nProcessing: ${team.name}...`)
      
      const searchUrl = `https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(team.name.trim())}`
      const searchRes = await fetch(searchUrl)
      if (!searchRes.ok) {
        throw new Error(`TheSportsDB search failed: ${searchRes.status}`)
      }
      
      const searchData = await searchRes.json()
      const dbTeam = searchData.teams?.[0]
      let logoSourceUrl = dbTeam?.strBadge

      if (!logoSourceUrl) {
        console.warn(`⚠️ No logo found on TheSportsDB for team: ${team.name}. Using fallback...`)
        // Fallbacks (Wikimedia PNGs / known working badge URLs)
        if (team.name === 'AS Monaco') {
          logoSourceUrl = 'https://upload.wikimedia.org/wikipedia/it/6/65/AS_Monaco.png'
        } else if (team.name === 'Bayer Leverkusen') {
          logoSourceUrl = 'https://upload.wikimedia.org/wikipedia/commons/e/e8/Bayer_04_Leverkusen_Logo.png'
        } else if (team.name === 'Burnley FC') {
          logoSourceUrl = 'https://upload.wikimedia.org/wikipedia/it/1/15/Burnley_F.C._logo.png'
        } else if (team.name === 'FC Porto') {
          logoSourceUrl = 'https://upload.wikimedia.org/wikipedia/it/c/c5/FC_Porto_logo.png'
        } else if (team.name === 'FC Red Bull Salzburg') {
          logoSourceUrl = 'https://upload.wikimedia.org/wikipedia/commons/2/2c/FC_Red_Bull_Salzburg_Logo.png'
        } else if (team.name === 'Galatasaray') {
          logoSourceUrl = 'https://upload.wikimedia.org/wikipedia/it/f/f6/Galatasaray_logo.png'
        } else if (team.name === 'Crystal Palace FC' || team.name === 'Crystal Palace') {
          logoSourceUrl = 'https://upload.wikimedia.org/wikipedia/it/0/0c/Crystal_Palace_logo.png'
        } else if (team.name === 'Inter Miami') {
          logoSourceUrl = 'https://upload.wikimedia.org/wikipedia/it/6/60/Inter_Miami_CF_logo.png'
        } else if (team.name === 'Napoli') {
          logoSourceUrl = 'https://upload.wikimedia.org/wikipedia/it/4/4e/SSC_Napoli_logo_2024.png'
        } else if (team.name === 'PSV') {
          logoSourceUrl = 'https://upload.wikimedia.org/wikipedia/it/b/be/PSV_Eindhoven_logo.png'
        }
      }

      if (!logoSourceUrl) {
        console.error(`❌ No source logo URL found for ${team.name}`)
        continue
      }

      console.log(`Downloading crest for ${team.name} from: ${logoSourceUrl}...`)
      
      // Delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 2000))

      const badgeRes = await fetch(logoSourceUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      })
      if (!badgeRes.ok) {
        throw new Error(`Failed to download logo from source: ${badgeRes.status} ${badgeRes.statusText}`)
      }

      const arrayBuffer = await badgeRes.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      const slug = team.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
      const fileName = `team-logo-${slug}-${Date.now()}.png`

      console.log(`Uploading ${fileName} to ImageKit...`)
      const uploadResult = await imagekit.upload({
        file: buffer,
        fileName,
        folder: "/turf-cats/teams",
        useUniqueFileName: true,
      })

      console.log(`✅ Uploaded: ${uploadResult.url}`)

      // Update database
      await prisma.teams.update({
        where: { id: team.id },
        data: { logoUrl: uploadResult.url }
      })

      console.log(`💾 Saved to DB for team: ${team.name}`)
    } catch (err) {
      console.error(`❌ Error updating logo for ${team.name}:`, err)
    }
  }

  console.log('\n🎉 Finished re-uploading all logos!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
