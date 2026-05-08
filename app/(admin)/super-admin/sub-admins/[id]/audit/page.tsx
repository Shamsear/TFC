import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import AuditLogViewer from '@/components/admin/AuditLogViewer'

async function getSubAdmin(id: string) {
  try {
    const user = await prisma.users.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    })

    if (!user || user.role !== 'SUB_ADMIN') {
      return null
    }

    return user
  } catch (error) {
    console.error('Error fetching sub-admin:', error)
    return null
  }
}

async function getAuditLogs(userId: string) {
  try {
    const logs = await prisma.$queryRawUnsafe<any[]>(`
      SELECT 
        al.*,
        s.name as season_name
      FROM audit_logs al
      LEFT JOIN seasons s ON al.season_id = s.id
      WHERE al.user_id = '${userId}'
      ORDER BY al.created_at DESC
      LIMIT 100
    `)

    return logs
  } catch (error) {
    console.error('Error fetching audit logs:', error)
    return []
  }
}

async function getAuditSummary(userId: string) {
  try {
    const summary = await prisma.$queryRawUnsafe<any[]>(`
      SELECT 
        action,
        entity_type,
        COUNT(*) as count,
        MAX(created_at) as last_action
      FROM audit_logs
      WHERE user_id = '${userId}'
      GROUP BY action, entity_type
      ORDER BY count DESC
    `)

    return summary
  } catch (error) {
    console.error('Error fetching audit summary:', error)
    return []
  }
}

export default async function AuditLogPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()

  if (!session || session.user?.role !== 'SUPER_ADMIN') {
    redirect('/api/auth/signin')
  }

  const { id } = await params
  const subAdmin = await getSubAdmin(id)
  const logs = await getAuditLogs(id)
  const summary = await getAuditSummary(id)

  if (!subAdmin) {
    redirect('/super-admin/sub-admins')
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white px-4 sm:px-6 lg:px-8 pb-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black">
              <span className="bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent">
                Audit Log
              </span>
            </h1>
            <span className="px-2 sm:px-3 py-1 rounded-full bg-[#E8A800]/10 border border-[#E8A800]/30 text-[#E8A800] text-xs sm:text-sm font-bold">
              {subAdmin.name}
            </span>
          </div>
          <p className="text-[#D4CCBB] text-sm sm:text-base">{subAdmin.email}</p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
          <div className="rounded-lg sm:rounded-xl bg-white/5 border border-white/10 p-4 sm:p-6">
            <div className="text-2xl sm:text-3xl font-black text-white mb-1">{logs.length}</div>
            <div className="text-xs sm:text-sm text-gray-400">Total Actions</div>
          </div>
          <div className="rounded-lg sm:rounded-xl bg-white/5 border border-white/10 p-4 sm:p-6">
            <div className="text-2xl sm:text-3xl font-black text-[#E8A800] mb-1">
              {summary.length}
            </div>
            <div className="text-xs sm:text-sm text-gray-400">Action Types</div>
          </div>
          <div className="rounded-lg sm:rounded-xl bg-white/5 border border-white/10 p-4 sm:p-6">
            <div className="text-2xl sm:text-3xl font-black text-[#FFB347] mb-1">
              {new Set(logs.map(l => l.season_id).filter(Boolean)).size}
            </div>
            <div className="text-xs sm:text-sm text-gray-400">Seasons Managed</div>
          </div>
          <div className="rounded-lg sm:rounded-xl bg-white/5 border border-white/10 p-4 sm:p-6 col-span-2 lg:col-span-1">
            <div className="text-2xl sm:text-3xl font-black text-[#FFC93A] mb-1">
              {logs.length > 0 ? new Date(logs[0].created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A'}
            </div>
            <div className="text-xs sm:text-sm text-gray-400">Last Activity</div>
          </div>
        </div>

        {/* Action Summary */}
        {summary.length > 0 && (
          <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6 mb-6 sm:mb-8">
            <h2 className="text-lg sm:text-xl font-black text-white mb-4">Action Summary</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {summary.map((item, index) => (
                <div key={index} className="p-3 sm:p-4 rounded-lg bg-[#111111] border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs sm:text-sm font-bold text-white">
                      {item.action.replace(/_/g, ' ')}
                    </span>
                    <span className="text-lg sm:text-xl font-black text-[#E8A800]">{item.count}</span>
                  </div>
                  <div className="text-xs text-gray-400">{item.entity_type}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Audit Logs */}
        <AuditLogViewer logs={logs} />
      </div>
    </div>
  )
}
