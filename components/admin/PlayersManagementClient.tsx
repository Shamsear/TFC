"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import { getPlayerPhotoUrl } from "@/lib/image-cdn"

interface PlayerStats {
  nationality: string | null
  position: string
  overallRating: number
}

interface BasePlayer {
  id: string
  player_id: string | null
  name: string
  photoUrl: string
  seasonalPlayerStats: PlayerStats[]
}

export default function PlayersManagementClient() {
  const [players, setPlayers] = useState<BasePlayer[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [duplicatesMode, setDuplicatesMode] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null)

  const fetchPlayers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/players?query=${encodeURIComponent(query)}&duplicates=${duplicatesMode}&page=${page}`)
      if (res.ok) {
        const data = await res.json()
        setPlayers(data.players)
        setTotalPages(data.totalPages)
        setTotalCount(data.totalCount)
      }
    } catch (error) {
      console.error("Failed to fetch players:", error)
    } finally {
      setLoading(false)
    }
  }, [query, duplicatesMode, page])

  useEffect(() => {
    fetchPlayers()
  }, [fetchPlayers])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchPlayers()
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/admin/players?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        setPlayers(players.filter(p => p.id !== id))
        setTotalCount(prev => prev - 1)
        setShowDeleteModal(null)
      } else {
        alert("Failed to delete player")
      }
    } catch (error) {
      console.error("Error deleting player:", error)
      alert("An error occurred")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
        <form onSubmit={handleSearch} className="flex-1 w-full max-w-xl flex gap-2">
          <input
            type="text"
            placeholder="Search players by name..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#E8A800] focus:ring-1 focus:ring-[#E8A800] transition-all"
          />
          <button
            type="submit"
            className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-all border border-white/10"
          >
            Search
          </button>
        </form>

        <button
          onClick={() => {
            setDuplicatesMode(!duplicatesMode)
            setPage(1)
          }}
          className={`px-6 py-3 rounded-xl font-bold transition-all border ${
            duplicatesMode 
              ? 'bg-[#E8A800] text-black border-[#E8A800] hover:bg-[#FFC93A]' 
              : 'bg-white/5 text-white border-white/10 hover:bg-white/10'
          }`}
        >
          {duplicatesMode ? "Show All Players" : "Find Duplicates"}
        </button>
      </div>

      <div className="mb-4 text-sm text-gray-400">
        Found <span className="text-white font-bold">{totalCount}</span> {duplicatesMode ? "duplicate entries" : "players"}
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-black/40 border-b border-white/10">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Player</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Nationality</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Position/Rating</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-4 border-[#E8A800]/30 border-t-[#E8A800] rounded-full animate-spin" />
                      Loading players...
                    </div>
                  </td>
                </tr>
              ) : players.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                    No players found
                  </td>
                </tr>
              ) : (
                players.map((player) => {
                  const stats = player.seasonalPlayerStats[0]
                  return (
                    <tr key={player.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg bg-black/50 border border-white/10 overflow-hidden relative">
                            <Image
                              src={getPlayerPhotoUrl(player.photoUrl)}
                              alt={player.name}
                              fill
                              className="object-contain"
                              sizes="48px"
                            />
                          </div>
                          <div>
                            <div className="text-sm font-bold text-white">{player.name}</div>
                            <div className="text-xs text-gray-400 font-mono">ID: {player.player_id || player.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-300">{stats?.nationality || "Unknown"}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {stats ? (
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-1 rounded bg-black/40 border border-white/10 text-xs font-bold text-white">
                              {stats.position}
                            </span>
                            <span className="text-sm font-black text-[#E8A800]">{stats.overallRating}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">No stats</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => setShowDeleteModal(player.id)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-400/10 px-3 py-1.5 rounded-lg text-sm font-bold transition-all"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed border border-white/10 rounded-lg text-white font-bold transition-all"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-gray-400 flex items-center">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed border border-white/10 rounded-lg text-white font-bold transition-all"
          >
            Next
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#111] border border-red-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-black text-white mb-2 flex items-center gap-2">
              <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Delete Player?
            </h3>
            <p className="text-gray-400 text-sm mb-6">
              This action cannot be undone. Deleting this player will permanently remove their base profile, all seasonal stats, transfer history, and starred records.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteModal(null)}
                disabled={deletingId === showDeleteModal}
                className="px-4 py-2 rounded-xl text-white font-bold hover:bg-white/10 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(showDeleteModal)}
                disabled={deletingId === showDeleteModal}
                className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold transition-all flex items-center gap-2"
              >
                {deletingId === showDeleteModal ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Deleting...
                  </>
                ) : (
                  "Delete Permanently"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
