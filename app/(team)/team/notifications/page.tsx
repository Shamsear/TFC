"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import LoadingSpinner from "@/components/ui/LoadingSpinner"

interface NotificationItem {
  id: string
  title: string
  body: string
  category: string
  url?: string | null
  isRead: boolean
  createdAt: string
}

export default function NotificationsInboxPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/team/notifications", { cache: "no-store" })
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications)
      }
    } catch (err) {
      console.error("Error fetching notifications:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications()
  }, [])

  const handleMarkAsRead = async (id: string) => {
    try {
      const res = await fetch("/api/team/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: id }),
      })
      if (res.ok) {
        setNotifications(prev =>
          prev.map(n => (n.id === id ? { ...n, isRead: true } : n))
        )
        // Dispatch custom event to update navigation bell badge
        window.dispatchEvent(new Event("notificationsUpdated"))
      }
    } catch (err) {
      console.error("Error marking notification as read:", err)
    }
  }

  const handleMarkAllAsRead = async () => {
    setActionLoading(true)
    try {
      const res = await fetch("/api/team/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      })
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
        // Dispatch custom event to update navigation bell badge
        window.dispatchEvent(new Event("notificationsUpdated"))
      }
    } catch (err) {
      console.error("Error marking all as read:", err)
    } finally {
      setActionLoading(false)
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "auctionWins":
        return "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
      case "outbids":
        return "bg-red-500/10 border-red-500/20 text-red-400"
      case "trades":
        return "bg-purple-500/10 border-purple-500/20 text-purple-400"
      default:
        return "bg-blue-500/10 border-blue-500/20 text-blue-400"
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "auctionWins":
        return (
          <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138z" />
          </svg>
        )
      case "outbids":
        return (
          <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        )
      case "trades":
        return (
          <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        )
      default:
        return (
          <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        )
    }
  }

  const unreadCount = notifications.filter(n => !n.isRead).length

  return (
    <div className="min-h-screen bg-[#070708] text-white pt-24 pb-12 relative overflow-hidden">
      {/* Background radial spotlights */}
      <div className="absolute top-[-10%] left-[20%] w-[600px] h-[600px] rounded-full bg-[#E8A800]/[0.02] blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[10%] w-[600px] h-[600px] rounded-full bg-[#E8A800]/[0.02] blur-[150px] pointer-events-none" />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Back Link */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/team"
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-white/10 text-xs text-[#D4CCBB] hover:text-white font-extrabold uppercase tracking-wider rounded-xl backdrop-blur-xl transition-all hover:scale-102 cursor-pointer shadow-md"
          >
            <svg className="w-3.5 h-3.5 text-[#E8A800]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-2 tracking-tight">
              <span className="bg-gradient-to-r from-[#E8A800] via-[#FFD066] to-[#FFB347] bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(232,168,0,0.15)]">
                Notification Inbox
              </span>
            </h1>
            <p className="text-[#D4CCBB] text-xs font-bold uppercase tracking-widest mt-1">
              View and manage updates from the league, auctions, and rosters.
            </p>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              disabled={actionLoading}
              className="self-start sm:self-center px-4 py-2.5 bg-white/[0.02] border border-white/5 hover:border-[#E8A800]/30 hover:bg-[#E8A800]/5 hover:text-[#E8A800] text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all duration-300 flex items-center gap-2 hover:scale-[1.03] active:scale-95 disabled:opacity-50 cursor-pointer shadow-md"
            >
              {actionLoading ? <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : null}
              Mark all as read
            </button>
          )}
        </div>

        {/* Inbox Content */}
        {loading ? (
          <div className="flex justify-center items-center py-32">
            <div className="w-10 h-10 border-4 border-[#E8A800]/20 border-t-[#E8A800] rounded-full animate-spin shadow-[0_0_15px_rgba(232,168,0,0.2)]" />
          </div>
        ) : notifications.length > 0 ? (
          <div className="space-y-4 animate-[fadeIn_0.3s_ease-out]">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`rounded-2xl border p-5 transition-all duration-300 relative group overflow-hidden ${
                  notification.isRead
                    ? "bg-white/[0.01] border-white/5 opacity-70 hover:opacity-100 hover:border-white/10 hover:bg-white/[0.02]"
                    : "bg-white/[0.02] border-white/10 hover:border-[#E8A800]/20 hover:bg-white/[0.03] shadow-[0_4px_25px_rgba(0,0,0,0.4)]"
                }`}
              >
                {/* Unread neon glow bar */}
                {!notification.isRead && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#E8A800] shadow-[0_0_12px_#E8A800] rounded-l-full"></div>
                )}

                <div className="flex gap-4">
                  {/* Category Icon Capsule */}
                  <div className={`w-11 h-11 rounded-xl border flex items-center justify-center flex-shrink-0 relative shadow-inner ${getCategoryColor(notification.category)}`}>
                    <div className="absolute inset-0 bg-current opacity-[0.03] rounded-xl pointer-events-none" />
                    {getCategoryIcon(notification.category)}
                  </div>

                  {/* Body details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1 mb-2">
                      <h3 className={`font-extrabold text-sm sm:text-base leading-tight ${notification.isRead ? "text-gray-400 group-hover:text-white transition-colors" : "text-white"}`}>
                        {notification.title}
                      </h3>
                      <span className="text-[9px] text-gray-500 font-extrabold uppercase tracking-widest font-mono whitespace-nowrap pt-0.5">
                        {new Date(notification.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-gray-400 text-xs sm:text-sm leading-relaxed mb-4">
                      {notification.body}
                    </p>

                    {/* Actions */}
                    <div className="flex items-center gap-3">
                      {notification.url && (
                        <Link
                          href={notification.url}
                          className="px-4 py-2 bg-gradient-to-r from-[#E8A800] to-[#FFB347] text-[#0a0a0a] hover:brightness-110 text-xs font-black rounded-xl transition-all duration-300 hover:scale-[1.03] active:scale-95 inline-flex items-center gap-1.5 shadow-md uppercase tracking-wider select-none cursor-pointer"
                        >
                          <span>View Action</span>
                          <svg className="w-3.5 h-3.5 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      )}
                      
                      {!notification.isRead && (
                        <button
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="px-4 py-2 bg-white/5 hover:bg-[#E8A800]/10 border border-white/10 hover:border-[#E8A800]/30 hover:text-[#E8A800] text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all duration-300 active:scale-95 cursor-pointer"
                        >
                          Mark as read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl bg-white/[0.01] border border-white/5 p-12 text-center backdrop-blur-xl shadow-2xl relative overflow-hidden animate-[fadeIn_0.3s_ease-out]">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#E8A800]/5 rounded-full blur-3xl pointer-events-none" />
            <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-center mx-auto mb-5 shadow-inner">
              <svg className="w-8 h-8 text-[#7A7367] animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <h3 className="text-lg font-black text-white mb-1.5 tracking-tight">No Notifications</h3>
            <p className="text-gray-500 max-w-sm mx-auto text-xs font-bold uppercase tracking-widest leading-relaxed">
              You are completely caught up! We will notify you when new roster, auction, or match events take place.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}

