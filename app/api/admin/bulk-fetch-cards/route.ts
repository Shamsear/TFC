import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { createAuditLog } from '@/lib/audit'

export const dynamic = 'force-dynamic'

async function fetchAndUploadSingleCard(playerId: string, githubToken: string) {
  const pesdbUrl = `https://pesdb.net/assets/img/card/f${playerId}.png`
  
  // 1. Fetch from PESDB
  const badgeRes = await fetch(pesdbUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  })

  if (!badgeRes.ok) {
    throw new Error(`PESDB returned status ${badgeRes.status}`)
  }

  const arrayBuffer = await badgeRes.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const githubPath = `public/player_cards/${playerId}.png`
  const repoOwner = 'Shamsear'
  const repoName = 'TFC-Images'
  
  // 2. Check if file already exists in GitHub repository to get its SHA (optional for missing, but good safety)
  let existingSha: string | undefined = undefined
  try {
    const checkUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${githubPath}`
    const checkResponse = await fetch(checkUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'TFC-Admin-Portal'
      },
      cache: 'no-store'
    })

    if (checkResponse.ok) {
      const fileInfo = await checkResponse.json()
      existingSha = fileInfo.sha
    }
  } catch (checkError) {
    // Ignore and proceed
  }

  // Base64 encode
  const base64Content = buffer.toString('base64')

  // 3. Upload/Commit to GitHub
  const uploadUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${githubPath}`
  const commitMessage = `Bulk fetch player card from PESDB for Player ID ${playerId}`
  
  const requestBody: any = {
    message: commitMessage,
    content: base64Content
  }

  if (existingSha) {
    requestBody.sha = existingSha
  }

  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${githubToken}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'User-Agent': 'TFC-Admin-Portal'
    },
    body: JSON.stringify(requestBody)
  })

  if (!uploadResponse.ok) {
    const errorData = await uploadResponse.json().catch(() => ({}))
    throw new Error(`GitHub upload failed: ${errorData.message || 'Unknown error'}`)
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth()
    if (session?.user?.role !== 'SUPER_ADMIN' && session?.user?.role !== 'SUB_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { playerIds } = await request.json()

    if (!playerIds || !Array.isArray(playerIds) || playerIds.length === 0) {
      return NextResponse.json({ error: 'Missing required field: playerIds array' }, { status: 400 })
    }

    if (playerIds.length > 30) {
      return NextResponse.json({ error: 'Batch size too large. Maximum 30 players per request.' }, { status: 400 })
    }

    const githubToken = process.env.GITHUB_TOKEN || process.env.GITHUB_PAT
    if (!githubToken) {
      return NextResponse.json({ error: 'GitHub configuration missing on server.' }, { status: 500 })
    }

    const results = await Promise.allSettled(
      playerIds.map(async (id) => {
        if (!/^\d+$/.test(id)) {
          throw new Error('Invalid Player ID format')
        }
        await fetchAndUploadSingleCard(id, githubToken)
        return id
      })
    )

    const successes: string[] = []
    const failures: Array<{ id: string; error: string }> = []

    results.forEach((res, i) => {
      const id = playerIds[i]
      if (res.status === 'fulfilled') {
        successes.push(id)
      } else {
        failures.push({
          id,
          error: res.reason instanceof Error ? res.reason.message : String(res.reason)
        })
      }
    })

    // Create Audit Log for the bulk action
    try {
      await createAuditLog({
        userId: session.user.id,
        userEmail: session.user.email || '',
        userRole: session.user.role,
        action: 'UPLOAD_PLAYER_IMAGE',
        entityType: 'PLAYER_CARD',
        entityName: `BULK_FETCH_${successes.length}_CARDS`,
        details: {
          requestedCount: playerIds.length,
          successCount: successes.length,
          failureCount: failures.length,
          successes,
          failures
        },
        ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown",
        userAgent: request.headers.get("user-agent") || "unknown",
      })
    } catch (auditError) {
      console.error('Failed to log bulk fetch audit record:', auditError)
    }

    return NextResponse.json({
      success: true,
      successCount: successes.length,
      failureCount: failures.length,
      successes,
      failures
    })

  } catch (error) {
    console.error('[API POST] Bulk fetch cards failed:', error)
    return NextResponse.json(
      { error: 'An error occurred during the bulk upload process.', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
