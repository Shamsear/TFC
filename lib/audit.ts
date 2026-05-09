import { prisma } from './prisma'
import { generateAuditId } from './id-generator'

export type AuditAction = 
  | 'CREATE_TOURNAMENT'
  | 'UPDATE_TOURNAMENT'
  | 'DELETE_TOURNAMENT'
  | 'CREATE_MATCH'
  | 'UPDATE_MATCH'
  | 'DELETE_MATCH'
  | 'CREATE_AUCTION'
  | 'UPDATE_AUCTION'
  | 'DELETE_AUCTION'
  | 'SELL_PLAYER'
  | 'CREATE_TEAM'
  | 'UPDATE_TEAM'
  | 'DELETE_TEAM'
  | 'CREATE_CALENDAR_EVENT'
  | 'UPDATE_CALENDAR_EVENT'
  | 'DELETE_CALENDAR_EVENT'
  | 'CREATE_SUB_ADMIN'
  | 'UPDATE_SUB_ADMIN'
  | 'DEACTIVATE_SUB_ADMIN'
  | 'LOGIN'
  | 'LOGOUT'

export interface AuditLogData {
  userId: string
  userEmail: string
  userRole: string
  action: AuditAction
  entityType: string
  entityId?: string
  entityName?: string
  seasonId?: string
  details?: any
  ipAddress?: string
  userAgent?: string
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(data: AuditLogData) {
  try {
    const id = await generateAuditId()
    
    await prisma.$executeRaw`
      INSERT INTO audit_logs (
        id, user_id, user_email, user_role, action, 
        entity_type, entity_id, entity_name, season_id, 
        details, ip_address, user_agent, created_at
      ) VALUES (
        ${id},
        ${data.userId},
        ${data.userEmail},
        ${data.userRole},
        ${data.action},
        ${data.entityType},
        ${data.entityId || null},
        ${data.entityName || null},
        ${data.seasonId || null},
        ${data.details ? JSON.stringify(data.details) : null},
        ${data.ipAddress || null},
        ${data.userAgent || null},
        NOW()
      )
    `
    
    return { success: true, id }
  } catch (error) {
    console.error('Failed to create audit log:', error)
    return { success: false, error }
  }
}

/**
 * Get audit logs with filters
 */
export async function getAuditLogs(filters: {
  userId?: string
  seasonId?: string
  action?: AuditAction
  entityType?: string
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
}) {
  try {
    const conditions: string[] = ['1=1']
    const params: any[] = []
    let paramIndex = 1

    if (filters.userId) {
      conditions.push(`user_id = $${paramIndex}`)
      params.push(filters.userId)
      paramIndex++
    }

    if (filters.seasonId) {
      conditions.push(`season_id = $${paramIndex}`)
      params.push(filters.seasonId)
      paramIndex++
    }

    if (filters.action) {
      conditions.push(`action = $${paramIndex}`)
      params.push(filters.action)
      paramIndex++
    }

    if (filters.entityType) {
      conditions.push(`entity_type = $${paramIndex}`)
      params.push(filters.entityType)
      paramIndex++
    }

    if (filters.startDate) {
      conditions.push(`created_at >= $${paramIndex}`)
      params.push(filters.startDate)
      paramIndex++
    }

    if (filters.endDate) {
      conditions.push(`created_at <= $${paramIndex}`)
      params.push(filters.endDate)
      paramIndex++
    }

    const whereClause = conditions.join(' AND ')
    const limit = filters.limit || 50
    const offset = filters.offset || 0

    const logs = await prisma.$queryRawUnsafe(`
      SELECT * FROM audit_logs
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `)

    const countResult = await prisma.$queryRawUnsafe<[{ count: bigint }]>(`
      SELECT COUNT(*) as count FROM audit_logs
      WHERE ${whereClause}
    `, ...params)

    const total = Number(countResult[0]?.count || 0)

    return { success: true, logs, total }
  } catch (error) {
    console.error('Failed to get audit logs:', error)
    return { success: false, error, logs: [], total: 0 }
  }
}

/**
 * Get audit summary for a user
 */
export async function getUserAuditSummary(userId: string, seasonId?: string) {
  try {
    const seasonFilter = seasonId ? `AND season_id = '${seasonId}'` : ''
    
    const summary = await prisma.$queryRawUnsafe<any[]>(`
      SELECT 
        action,
        entity_type,
        COUNT(*) as count,
        MAX(created_at) as last_action
      FROM audit_logs
      WHERE user_id = '${userId}' ${seasonFilter}
      GROUP BY action, entity_type
      ORDER BY count DESC
    `)

    return { success: true, summary }
  } catch (error) {
    console.error('Failed to get user audit summary:', error)
    return { success: false, error, summary: [] }
  }
}
