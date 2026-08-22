"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"

interface Season {
  id: string
  name: string
  seasonNumber: number
}

interface TeamEmail {
  number: number
  managerName: string
  teamName: string
  email: string
}

interface TeamEmailsResponse {
  season: Season
  teams: TeamEmail[]
}

export default function TeamEmailsPage() {
  const [seasons, setSeasons] = useState<Season[]>([])
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>("")
  const [data, setData] = useState<TeamEmailsResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)

  useEffect(() => {
    fetch("/api/seasons")
      .then((res) => res.json())
      .then((json) => {
        const list = Array.isArray(json) ? json : json.seasons || []
        setSeasons(
          list.map((s: { id: string; name: string; seasonNumber: number }) => ({
            id: s.id,
            name: s.name,
            seasonNumber: s.seasonNumber,
          }))
        )
      })
      .catch(() => {})
  }, [])

  const fetchTeamEmails = useCallback(async (seasonId: string) => {
    if (!seasonId) {
      setData(null)
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/seasons/${seasonId}/team-emails`)
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTeamEmails(selectedSeasonId)
  }, [selectedSeasonId, fetchTeamEmails])

  const formatText = (): string => {
    if (!data) return ""
    const lines: string[] = []
    lines.push(`TFC Season ${data.season.seasonNumber}`)
    lines.push(`Registered Teams`)
    lines.push("")
    data.teams.forEach((t) => {
      lines.push(`${t.number}. ${t.managerName} - ${t.teamName}`)
      lines.push(t.email)
      lines.push("")
    })
    return lines.join("\n")
  }

  const handleCopy = async () => {
    const text = formatText()
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch {
      // fallback
      const ta = document.createElement("textarea")
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand("copy")
      document.body.removeChild(ta)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    }
  }

  return (
    <div className="pb-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/super-admin"
            className="text-sm text-[#E8A800] hover:text-[#FFC93A] mb-4 inline-block"
          >
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-white mb-2">
            Team Emails by Season
          </h1>
          <p className="text-gray-400">
            Get all registered team manager email addresses for a season
          </p>
        </div>

        {/* Season Selector */}
        <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 mb-6">
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Select Season
          </label>
          <select
            value={selectedSeasonId}
            onChange={(e) => setSelectedSeasonId(e.target.value)}
            className="w-full bg-white/10 border border-white/20 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-[#E8A800] transition-colors"
          >
            <option value="" className="bg-[#1a1a2e]">
              Choose a season...
            </option>
            {seasons.map((s) => (
              <option key={s.id} value={s.id} className="bg-[#1a1a2e]">
                {s.name} (Season {s.seasonNumber})
              </option>
            ))}
          </select>
        </div>

        {/* Results */}
        {loading && (
          <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-8 text-center">
            <div className="text-gray-400">Loading...</div>
          </div>
        )}

        {!loading && data && (
          <>
            {/* Copy Button */}
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-gray-400">
                {data.teams.length} registered team{data.teams.length !== 1 ? "s" : ""}
              </div>
              <button
                onClick={handleCopy}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  copySuccess
                    ? "bg-green-500/20 text-green-400 border border-green-500/30"
                    : "bg-[#E8A800] hover:bg-[#FFC93A] text-black"
                }`}
              >
                {copySuccess ? "✓ Copied!" : "Copy to Clipboard"}
              </button>
            </div>

            {/* Formatted Output */}
            <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden">
              <div className="bg-white/5 px-6 py-3 border-b border-white/10 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-400">
                  Formatted Output
                </span>
              </div>
              <pre className="p-6 text-sm text-white font-mono whitespace-pre-wrap leading-relaxed">
                {formatText()}
              </pre>
            </div>

            {/* Table View */}
            <div className="mt-6 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden">
              <div className="bg-white/5 px-6 py-3 border-b border-white/10">
                <span className="text-sm font-medium text-gray-400">
                  Table View
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3 px-6 text-gray-400 font-medium">#</th>
                      <th className="text-left py-3 px-6 text-gray-400 font-medium">Manager</th>
                      <th className="text-left py-3 px-6 text-gray-400 font-medium">Team</th>
                      <th className="text-left py-3 px-6 text-gray-400 font-medium">Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.teams.map((t) => (
                      <tr
                        key={t.number}
                        className="border-b border-white/5 hover:bg-white/5 transition-colors"
                      >
                        <td className="py-3 px-6 text-white">{t.number}</td>
                        <td className="py-3 px-6 text-white">{t.managerName}</td>
                        <td className="py-3 px-6 text-white">{t.teamName}</td>
                        <td className="py-3 px-6 text-[#E8A800] font-mono text-sm">{t.email}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {!loading && !data && selectedSeasonId && (
          <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-8 text-center">
            <div className="text-gray-400">No data found for this season</div>
          </div>
        )}
      </div>
    </div>
  )
}
