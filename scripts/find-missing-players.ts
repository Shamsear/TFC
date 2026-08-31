import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env') })
const prisma = new PrismaClient()

async function fetchTree(shaOrBranch: string) {
  const url = `https://api.github.com/repos/Shamsear/TFC-Images/git/trees/${shaOrBranch}`
  const res = await fetch(url, {
    headers: {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'TFC-Inspector'
    }
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

async function main() {
  try {
    // 1. Fetch cards list from GitHub
    console.log('Fetching GitHub folder tree...')
    const root = await fetchTree('main')
    const publicNode = root.tree.find((n: any) => n.path === 'public')
    const publicTree = await fetchTree(publicNode.sha)
    const cardsNode = publicTree.tree.find((n: any) => n.path === 'player_cards')
    const cardsTree = await fetchTree(cardsNode.sha)

    const cardsSet = new Set<string>()
    for (const file of cardsTree.tree || []) {
      const id = file.path.split('.')[0]
      if (id) cardsSet.add(id)
    }

    console.log(`GitHub cards count: ${cardsSet.size}`)

    // 2. Fetch all players from DB
    const allPlayers = await prisma.base_players.findMany({
      select: {
        id: true,
        player_id: true,
        name: true
      }
    })

    const missing = allPlayers.filter(p => {
      const id = p.player_id || p.id
      return !cardsSet.has(id)
    })

    console.log(`Found ${missing.length} players missing cards in database:\n`)

    for (const p of missing) {
      const id = p.player_id || p.id
      const pesdbUrl = `https://pesdb.net/assets/img/card/f${id}.png`
      
      // Check if image exists on PESDB
      const res = await fetch(pesdbUrl, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      })
      
      console.log(`- Player: "${p.name}" | ID: "${id}" | PESDB Card URL: ${pesdbUrl} | Status: ${res.status}`)
    }

  } catch (err) {
    console.error('Failed:', err)
  } finally {
    await prisma.$disconnect()
  }
}

main()
