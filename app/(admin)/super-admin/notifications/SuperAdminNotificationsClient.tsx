'use client'

import { useState, useEffect } from 'react'

// Use a fixed locale so server & client render identical date strings (prevents hydration mismatch)
const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  })

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  })

interface Subscription {
  id: string
  deviceName: string
  deviceType: string
  lastUsedAt: string
  consentGivenAt: string
  user: {
    id: string
    email: string
    name: string
  }
}

interface User {
  id: string
  email: string
  name: string
  role: string
}

interface Props {
  subscriptions: Subscription[]
  users: User[]
}

export default function SuperAdminNotificationsClient({ subscriptions: initialSubscriptions, users }: Props) {
  const [subscriptions, setSubscriptions] = useState(initialSubscriptions)
  const [targetUserId, setTargetUserId] = useState('')
  const [isBroadcast, setIsBroadcast] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [url, setUrl] = useState('/team')
  const [category, setCategory] = useState<'auctionWins' | 'outbids' | 'trades' | 'general'>('general')
  
  const [isSending, setIsSending] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [logs, setLogs] = useState<any[]>([])

  // Poll active subscriptions and system logs in real-time every 5 seconds without page refresh
  useEffect(() => {
    let active = true;
    
    const fetchData = async () => {
      try {
        // Fetch subscribers
        const subRes = await fetch('/api/admin/notifications/subscribers');
        if (subRes.ok && active) {
          const subData = await subRes.json();
          setSubscriptions(subData.subscriptions);
        }

        // Fetch logs
        const logsRes = await fetch('/api/admin/notifications/logs');
        if (logsRes.ok && active) {
          const logsData = await logsRes.json();
          setLogs(logsData.logs);
        }
      } catch (err) {
        console.error('Failed to poll notification data:', err);
      }
    };

    fetchData(); // Initial load
    const interval = setInterval(fetchData, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault()
    setFeedback(null)
    setIsSending(true)

    try {
      const res = await fetch('/api/admin/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: isBroadcast ? undefined : targetUserId,
          isBroadcast,
          title,
          body,
          url,
          category
        })
      });

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Server dispatch error')
      }

      const data = await res.json()
      setFeedback({
        type: 'success',
        message: isBroadcast 
          ? `Broadcast fired successfully to all devices! (Fired to ${data.count} users)`
          : 'Test notification delivered successfully to device tray!'
      });

      // Clear payload fields
      setTitle('')
      setBody('')
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Dispatch operation failed'
      });
    } finally {
      setIsSending(false)
    }
  }

  const handleRevokeDevice = async (subId: string) => {
    if (!confirm('Disconnect this device subscription?')) return;
    try {
      const res = await fetch(`/api/notifications/devices/${subId}`, { method: 'DELETE' });
      if (res.ok) {
        setSubscriptions(subscriptions.filter(s => s.id !== subId));
        alert('Device subscription revoked successfully.');
      }
    } catch (err) {
      alert('Revocation failed');
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* 1. Test Dispatch Form Panel */}
      <div className="lg:col-span-1 bg-white/5 border border-white/10 rounded-2xl p-6">
        <h2 className="text-xl font-bold text-white mb-4">Send Test Push</h2>
        <p className="text-xs text-gray-400 mb-6">Manually dispatch signed VAPID encrypted payloads to devices</p>

        <form onSubmit={handleSendTest} className="space-y-4">
          {/* Dispatch Type Toggler */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Recipient Scope</label>
            <div className="flex gap-2 p-1 bg-black/50 border border-white/5 rounded-xl">
              <button
                type="button"
                onClick={() => { setIsBroadcast(false); setIsBroadcast(false); }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${!isBroadcast ? 'bg-[#E8A800] text-black' : 'text-gray-400 hover:text-white'}`}
              >
                Target User
              </button>
              <button
                type="button"
                onClick={() => { setIsBroadcast(true); }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${isBroadcast ? 'bg-[#E8A800] text-black' : 'text-gray-400 hover:text-white'}`}
              >
                Broadcast (All)
              </button>
            </div>
          </div>

          {/* Targeted Manager Dropdown */}
          {!isBroadcast && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Select Target User</label>
              <select
                required
                value={targetUserId}
                onChange={e => setTargetUserId(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-2.5 text-white font-medium focus:outline-none focus:border-[#E8A800] text-sm"
              >
                <option value="">-- Choose Recipient --</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email} - {u.role})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Category Preference Type */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Category Preference Type</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value as any)}
              className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-2.5 text-white font-medium focus:outline-none focus:border-[#E8A800] text-sm"
            >
              <option value="general">General Updates</option>
              <option value="auctionWins">Auction Wins</option>
              <option value="outbids">Outbid Alerts</option>
              <option value="trades">Swaps & Trades</option>
            </select>
          </div>

          {/* Form Inputs */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Alert Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Bid Won!"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#0a0a0a] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#E8A800] text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Alert Body</label>
            <textarea
              required
              rows={3}
              placeholder="e.g. You drafted Player X successfully."
              value={body}
              onChange={e => setBody(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#0a0a0a] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#E8A800] text-sm resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Redirection URL</label>
            <input
              type="text"
              required
              placeholder="e.g. /team/auction"
              value={url}
              onChange={e => setUrl(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#0a0a0a] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#E8A800] text-sm font-mono"
            />
          </div>

          {feedback && (
            <div className={`p-4 rounded-xl text-sm border ${
              feedback.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-red-500/10 border-red-500/20 text-red-400'
            }`}>
              {feedback.message}
            </div>
          )}

          <button
            type="submit"
            disabled={isSending || (!isBroadcast && !targetUserId)}
            className="w-full py-3 bg-[#E8A800] hover:bg-[#FFC93A] text-black font-bold rounded-xl transition-all disabled:opacity-50 text-sm"
          >
            {isSending ? 'Dispatching Payload...' : isBroadcast ? 'Broadcast Alert' : 'Send Test Alert'}
          </button>
        </form>
      </div>

      {/* 2. Active Devices & Subscriptions Directories Table */}
      <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-6">
        <h2 className="text-xl font-bold text-white mb-2">Device Registrations Registry</h2>
        <p className="text-xs text-gray-400 mb-6">Audit active browser subscription nodes registered under VAPID credentials</p>

        {subscriptions.length === 0 ? (
          <div className="text-center py-16 bg-black/30 border border-white/5 rounded-2xl">
            <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <h3 className="text-lg font-bold text-white mb-1">No Active Subscriptions</h3>
            <p className="text-xs text-gray-500">Device listings will appear as team managers enable system notifications.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-gray-400 text-xs font-bold uppercase tracking-wider">
                  <th className="pb-3">User / Manager</th>
                  <th className="pb-3">Device Identity</th>
                  <th className="pb-3">Last Active</th>
                  <th className="pb-3">Consent Log</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {subscriptions.map(sub => (
                  <tr key={sub.id} className="hover:bg-white/[0.01] transition-colors">
                    <td className="py-4 font-bold text-white">
                      <div>{sub.user.name}</div>
                      <div className="text-xs text-gray-500 font-normal">{sub.user.email}</div>
                    </td>
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${sub.deviceType === 'Mobile' ? 'bg-blue-400' : 'bg-emerald-400'}`} />
                        <span>{sub.deviceName}</span>
                      </div>
                    </td>
                    <td className="py-4 text-xs text-gray-400">
                      {formatDateTime(sub.lastUsedAt)}
                    </td>
                    <td className="py-4 text-xs text-gray-500">
                      {formatDate(sub.consentGivenAt)}
                    </td>
                    <td className="py-4 text-right">
                      <button
                        onClick={() => handleRevokeDevice(sub.id)}
                        className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-all"
                        title="Disconnect Device"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 3. Terminal-Style Live System Debug Logs Feed */}
      <div className="lg:col-span-3 bg-[#0c0c0c] border border-white/10 rounded-2xl p-6 font-mono shadow-2xl">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-full bg-red-500 animate-pulse border-2 border-red-500/20" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-300">Live VAPID Delivery Debug Console</h2>
          </div>
          <span className="text-[10px] text-gray-500">Auto-refresh: 5s interval</span>
        </div>

        <div className="max-h-60 overflow-y-auto space-y-2 text-xs leading-relaxed">
          {logs.length === 0 ? (
            <div className="text-gray-600 italic py-4">No recent VAPID dispatches recorded. Try sending a test payload above to populate debug trace...</div>
          ) : (
            logs.map(log => {
              const isSuccess = log.status === 'SUCCESS';
              const isExpired = log.status === '410_EXPIRED';
              return (
                <div key={log.id} className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 py-1.5 border-b border-white/5 last:border-0">
                  <span className="text-gray-500 shrink-0 select-none">
                    [{new Date(log.sentAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}]
                  </span>
                  <div className="flex-1">
                    <span className="font-bold text-gray-400">[{log.category.toUpperCase()}]</span>{' '}
                    <span className="text-gray-300">VAPID Push Dispatch target SubID: </span>
                    <span className="text-[#E8A800] select-all">{log.subscriptionId.substring(0, 8)}...</span>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      isSuccess 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                        : isExpired
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                      {log.status}
                    </span>
                    {log.errorMessage && (
                      <span className="text-red-400/80 text-[10px] font-medium max-w-xs truncate" title={log.errorMessage}>
                        ({log.errorMessage})
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  )
}
