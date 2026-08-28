import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { createAuditLog } from '@/lib/audit'
import { logError, extractRequestContext } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const context = extractRequestContext(request)

  try {
    // Check authentication
    const session = await auth()
    if (session?.user?.role !== 'SUPER_ADMIN' && session?.user?.role !== 'SUB_ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized. You must be an administrator to fetch cards.' },
        { status: 401 }
      )
    }

    const { playerId } = await request.json()

    if (!playerId) {
      return NextResponse.json(
        { error: 'Missing required field: playerId is required.' },
        { status: 400 }
      )
    }

    // Validate playerId format (must be numeric string)
    if (!/^\d+$/.test(playerId)) {
      return NextResponse.json(
        { error: 'Invalid Player ID. It must contain only digits.' },
        { status: 400 }
      )
    }

    // Get GitHub Token
    const githubToken = process.env.GITHUB_TOKEN || process.env.GITHUB_PAT
    if (!githubToken) {
      return NextResponse.json(
        { error: 'GitHub storage service is not configured on the server. Please define GITHUB_TOKEN in the environment.' },
        { status: 500 }
      )
    }

    // 1. Fetch from PESDB
    const pesdbUrl = `https://pesdb.net/assets/img/card/f${playerId}.png`
    console.log(`Downloading card for player ID ${playerId} from: ${pesdbUrl}...`)
    
    const badgeRes = await fetch(pesdbUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    })

    if (!badgeRes.ok) {
      return NextResponse.json(
        { error: `No card found for this player on PESDB (PESDB returned status ${badgeRes.status})` },
        { status: 404 }
      )
    }

    const arrayBuffer = await badgeRes.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const githubPath = `public/player_cards/${playerId}.png`
    const repoOwner = 'Shamsear'
    const repoName = 'TFC-Images'
    
    // 2. Check if file already exists in GitHub repository to get its SHA
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
      console.warn('Failed to check existing file on GitHub:', checkError)
    }

    // Base64 encode the image content
    const base64Content = buffer.toString('base64')

    // 3. Upload/Commit file to GitHub repository
    const uploadUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${githubPath}`
    const commitMessage = `Fetch and upload player card from PESDB for Player ID ${playerId}`
    
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
      logError(
        'GitHub upload failed',
        new Error(`GitHub API returned status ${uploadResponse.status}`),
        { ...context, githubError: errorData, path: githubPath }
      )

      return NextResponse.json(
        { 
          error: `Failed to upload to GitHub. ${errorData.message || 'Please verify repository permissions and token.'}` 
        },
        { status: uploadResponse.status }
      )
    }

    const uploadData = await uploadResponse.json()

    // Create Audit Log
    try {
      await createAuditLog({
        userId: session.user.id,
        userEmail: session.user.email || '',
        userRole: session.user.role,
        action: 'UPLOAD_PLAYER_IMAGE',
        entityType: 'PLAYER_CARD',
        entityId: playerId,
        entityName: `${playerId}.png`,
        details: {
          playerId,
          githubPath,
          sizeBytes: buffer.length,
          overwritten: !!existingSha,
          htmlUrl: uploadData.content?.html_url
        },
        ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown",
        userAgent: request.headers.get("user-agent") || "unknown",
      })
    } catch (auditError) {
      console.error('Failed to log card fetch audit record:', auditError)
    }

    return NextResponse.json({
      success: true,
      message: `Successfully fetched card from PESDB and uploaded to GitHub.`,
      path: githubPath,
      htmlUrl: uploadData.content?.html_url
    })

  } catch (error) {
    logError('Card fetch and upload process failed', error, context)
    return NextResponse.json(
      { 
        error: 'An error occurred during the process. Please try again.',
        details: process.env.NODE_ENV === 'development' && error instanceof Error 
          ? error.message 
          : undefined
      },
      { status: 500 }
    )
  }
}
