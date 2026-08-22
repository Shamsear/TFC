import { prisma } from "./prisma";

/**
 * Given a list of team IDs, returns a Map<teamId, managerName> using the
 * managers table via manager_teams (isCurrent=true).
 *
 * Falls back to the team's own managerName if no manager link exists.
 *
 * Usage:
 *   const mgrMap = await resolveTeamManagerNames(teamIds);
 *   const displayName = mgrMap.get(team.id) || team.managerName;
 */
export async function resolveTeamManagerNames(
  teamIds: string[],
  seasonId?: string
): Promise<Map<string, string>> {
  if (teamIds.length === 0) return new Map();

  // 1. Try manager_teams.isCurrent links
  const links = await prisma.manager_teams.findMany({
    where: {
      teamId: { in: teamIds },
      isCurrent: true,
    },
    select: {
      teamId: true,
      manager: { select: { name: true } },
    },
  });

  const map = new Map<string, string>();
  const unresolved: string[] = [];
  for (const link of links) {
    if (link.manager?.name) {
      map.set(link.teamId, link.manager.name);
    }
  }
  for (const id of teamIds) {
    if (!map.has(id)) unresolved.push(id);
  }

  // 2. Fallback: latest season_teams.managerName for teams without a current link
  if (unresolved.length > 0) {
    const seasonTeams = await prisma.season_teams.findMany({
      where: {
        teamId: { in: unresolved },
        ...(seasonId ? { seasonId } : {}),
        managerName: { not: null },
      },
      select: {
        teamId: true,
        managerName: true,
      },
      orderBy: seasonId ? undefined : { createdAt: 'desc' },
      ...(seasonId ? {} : {}),
    });
    // Keep first per team (latest if ordered desc)
    const seen = new Set<string>();
    for (const st of seasonTeams) {
      if (!seen.has(st.teamId) && st.managerName) {
        map.set(st.teamId, st.managerName);
        seen.add(st.teamId);
      }
    }
  }

  return map;
}

/**
 * Given an array of objects with a `team` property containing `id` and
 * `managerName`, returns a new array with `managerName` overridden by the
 * resolved current manager name.
 */
export async function withResolvedManagerNames<
  T extends { team: { id: string; managerName: string } }
>(items: T[]): Promise<T[]> {
  const teamIds = [...new Set(items.map((i) => i.team.id))];
  const mgrMap = await resolveTeamManagerNames(teamIds);

  return items.map((item) => ({
    ...item,
    team: {
      ...item.team,
      managerName: mgrMap.get(item.team.id) || item.team.managerName,
    },
  }));
}

/**
 * Given an array of objects with a `teamId` and `team.managerName` property
 * nested inside, returns the resolved manager name for each team.
 */
export async function resolveManagersForSeasonTeams<
  T extends { teamId: string; team: { id: string; managerName: string } }
>(items: T[]): Promise<Map<string, string>> {
  const teamIds = [...new Set(items.map((i) => i.teamId))];
  return resolveTeamManagerNames(teamIds);
}
