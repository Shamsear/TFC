import { prisma } from './prisma'

/**
 * Get the active season reliably by extracting season number from ID (TFCS-N).
 * Neither createdAt nor seasonNumber columns are reliable — use the ID.
 * Returns null if no active season found.
 */
export async function getActiveSeason() {
  const activeSeasons = await prisma.seasons.findMany({
    where: { isActive: true },
    select: { id: true, name: true, seasonNumber: true, isActive: true, startingPurse: true, createdAt: true, updatedAt: true }
  })

  if (activeSeasons.length === 0) return null
  if (activeSeasons.length === 1) return activeSeasons[0]

  // Sort by extracting number from ID (TFCS-N)
  return activeSeasons.sort((a, b) => {
    const numA = parseInt(a.id.replace('TFCS-', ''), 10) || 0
    const numB = parseInt(b.id.replace('TFCS-', ''), 10) || 0
    return numB - numA
  })[0]
}

/**
 * Get just the active season ID (for lightweight lookups).
 */
export async function getActiveSeasonId(): Promise<string | null> {
  const activeSeasons = await prisma.seasons.findMany({
    where: { isActive: true },
    select: { id: true }
  })

  if (activeSeasons.length === 0) return null
  if (activeSeasons.length === 1) return activeSeasons[0].id

  return activeSeasons.sort((a, b) => {
    const numA = parseInt(a.id.replace('TFCS-', ''), 10) || 0
    const numB = parseInt(b.id.replace('TFCS-', ''), 10) || 0
    return numB - numA
  })[0].id
}
