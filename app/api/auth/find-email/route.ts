import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/auth/find-email
 * Public endpoint: looks up login email by team name or manager name.
 * Returns matching teams with logos and partially masked emails for verification.
 */
export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();

    if (!query || typeof query !== "string" || query.trim().length < 2) {
      return NextResponse.json(
        { error: "Please enter at least 2 characters to search." },
        { status: 400 }
      );
    }

    const searchTerm = query.trim();

    // Search for teams matching name or managerName
    const teams = await prisma.teams.findMany({
      where: {
        OR: [
          { name: { contains: searchTerm, mode: "insensitive" } },
          { managerName: { contains: searchTerm, mode: "insensitive" } },
        ],
      },
      include: {
        teamManagers: {
          where: { role: "TEAM_MANAGER", isActive: true },
          select: {
            email: true,
            name: true,
          },
        },
      },
      take: 10,
    });

    if (teams.length === 0) {
      return NextResponse.json(
        {
          error: "No teams found matching your search. Try a different name.",
          teams: [],
        },
        { status: 200 }
      );
    }

    // Return teams with masked emails for verification and full email for reveal
    const results = teams.map((team) => ({
      teamName: team.name,
      managerName: team.managerName,
      logoUrl: team.logoUrl,
      maskedEmail: team.teamManagers[0]
        ? maskEmail(team.teamManagers[0].email)
        : null,
      email: team.teamManagers[0]?.email || null,
      userName: team.teamManagers[0]?.name || team.managerName,
    }));

    return NextResponse.json({ teams: results });
  } catch (error) {
    console.error("Find email lookup failed:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again later." },
      { status: 500 }
    );
  }
}

/**
 * Partially masks an email address for privacy.
 * e.g. "john@turf_cats.com" -> "j***n@turf_cats.com"
 */
function maskEmail(email: string): string {
  const [localPart, domain] = email.split("@");
  if (!localPart || !domain) return "***";

  if (localPart.length <= 2) {
    return `${localPart[0]}***@${domain}`;
  }

  return `${localPart[0]}${"*".repeat(localPart.length - 2)}${localPart[localPart.length - 1]}@${domain}`;
}
