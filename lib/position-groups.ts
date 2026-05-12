/**
 * Position Groups Utility Functions
 */

export const GROUPED_POSITIONS = ['CB', 'DMF', 'CMF', 'AMF', 'CF'] as const
export type GroupedPosition = typeof GROUPED_POSITIONS[number]
export type PositionGroup = 'A' | 'B' | 'ALL'

/**
 * Check if a position supports groups
 */
export function isGroupedPosition(position: string): position is GroupedPosition {
  return GROUPED_POSITIONS.includes(position as GroupedPosition)
}

/**
 * Get Prisma where clause for position group filtering
 */
export function getPositionGroupFilter(position: string, group?: string | null) {
  const baseFilter: any = { position }

  // If no group specified or group is 'ALL', return all players for that position
  if (!group || group === 'ALL') {
    return baseFilter
  }

  // If position doesn't support groups, ignore the group filter
  if (!isGroupedPosition(position)) {
    return baseFilter
  }

  // Add group filter for grouped positions
  return {
    ...baseFilter,
    position_group: group
  }
}

/**
 * Format position display with group
 */
export function formatPositionWithGroup(position: string, group?: string | null): string {
  if (!group || group === 'ALL' || !isGroupedPosition(position)) {
    return position
  }
  return `${position} - Group ${group}`
}

/**
 * Get group color classes
 */
export function getGroupColorClasses(group?: string | null) {
  switch (group) {
    case 'A':
      return {
        bg: 'bg-blue-500/20',
        text: 'text-blue-400',
        border: 'border-blue-500/30'
      }
    case 'B':
      return {
        bg: 'bg-purple-500/20',
        text: 'text-purple-400',
        border: 'border-purple-500/30'
      }
    default:
      return {
        bg: 'bg-gray-500/20',
        text: 'text-gray-400',
        border: 'border-gray-500/30'
      }
  }
}
