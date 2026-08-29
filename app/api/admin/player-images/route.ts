import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

async function fetchGitHubTree(sha: string, token: string) {
  const res = await fetch(`https://api.github.com/repos/Shamsear/TFC-Images/git/trees/${sha}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'TFC-Admin-Portal'
    }
  })
  if (!res.ok) throw new Error(`GitHub directory tree fetch failed: status ${res.status}`)
  return res.json()
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (session?.user?.role !== 'SUPER_ADMIN' && session?.user?.role !== 'SUB_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '12', 10)
    const query = searchParams.get('query') || ''

    const githubToken = process.env.GITHUB_TOKEN || process.env.GITHUB_PAT
    if (!githubToken) {
      return NextResponse.json({ error: 'GitHub configuration missing on server.' }, { status: 500 })
    }

    // 1. Fetch directories tree from GitHub step-by-step
    const rootRes = await fetch('https://api.github.com/repos/Shamsear/TFC-Images/git/trees/main', {
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'TFC-Admin-Portal'
      }
    })
    if (!rootRes.ok) throw new Error(`Root tree fetch failed: status ${rootRes.status}`)
    const rootData = await rootRes.json()
    const publicNode = rootData.tree?.find((n: any) => n.path === 'public')
    if (!publicNode) throw new Error('No public folder found on repository.')

    const publicData = await fetchGitHubTree(publicNode.sha, githubToken)
    const photosNode = publicData.tree?.find((n: any) => n.path === 'player_photos')
    const cardsNode = publicData.tree?.find((n: any) => n.path === 'player_cards')

    if (!photosNode || !cardsNode) {
      throw new Error('Missing player_photos or player_cards directory on repository.')
    }

    // Fetch both photo and card tree lists in parallel
    const [photosTree, cardsTree] = await Promise.all([
      fetchGitHubTree(photosNode.sha, githubToken),
      fetchGitHubTree(cardsNode.sha, githubToken)
    ])

    const photosSet = new Set<string>()
    const cardsSet = new Set<string>()

    for (const f of photosTree.tree || []) {
      if (f.type !== 'blob') continue
      const id = f.path.split('.')[0]
      if (id) photosSet.add(id)
    }

    for (const f of cardsTree.tree || []) {
      if (f.type !== 'blob') continue
      const id = f.path.split('.')[0]
      if (id) cardsSet.add(id)
    }

    // 2. Query database players matching search term
    const whereClause: any = {}
    if (query) {
      whereClause.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { player_id: { contains: query } },
        { id: { contains: query } }
      ]
    }

    const totalCount = await prisma.base_players.count({ where: whereClause })
    const totalPages = Math.ceil(totalCount / limit)
    const offset = (page - 1) * limit

    const matchedPlayers = await prisma.base_players.findMany({
      where: whereClause,
      select: {
        id: true,
        player_id: true,
        name: true
      },
      orderBy: { name: 'asc' },
      take: limit,
      skip: offset
    })

    // 3. Map status flags
    const players = matchedPlayers.map(p => {
      const id = p.player_id || p.id
      return {
        id,
        name: p.name,
        hasPhoto: photosSet.has(id),
        hasCard: cardsSet.has(id)
      }
    })

    return NextResponse.json({
      players,
      totalCount,
      totalPages,
      currentPage: page
    })

  } catch (error) {
    console.error('[API GET] Player images list failed:', error)
    return NextResponse.json(
      { error: 'Failed to fetch player images list', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
