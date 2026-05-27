import { auth } from './auth'
import { prisma } from './prisma'

/**
 * Get the current team manager's session with team info
 * Returns null if not authenticated or not a team manager
 */
export async function getTeamManagerSession() {
  const session = await auth()
  
  if (!session?.user || session.user.role !== 'TEAM_MANAGER') {
    return null
  }

  if (!session.user.teamId) {
    return null
  }

  return session
}

/**
 * Get the team for the current team manager
 * Returns null if not authenticated, not a team manager, or no team assigned
 */
export async function getTeamManagerTeam() {
  const session = await getTeamManagerSession()
  
  if (!session?.user.teamId) {
    return null
  }

  const team = await prisma.teams.findUnique({
    where: { id: session.user.teamId }
  })

  return team
}

/**
 * Check if the current user is a team manager for a specific team
 */
export async function isTeamManager(teamId: string): Promise<boolean> {
  const session = await auth()
  
  if (!session?.user || session.user.role !== 'TEAM_MANAGER') {
    return false
  }

  return session.user.teamId === teamId
}

/**
 * Verify team manager has access to their team
 * Throws error if not authorized
 */
export async function requireTeamManager() {
  const session = await getTeamManagerSession()
  
  if (!session) {
    throw new Error('Unauthorized: Team manager access required')
  }

  return session
}

/**
 * Get team manager's team or throw error
 */
export async function requireTeamManagerTeam() {
  const team = await getTeamManagerTeam()
  
  if (!team) {
    throw new Error('Unauthorized: No team assigned')
  }

  return team
}

/**
 * Check if user can view team data
 * Team managers can view all teams (read-only for other teams)
 * Admins can view all teams
 */
export async function canViewTeam(teamId: string): Promise<boolean> {
  const session = await auth()
  
  if (!session?.user) {
    return false
  }

  // Admins can view all teams
  if (session.user.role === 'SUPER_ADMIN' || session.user.role === 'SUB_ADMIN') {
    return true
  }

  // Team managers can view all teams
  if (session.user.role === 'TEAM_MANAGER') {
    return true
  }

  return false
}

/**
 * Check if user can edit team data
 * Only team managers can edit their own team
 * Admins can edit all teams
 */
export async function canEditTeam(teamId: string): Promise<boolean> {
  const session = await auth()
  
  if (!session?.user) {
    return false
  }

  // Admins can edit all teams
  if (session.user.role === 'SUPER_ADMIN' || session.user.role === 'SUB_ADMIN') {
    return true
  }

  // Team managers can only edit their own team
  if (session.user.role === 'TEAM_MANAGER') {
    return session.user.teamId === teamId
  }

  return false
}

/**
 * Get assigned seasons for a user
 * Returns array of season IDs
 */
export async function getAssignedSeasons(userId: string): Promise<string[]> {
  const userSeasons = await prisma.sub_admin_seasons.findMany({
    where: { userId },
    select: { seasonId: true }
  })
  
  if (!userSeasons || userSeasons.length === 0) {
    return []
  }
  
  return userSeasons.map(s => s.seasonId)
}

/**
 * Check if user can access a specific season
 */
export async function canAccessSeason(userId: string, seasonId: string): Promise<boolean> {
  const assignedSeasons = await getAssignedSeasons(userId)
  
  // Empty array means access to all seasons (backward compatibility)
  if (assignedSeasons.length === 0) {
    return true
  }
  
  return assignedSeasons.includes(seasonId)
}

/**
 * Get seasons that the current team manager can access
 */
export async function getAccessibleSeasons() {
  const session = await auth()
  
  if (!session?.user) {
    return []
  }

  // Admins can access all seasons
  if (session.user.role === 'SUPER_ADMIN' || session.user.role === 'SUB_ADMIN') {
    return await prisma.seasons.findMany({
      orderBy: { createdAt: 'desc' }
    })
  }

  // Team managers can only access assigned seasons
  if (session.user.role === 'TEAM_MANAGER') {
    const assignedSeasonIds = await getAssignedSeasons(session.user.id)
    
    // Empty array means access to all seasons (backward compatibility)
    if (assignedSeasonIds.length === 0) {
      return await prisma.seasons.findMany({
        orderBy: { createdAt: 'desc' }
      })
    }
    
    return await prisma.seasons.findMany({
      where: {
        id: { in: assignedSeasonIds }
      },
      orderBy: { createdAt: 'desc' }
    })
  }

  return []
}

/**
 * Check if team is participating in active season
 * Returns { isParticipating, activeSeason, seasonTeam, team }
 */
export async function checkTeamSeasonParticipation() {
  const session = await auth()
  
  if (!session?.user?.teamId) {
    return { isParticipating: false, activeSeason: null, seasonTeam: null, team: null }
  }

  // Get team
  const team = await prisma.teams.findUnique({
    where: { id: session.user.teamId }
  })

  if (!team) {
    return { isParticipating: false, activeSeason: null, seasonTeam: null, team: null }
  }

  // Get active season
  const activeSeason = await prisma.seasons.findFirst({
    where: { isActive: true }
  })

  if (!activeSeason) {
    return { isParticipating: false, activeSeason: null, seasonTeam: null, team }
  }

  // Check if team is in active season
  const seasonTeam = await prisma.season_teams.findUnique({
    where: {
      seasonId_teamId: {
        seasonId: activeSeason.id,
        teamId: team.id
      }
    }
  })

  return {
    isParticipating: !!seasonTeam,
    activeSeason,
    seasonTeam,
    team
  }
}
