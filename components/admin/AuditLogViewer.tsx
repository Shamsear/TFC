'use client'

import { useState } from 'react'

interface AuditLog {
  id: string
  user_email: string
  action: string
  entity_type: string
  entity_id: string | null
  entity_name: string | null
  season_id: string | null
  season_name: string | null
  details: string | null
  ip_address: string | null
  created_at: Date
}

interface AuditLogViewerProps {
  logs: AuditLog[]
}

export default function AuditLogViewer({ logs }: AuditLogViewerProps) {
  const [filter, setFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('all')
  const [expandedLog, setExpandedLog] = useState<string | null>(null)

  const filteredLogs = logs.filter(log => {
    const matchesSearch = filter === '' || 
      log.action.toLowerCase().includes(filter.toLowerCase()) ||
      log.entity_type.toLowerCase().includes(filter.toLowerCase()) ||
      (log.entity_name && log.entity_name.toLowerCase().includes(filter.toLowerCase())) ||
      (log.season_name && log.season_name.toLowerCase().includes(filter.toLowerCase()))

    const matchesAction = actionFilter === 'all' || log.action === actionFilter

    return matchesSearch && matchesAction
  })

  const uniqueActions = Array.from(new Set(logs.map(l => l.action)))

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const getActionColor = (action: string) => {
    if (action.startsWith('CREATE')) return 'text-[#E8A800]'
    if (action.startsWith('UPDATE')) return 'text-[#FFB347]'
    if (action.startsWith('DELETE') || action.startsWith('DEACTIVATE')) return 'text-red-400'
    return 'text-[#D4CCBB]'
  }

  const getActionIcon = (action: string) => {
    if (action.startsWith('CREATE')) {
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      )
    }
    if (action.startsWith('UPDATE')) {
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      )
    }
    if (action.startsWith('DELETE') || action.startsWith('DEACTIVATE')) {
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      )
    }
    return (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  }

  return (
    <div className="rounded-xl bg-white/[0.02] border border-white/10 p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <h2 className="text-xl font-black text-[#F5F0E8]">Activity Log</h2>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Search logs..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 bg-[#111111] border border-white/10 rounded-lg text-white text-sm focus:border-[#E8A800] focus:outline-none"
          />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-4 py-2 bg-[#111111] border border-white/10 rounded-lg text-white text-sm focus:border-[#E8A800] focus:outline-none"
          >
            <option value="all">All Actions</option>
            {uniqueActions.map(action => (
              <option key={action} value={action}>
                {action.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filteredLogs.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-[#7A7367]">No audit logs found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredLogs.map((log) => (
            <div
              key={log.id}
              className="rounded-lg bg-[#111111] border border-white/10 overflow-hidden"
            >
              <div
                className="p-4 cursor-pointer hover:bg-white/[0.02] transition-all"
                onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`mt-0.5 ${getActionColor(log.action)}`}>
                      {getActionIcon(log.action)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`font-bold text-sm ${getActionColor(log.action)}`}>
                          {log.action.replace(/_/g, ' ')}
                        </span>
                        <span className="text-xs text-[#7A7367]">•</span>
                        <span className="text-xs text-[#D4CCBB]">{log.entity_type}</span>
                      </div>
                      {log.entity_name && (
                        <div className="text-sm text-[#F5F0E8] mb-1">{log.entity_name}</div>
                      )}
                      <div className="flex flex-wrap items-center gap-2 text-xs text-[#7A7367]">
                        <span>{formatDate(log.created_at)}</span>
                        {log.season_name && (
                          <>
                            <span>•</span>
                            <span>{log.season_name}</span>
                          </>
                        )}
                        {log.ip_address && (
                          <>
                            <span>•</span>
                            <span>{log.ip_address}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <button className="text-[#7A7367] hover:text-[#E8A800] transition-colors">
                    <svg 
                      className={`w-5 h-5 transition-transform ${expandedLog === log.id ? 'rotate-180' : ''}`}
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              </div>

              {expandedLog === log.id && log.details && (
                <div className="px-4 pb-4 border-t border-white/10">
                  <div className="mt-3 p-3 rounded bg-[#0a0a0a] border border-white/10">
                    <div className="text-xs font-bold text-[#F5F0E8] mb-2">Details:</div>
                    <pre className="text-xs text-[#D4CCBB] overflow-x-auto">
                      {JSON.stringify(JSON.parse(log.details), null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
