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

    // 1. Fetch entire file tree recursively from GitHub repository
    const treeUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/git/trees/main?recursive=1`
    const treeRes = await fetch(treeUrl, {
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'TFC-Admin-Portal'
      },
      next: { revalidate: 60 } // cache file tree for 60 seconds to avoid hitting rate limits too fast
    })

    if (!treeRes.ok) {
      throw new Error(`GitHub Git Trees API returned status ${treeRes.status}`)
    }

    const treeData = await treeRes.json()
    const files = treeData.tree || []

    const photosSet = new Set<string>()
    const cardsSet = new Set<string>()

    for (const file of files) {
      if (file.type !== 'blob') continue
      
      if (file.path.startsWith('public/player_photos/')) {
        const id = file.path.split('/').pop()?.split('.')[0]
        if (id) photosSet.add(id)
      } else if (file.path.startsWith('public/player_cards/')) {
        const id = file.path.split('/').pop()?.split('.')[0]
        if (id) cardsSet.add(id)
      }
    }

    // 2. Fetch all players from database
    const allPlayers = await prisma.base_players.findMany({
      select: {
        id: true,
        player_id: true,
        name: true
      }
    })

    // 3. Filter missing
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
