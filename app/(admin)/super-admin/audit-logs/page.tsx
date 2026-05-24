import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getAuditLogs } from '@/lib/audit'
import { prisma } from '@/lib/prisma'
import AuditLogsFilters from '@/components/admin/AuditLogsFilters'

async function getSubAdmins(): Promise<{ id: string; name: string; email: string }[]> {
  try {
    const subAdmins = await prisma.users.findMany({
      where: { role: 'SUB_ADMIN' },
      select: { id: true, name: true, email: true }
    })
    // Filter out null names and provide default
    return subAdmins.map(admin => ({
      id: admin.id,
      name: admin.name || 'Unknown',
      email: admin.email
    }))
  } catch (error) {
    return []
  }
}

async function getSeasons() {
  try {
    const seasons = await prisma.seasons.findMany({
      select: { id: true, name: true },
      orderBy: { createdAt: 'desc' }
    })
    return seasons
  } catch (error) {
    return []
  }
}

export default async function AuditLogsPage({
  searchParams
}: {
  searchParams: Promise<{ userId?: string; seasonId?: string; action?: string; page?: string }>
}) {
  const session = await auth()

  if (!session || session.user?.role !== 'SUPER_ADMIN') {
    redirect('/api/auth/signin')
  }

  const params = await searchParams
  const page = parseInt(params.page || '1')
  const limit = 50
  const offset = (page - 1) * limit

  const { logs, total } = await getAuditLogs({
    userId: params.userId,
    seasonId: params.seasonId,
    action: params.action as any,
    limit,
    offset
  })

  // Type assertion for logs since it comes from raw SQL query
  const typedLogs = logs as any[]

  const subAdmins = await getSubAdmins()
  const seasons = await getSeasons()

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getActionColor = (action: string) => {
    if (action.startsWith('CREATE')) return 'text-[#E8A800]'
    if (action.startsWith('UPDATE')) return 'text-[#FFC93A]'
    if (action.startsWith('DELETE')) return 'text-[#FFB347]'
    return 'text-[#D4CCBB]'
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="text-white px-4 sm:px-6 lg:px-8 pb-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black mb-2 sm:mb-3">
            <span className="bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent">
              Audit Logs
            </span>
          </h1>
          <p className="text-[#D4CCBB] text-sm sm:text-base">Track all actions performed by sub-admins</p>
        </div>

        {/* Filters */}
        <AuditLogsFilters 
          subAdmins={subAdmins}
          seasons={seasons}
          currentUserId={params.userId}
          currentSeasonId={params.seasonId}
          currentAction={params.action}
        />

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mb-6">
          <div className="rounded-lg sm:rounded-xl bg-white/5 border border-white/10 p-4 sm:p-6">
            <div className="text-2xl sm:text-3xl font-black text-white mb-2">{total}</div>
            <div className="text-xs sm:text-sm text-gray-400">Total Actions</div>
          </div>
        </div>

        {/* Logs Table */}
        <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-400 uppercase">Timestamp</th>
                  <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-400 uppercase">User</th>
                  <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-400 uppercase">Action</th>
                  <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-400 uppercase">Entity</th>
                  <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-400 uppercase">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {typedLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 sm:px-6 py-8 sm:py-12 text-center text-gray-400 text-sm sm:text-base">
                      No audit logs found
                    </td>
                  </tr>
                ) : (
                  typedLogs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-white/5">
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-[#D4CCBB]">
                        {formatDate(log.created_at)}
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4">
                        <div className="text-xs sm:text-sm font-bold text-white">{log.user_email}</div>
                        <div className="text-xs text-gray-400">{log.user_role}</div>
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4">
                        <span className={`text-xs sm:text-sm font-bold ${getActionColor(log.action)}`}>
                          {log.action.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4">
                        <div className="text-xs sm:text-sm text-white">{log.entity_type}</div>
                        {log.entity_name && (
                          <div className="text-xs text-gray-400">{log.entity_name}</div>
                        )}
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-[#D4CCBB]">
                        {log.details && (
                          <details className="cursor-pointer">
                            <summary className="text-[#E8A800] hover:text-[#FFC93A]">View</summary>
                            <pre className="mt-2 text-xs bg-[#111111] p-2 rounded overflow-auto">
                              {JSON.stringify(JSON.parse(log.details), null, 2)}
                            </pre>
                          </details>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="border-t border-white/10 px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs sm:text-sm text-gray-400">
                Page {page} of {totalPages} ({total} total)
              </div>
              <div className="flex gap-2">
                {page > 1 && (
                  <a
                    href={`?${new URLSearchParams({ ...params, page: (page - 1).toString() })}`}
                    className="px-3 sm:px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-[#D4CCBB] rounded-lg transition-all text-xs sm:text-sm"
                  >
                    Previous
                  </a>
                )}
                {page < totalPages && (
                  <a
                    href={`?${new URLSearchParams({ ...params, page: (page + 1).toString() })}`}
                    className="px-3 sm:px-4 py-2 bg-[#E8A800] hover:bg-[#FFC93A] text-[#0a0a0a] font-bold rounded-lg transition-all text-xs sm:text-sm"
                  >
                    Next
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
