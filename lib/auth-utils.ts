import { auth } from "@/lib/auth"
import { UserRole } from "@prisma/client"
import { prisma } from "@/lib/prisma"

/**
 * Get the current session on the server side
 * Returns null if not authenticated
 */
export async function getSession() {
  return await auth()
}

/**
 * Get the current user from the session
 * Returns null if not authenticated
 */
export async function getCurrentUser() {
  const session = await auth()
  return session?.user ?? null
}

/**
 * Check if the current user has a specific role
 */
export async function hasRole(role: UserRole) {
  const user = await getCurrentUser()
  return user?.role === role
}

/**
 * Check if the current user is a Super Admin
 */
export async function isSuperAdmin() {
  return await hasRole("SUPER_ADMIN")
}

/**
 * Check if the current user is a Sub Admin
 */
export async function isSubAdmin() {
  return await hasRole("SUB_ADMIN")
}

/**
 * Check if the current user is authenticated
 */
export async function isAuthenticated() {
  const user = await getCurrentUser()
  return user !== null
}

/**
 * Require authentication - throws error if not authenticated
 * Use this in API routes or server components that require auth
 */
export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error("Unauthorized: Authentication required")
  }
  return user
}

/**
 * Require specific role - throws error if user doesn't have the role
 * Use this in API routes or server components that require specific roles
 */
export async function requireRole(role: UserRole) {
  const user = await requireAuth()
  if (user.role !== role) {
    throw new Error(`Unauthorized: ${role} role required`)
  }
  return user
}

/**
 * Require Super Admin role
 */
export async function requireSuperAdmin() {
  return await requireRole("SUPER_ADMIN")
}

/**
 * Require Sub Admin or Super Admin role
 */
export async function requireAdminRole() {
  const user = await requireAuth()
  if (user.role !== "SUPER_ADMIN" && user.role !== "SUB_ADMIN") {
    throw new Error("Unauthorized: Admin role required")
  }
  return user
}

/**
 * Check if a user ID corresponds to a Sub Admin or Super Admin
 */
export async function checkAdminRole(userId: string) {
  const user = await prisma.users.findUnique({
    where: { id: userId },
    select: { role: true }
  })
  return user?.role === 'SUPER_ADMIN' || user?.role === 'SUB_ADMIN'
}

