import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (session?.user?.role !== 'SUPER_ADMIN' && session?.user?.role !== 'SUB_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'card' // 'card' or 'photo'
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const query = searchParams.get('query') || ''

    const githubToken = process.env.GITHUB_TOKEN || process.env.GITHUB_PAT
    if (!githubToken) {
      return NextResponse.json({ error: 'GitHub configuration missing on server.' }, { status: 500 })
    }

    const repoOwner = 'Shamsear'
    const repoName = 'TFC-Images'

    // 1. Fetch root tree (non-recursive)
    const rootRes = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/git/trees/main`, {
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'TFC-Admin-Portal'
      }
    })
    if (!rootRes.ok) throw new Error(`Root tree fetch failed: status ${rootRes.status}`)
    const rootData = await rootRes.json()
    const publicNode = rootData.tree?.find((n: any) => n.path === 'public')
    if (!publicNode) throw new Error('No "public" directory found in repository.')

    // 2. Fetch public directory tree (non-recursive)
    const publicRes = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/git/trees/${publicNode.sha}`, {
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'TFC-Admin-Portal'
      }
    })
    if (!publicRes.ok) throw new Error(`Public folder fetch failed: status ${publicRes.status}`)
    const publicData = await publicRes.json()

    const photosNode = publicData.tree?.find((n: any) => n.path === 'player_photos')
    const cardsNode = publicData.tree?.find((n: any) => n.path === 'player_cards')

    if (!photosNode || !cardsNode) {
      throw new Error('Missing player_photos or player_cards directories in public/')
    }

    // 3. Fetch both folders in parallel by SHA (bypasses recursive limits/500 errors)
    const [photosRes, cardsRes] = await Promise.all([
      fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/git/trees/${photosNode.sha}`, {
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'TFC-Admin-Portal'
        }
      }),
      fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/git/trees/${cardsNode.sha}`, {
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'TFC-Admin-Portal'
        }
      })
    ])

    if (!photosRes.ok) throw new Error(`Photos folder fetch failed: status ${photosRes.status}`)
    if (!cardsRes.ok) throw new Error(`Cards folder fetch failed: status ${cardsRes.status}`)

    const photosData = await photosRes.json()
    const cardsData = await cardsRes.json()

    const photosSet = new Set<string>()
    const cardsSet = new Set<string>()

    // Populate sets with extracted filenames (player IDs)
    for (const file of photosData.tree || []) {
      if (file.type !== 'blob') continue
      const id = file.path.split('.')[0]
      if (id) photosSet.add(id)
    }

    for (const file of cardsData.tree || []) {
      if (file.type !== 'blob') continue
      const id = file.path.split('.')[0]
      if (id) cardsSet.add(id)
    }

    // 4. Fetch all players from database
    const allPlayers = await prisma.base_players.findMany({
      select: {
        id: true,
        player_id: true,
        name: true
      }
    })

    // 5. Filter missing
    let missing = allPlayers.filter(p => {
      const id = p.player_id || p.id
      return type === 'photo' ? !photosSet.has(id) : !cardsSet.has(id)
    })

    // Apply search filter if present
    if (query) {
      const lowerQuery = query.toLowerCase()
      missing = missing.filter(p => p.name.toLowerCase().includes(lowerQuery))
    }

    // Pagination
    const totalCount = missing.length
    const totalPages = Math.ceil(totalCount / limit)
    const startIndex = (page - 1) * limit
    const paginated = missing.slice(startIndex, startIndex + limit)

    return NextResponse.json({
      players: paginated,
      totalCount,
      totalPages,
      currentPage: page,
      stats: {
        totalPlayers: allPlayers.length,
        totalPhotos: photosSet.size,
        totalCards: cardsSet.size,
        missingPhotos: allPlayers.length - photosSet.size,
        missingCards: allPlayers.length - cardsSet.size
      }
    })

  } catch (error) {
    console.error('[API GET] Error checking missing images:', error)
    return NextResponse.json(
      { error: 'Failed to scan missing images', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
