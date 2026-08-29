import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { createAuditLog } from '@/lib/audit'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (session?.user?.role !== 'SUPER_ADMIN' && session?.user?.role !== 'SUB_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { playerId, imageType } = await request.json()

    if (!playerId || !imageType || (imageType !== 'photo' && imageType !== 'card')) {
      return NextResponse.json({ error: 'Invalid parameters: playerId and imageType ("photo" or "card") are required.' }, { status: 400 })
    }

    const githubToken = process.env.GITHUB_TOKEN || process.env.GITHUB_PAT
    if (!githubToken) {
      return NextResponse.json({ error: 'GitHub configuration missing on server.' }, { status: 500 })
    }

    const repoOwner = 'Shamsear'
    const repoName = 'TFC-Images'
    const extension = imageType === 'photo' ? 'webp' : 'png'
    const folder = imageType === 'photo' ? 'player_photos' : 'player_cards'
    const githubPath = `public/${folder}/${playerId}.${extension}`

    // 1. Get the current file SHA from GitHub (needed to perform a deletion commit)
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

    if (!checkResponse.ok) {
      if (checkResponse.status === 404) {
        return NextResponse.json({ error: `Image not found on GitHub repository: ${githubPath}` }, { status: 404 })
      }
      const checkError = await checkResponse.json().catch(() => ({}))
      throw new Error(`GitHub check failed: ${checkError.message || 'Unknown error'}`)
    }

    const fileInfo = await checkResponse.json()
    const sha = fileInfo.sha

    if (!sha) {
      throw new Error('Failed to retrieve file SHA from GitHub.')
    }

    // 2. Perform file deletion commit on GitHub
    const deleteUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${githubPath}`
    const commitMessage = `Delete player ${imageType} for Player ID ${playerId}`

    const deleteResponse = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'TFC-Admin-Portal'
      },
      body: JSON.stringify({
        message: commitMessage,
        sha
      })
    })

    if (!deleteResponse.ok) {
      const deleteError = await deleteResponse.json().catch(() => ({}))
      throw new Error(`GitHub deletion failed: ${deleteError.message || 'Unknown error'}`)
    }

    // 3. Create Audit Log
    try {
      await createAuditLog({
        userId: session.user.id,
        userEmail: session.user.email || '',
        userRole: session.user.role,
        action: 'UPLOAD_PLAYER_IMAGE', // Reusing UPLOAD_PLAYER_IMAGE since it's the only image action in AuditAction
        entityType: imageType === 'photo' ? 'PLAYER_PHOTO' : 'PLAYER_CARD',
        entityId: playerId,
        entityName: `DELETED_${imageType.toUpperCase()}`,
        details: {
          playerId,
          imageType,
          action: 'DELETE',
          githubPath,
          deletedSha: sha
        },
        ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown",
        userAgent: request.headers.get("user-agent") || "unknown",
      })
    } catch (auditError) {
      console.error('Failed to log delete audit record:', auditError)
    }

    return NextResponse.json({
      success: true,
      message: `Successfully deleted player ${imageType} (${playerId}.${extension})`
    })

  } catch (error) {
    console.error('[API POST] Delete player image failed:', error)
    return NextResponse.json(
      { error: 'An error occurred during deletion.', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
