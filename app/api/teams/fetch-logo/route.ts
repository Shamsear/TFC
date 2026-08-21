import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { logError, extractRequestContext } from "@/lib/logger"

/**
 * POST /api/teams/fetch-logo
 * Searches TheSportsDB for a team badge by name, downloads it,
 * uploads to ImageKit, and returns the ImageKit URL.
 */
export async function POST(request: NextRequest) {
  const context = extractRequestContext(request)

  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "SUB_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { teamName } = await request.json()
    if (!teamName || typeof teamName !== "string" || teamName.trim() === "") {
      return NextResponse.json({ error: "Team name is required" }, { status: 400 })
    }

    // 1. Search TheSportsDB
    const searchUrl = `https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(teamName.trim())}`
    const searchRes = await fetch(searchUrl)
    const searchData = await searchRes.json()

    const team = searchData.teams?.[0]
    if (!team?.strBadge) {
      return NextResponse.json({ error: "No logo found for this team" }, { status: 404 })
    }

    // 2. Download the badge
    const badgeRes = await fetch(team.strBadge)
    if (!badgeRes.ok) {
      return NextResponse.json({ error: "Failed to download logo" }, { status: 502 })
    }

    const arrayBuffer = await badgeRes.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // 3. Upload to ImageKit
    const ImageKit = (await import("imagekit")).default
    const imagekit = new ImageKit({
      publicKey: process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY!,
      privateKey: process.env.IMAGEKIT_PRIVATE_KEY!,
      urlEndpoint: process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT!,
    })

    const slug = teamName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    const uploadResult = await imagekit.upload({
      file: buffer,
      fileName: `team-logo-${slug}.png`,
      folder: "/turf-cats/teams",
      useUniqueFileName: true,
    })

    return NextResponse.json({
      logoUrl: uploadResult.url,
      matchedTeam: team.strTeam,
    })
  } catch (error) {
    logError("Failed to fetch team logo", error, context)
    return NextResponse.json(
      { error: "Failed to fetch team logo. Please try again." },
      { status: 500 }
    )
  }
}
