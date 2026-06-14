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
        { error: 'Unauthorized. You must be an administrator to upload images.' },
        { status: 401 }
      )
    }

    // Get form data
    let formData
    try {
      formData = await request.formData()
    } catch (parseError) {
      logError('Failed to parse form data in upload image request', parseError, context)
      return NextResponse.json(
        { error: 'Invalid form data. Please ensure you are uploading correctly.' },
        { status: 400 }
      )
    }

    const file = formData.get('file') as File
    const playerId = formData.get('playerId') as string
    const imageType = formData.get('imageType') as 'photo' | 'card'

    if (!file || !playerId || !imageType) {
      return NextResponse.json(
        { error: 'Missing required fields: file, playerId, and imageType are required.' },
        { status: 400 }
      )
    }

    if (imageType !== 'photo' && imageType !== 'card') {
      return NextResponse.json(
        { error: 'Invalid imageType. Must be "photo" or "card".' },
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
      logError(
        'GitHub configuration missing',
        new Error('Missing GITHUB_TOKEN or GITHUB_PAT environment variables'),
        context
      )
      return NextResponse.json(
        { error: 'GitHub storage service is not configured on the server. Please define GITHUB_TOKEN in the environment.' },
        { status: 500 }
      )
    }

    // Convert file to buffer
    let buffer: Buffer
    try {
      const bytes = await file.arrayBuffer()
      buffer = Buffer.from(bytes)
    } catch (readError) {
      logError('Failed to read file buffer', readError, { ...context, fileName: file.name })
      return NextResponse.json(
        { error: 'Failed to read uploaded file. Please try again.' },
        { status: 400 }
      )
    }

    const extension = imageType === 'photo' ? 'webp' : 'png'
    const githubPath = `public/player_${imageType}s/${playerId}.${extension}`
    const repoOwner = 'Shamsear'
    const repoName = 'TFC-Images'
    
    // 1. Check if file already exists in GitHub repository to get its SHA
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
      // If check fails, we proceed without SHA (GitHub will return 409 if it exists)
      console.warn('Failed to check existing file on GitHub:', checkError)
    }

    // Base64 encode the image content
    const base64Content = buffer.toString('base64')

    // 2. Upload/Commit file to GitHub repository
    const uploadUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${githubPath}`
    const commitMessage = `Upload player ${imageType} for Player ID ${playerId}`
    
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
        entityType: imageType === 'photo' ? 'PLAYER_PHOTO' : 'PLAYER_CARD',
        entityId: playerId,
        entityName: `${playerId}.${extension}`,
        details: {
          playerId,
          imageType,
          githubPath,
          sizeBytes: buffer.length,
          overwritten: !!existingSha,
          htmlUrl: uploadData.content?.html_url
        },
        ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown",
        userAgent: request.headers.get("user-agent") || "unknown",
      })
    } catch (auditError) {
      // Do not fail the request if audit logging fails, just log it
      console.error('Failed to log image upload audit record:', auditError)
    }

    return NextResponse.json({
      success: true,
      message: `Successfully uploaded player ${imageType} to GitHub.`,
      path: githubPath,
      htmlUrl: uploadData.content?.html_url,
      downloadUrl: uploadData.content?.download_url
    })

  } catch (error) {
    logError('Image upload process failed', error, context)
    return NextResponse.json(
      { 
        error: 'An error occurred during the upload process. Please try again.',
        details: process.env.NODE_ENV === 'development' && error instanceof Error 
          ? error.message 
          : undefined
      },
      { status: 500 }
    )
  }
}
