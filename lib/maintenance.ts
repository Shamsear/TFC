import { prisma } from './prisma'

const MAINTENANCE_KEY = 'portal_maintenance_mode'

/**
 * Checks if maintenance mode is active.
 * Defaults to false if not set or on query failure.
 */
export async function isMaintenanceModeActive(): Promise<boolean> {
  try {
    const setting = await prisma.system_settings.findUnique({
      where: { key: MAINTENANCE_KEY },
      select: { value: true }
    })
    return setting?.value === 'true'
  } catch (error) {
    console.error('Error fetching maintenance mode status:', error)
    return false
  }
}

/**
 * Updates maintenance mode status.
 */
export async function setMaintenanceMode(enabled: boolean): Promise<boolean> {
  try {
    await prisma.system_settings.upsert({
      where: { key: MAINTENANCE_KEY },
      update: { value: enabled ? 'true' : 'false' },
      create: { key: MAINTENANCE_KEY, value: enabled ? 'true' : 'false' }
    })
    return true
  } catch (error) {
    console.error('Error setting maintenance mode status:', error)
    throw error
  }
}
