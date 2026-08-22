import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/auth/find-email
 * Public endpoint: looks up login email by team name or manager/user name.
 *
 * Two search paths:
 *  1. Search **users** by name → resolve their current team via teamId
 *  2. Search **teams** by name → include teamManagers linked to each team
 *
 * Returns the *latest* team association for each manager (users.teamId
 * always points to the team the manager is currently on).
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
    const resultsMap = new Map<string, TeamResult>();

    // ── Path 1: Search users by name (TEAM_MANAGER, active) ───────────
    const matchingUsers = await prisma.users.findMany({
      where: {
        role: "TEAM_MANAGER",
        isActive: true,
        name: { contains: searchTerm, mode: "insensitive" },
      },
      select: {
        id: true,
        email: true,
        name: true,
        team: {
          select: {
            id: true,
            name: true,
            managerName: true,
            logoUrl: true,
          },
        },
      },
      take: 10,
    });

    for (const user of matchingUsers) {
      if (user.team) {
        const key = user.team.id; // deduplicate by team ID
        resultsMap.set(key, {
          teamName: user.team.name,
          managerName: user.team.managerName,
          logoUrl: user.team.logoUrl,
          maskedEmail: maskEmail(user.email),
          email: user.email,
          userName: user.name || user.team.managerName,
        });
      }
    }

    // ── Path 2: Search teams by name ──────────────────────────────────
    const matchingTeams = await prisma.teams.findMany({
      where: {
        name: { contains: searchTerm, mode: "insensitive" },
      },
      include: {
        teamManagers: {
          where: { role: "TEAM_MANAGER", isActive: true },
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      take: 10,
    });

    for (const team of matchingTeams) {
      if (!resultsMap.has(team.id)) {
        const manager = team.teamManagers[0];
        resultsMap.set(team.id, {
          teamName: team.name,
          managerName: team.managerName,
          logoUrl: team.logoUrl,
          maskedEmail: manager ? maskEmail(manager.email) : null,
          email: manager?.email || null,
          userName: manager?.name || team.managerName,
        });
      }
    }

    const results = Array.from(resultsMap.values()).slice(0, 10);

    if (results.length === 0) {
      return NextResponse.json(
        {
          error: "No teams found matching your search. Try a different name.",
          teams: [],
        },
        { status: 200 }
      );
    }

    return NextResponse.json({ teams: results });
  } catch (error) {
    console.error("Find email lookup failed:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again later." },
      { status: 500 }
    );
  }
}

// ── Types ─────────────────────────────────────────────────────────────

type TeamResult = {
  teamName: string;
  managerName: string;
  logoUrl: string;
  maskedEmail: string | null;
  email: string | null;
  userName: string;
};

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
