import { PrismaClient } from '@prisma/client'

// Singleton cache across all imports in the same process
const managerCache = new Map<string, string | null>()

/**
 * Resolve a manager ID from a manager name (case-insensitive).
 * Uses a process-level cache to avoid repeated DB lookups.
 * Returns null if no matching manager is found.
 */
export async function resolveManagerId(
  prisma: PrismaClient,
  managerName: string | null
): Promise<string | null> {
  if (!managerName) return null
  const key = managerName.toLowerCase()
  if (managerCache.has(key)) return managerCache.get(key)!

  const record = await prisma.managers.findFirst({
    where: { name: { equals: managerName, mode: 'insensitive' } },
  })
  managerCache.set(key, record?.id || null)
  return record?.id || null
}

/**
 * Resolve a manager ID with fallback to team managerLinks.
 * Prefer this when you have both season_teams.managerName and team.managerLinks.
 */
export async function resolveManagerIdWithFallback(
  prisma: PrismaClient,
  managerName: string | null,
  fallbackManagerId: string | null
): Promise<string | null> {
  return (await resolveManagerId(prisma, managerName)) || fallbackManagerId || null
}
