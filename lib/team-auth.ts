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
