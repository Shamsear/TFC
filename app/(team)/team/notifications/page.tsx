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
    <div className="min-h-screen bg-[#0a0a0a] text-white pt-20">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black mb-2">
              <span className="bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent">
                Notification Inbox
              </span>
            </h1>
            <p className="text-[#D4CCBB] text-sm">
              View and manage updates from the league, auctions, and rosters.
            </p>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              disabled={actionLoading}
              className="self-start sm:self-center px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl font-bold text-xs transition-all flex items-center gap-2 hover:scale-105 disabled:opacity-50"
            >
              {actionLoading ? <LoadingSpinner size="sm" /> : null}
              Mark all as read
            </button>
          )}
        </div>

        {/* Inbox Content */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        ) : notifications.length > 0 ? (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`rounded-2xl border p-5 transition-all relative group overflow-hidden ${
                  notification.isRead
                    ? "bg-white/[0.01] border-white/5 opacity-75 hover:opacity-100"
                    : "bg-white/5 border-white/10 shadow-lg shadow-black/30"
                }`}
              >
                {/* Unread glow bar */}
                {!notification.isRead && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#E8A800] rounded-l-full"></div>
                )}

                <div className="flex gap-4">
                  {/* Category Icon */}
                  <div className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 ${getCategoryColor(notification.category)}`}>
                    {getCategoryIcon(notification.category)}
                  </div>

                  {/* Body details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1 mb-2">
                      <h3 className={`font-bold text-sm sm:text-base ${notification.isRead ? "text-gray-300" : "text-white"}`}>
                        {notification.title}
                      </h3>
                      <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider whitespace-nowrap">
                        {new Date(notification.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-gray-400 text-xs sm:text-sm leading-relaxed mb-3">
                      {notification.body}
                    </p>

                    {/* Actions */}
                    <div className="flex items-center gap-3">
                      {notification.url && (
                        <Link
                          href={notification.url}
                          className="px-3.5 py-1.5 bg-[#E8A800] text-[#0a0a0a] hover:bg-[#FFC93A] text-xs font-bold rounded-lg transition-all hover:scale-105 inline-flex items-center gap-1"
                        >
                          View Action
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      )}
                      
                      {!notification.isRead && (
                        <button
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="px-3.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold rounded-lg transition-all"
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
          <div className="rounded-2xl bg-white/5 border border-white/10 p-12 text-center">
            <svg className="w-16 h-16 text-[#7A7367] mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <h3 className="text-lg font-bold text-white mb-2">No Notifications</h3>
            <p className="text-gray-400 max-w-sm mx-auto text-sm sm:text-base">
              You are completely caught up! We will notify you when new roster, auction, or match events take place.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
