"use client"

import { useState, useEffect } from "react"
import LoadingSpinner from "@/components/ui/LoadingSpinner"
import Image from "next/image"

interface Badge {
  id: string
  badgeKey: string
  badgeName: string
  tier: "BRONZE" | "SILVER" | "GOLD" | "PLATINUM"
  createdAt: string
  unlockedAtMatchId?: string | null
}

interface XPHistory {
  id: string
  amount: number
  xpType: string
  description: string
  createdAt: string
}

interface TeamInfo {
  id: string
  name: string
  logoUrl: string
  xp: number
  level: number
}

// Map badge keys to descriptions and SVG icons or filters
const BADGE_META: Record<string, { description: string }> = {
  IRON_CURTAIN: { description: "Concede zero goals in a league match (Clean Sheet)" },
  GALE_FORCE: { description: "Score 4 or more goals in a single match" },
  UNSTOPPABLE: { description: "Maintain a 5-match win streak" },
  GIANT_KILLER: { description: "Defeat a team at least 5 levels higher than you" },
  DEFIANT: { description: "Win a match after conceding the first goal" },
  CENTURION: { description: "Earn 100 total XP points across all seasons" },
  APEX_PREDATOR: { description: "Finish top of the league standings" },
  GOLDEN_BOOT: { description: "Have the top goalscorer in a tournament" },
  TACTICIAN: { description: "Change formations and win the next match" },
}

export default function TeamAchievementsPage() {
  const [data, setData] = useState<{ team: TeamInfo; badges: Badge[]; xpHistory: XPHistory[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"badges" | "ledger">("badges")
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null)

  const fetchAchievements = async () => {
    try {
      const res = await fetch("/api/team/achievements", { cache: "no-store" })
      if (res.ok) {
        const result = await res.json()
        setData(result)
      }
    } catch (err) {
      console.error("Error fetching achievements:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAchievements()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex justify-center items-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex justify-center items-center text-gray-400">
        Failed to load achievements data.
      </div>
    )
  }

  const { team, badges, xpHistory } = data

  // Next level threshold calculation (Example logic: 100 * level * 1.5)
  const getNextLevelXP = (level: number) => Math.round(100 * Math.pow(level, 1.5))
  const getPrevLevelXP = (level: number) => level === 1 ? 0 : Math.round(100 * Math.pow(level - 1, 1.5))
  
  const currentThreshold = getPrevLevelXP(team.level)
  const nextThreshold = getNextLevelXP(team.level)
  const xpInCurrentLevel = team.xp - currentThreshold
  const xpNeededForLevel = nextThreshold - currentThreshold
  const progressPercent = Math.min(100, Math.max(0, (xpInCurrentLevel / xpNeededForLevel) * 100))

  const allBadgeKeys = Object.keys(BADGE_META)
  const unlockedKeys = badges.map(b => b.badgeKey)

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "PLATINUM": return "from-cyan-400 to-blue-500 border-cyan-500/30 text-cyan-400"
      case "GOLD": return "from-amber-400 to-[#E8A800] border-amber-500/30 text-amber-400"
      case "SILVER": return "from-slate-300 to-slate-500 border-slate-400/30 text-slate-300"
      default: return "from-orange-400 to-amber-700 border-orange-500/30 text-orange-400"
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pt-20">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Hero Section */}
        <div className="rounded-3xl bg-gradient-to-br from-white/5 via-white/[0.02] to-black border border-white/10 p-6 sm:p-8 lg:p-10 mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-[#E8A800]/5 to-transparent rounded-bl-full pointer-events-none"></div>

          <div className="flex flex-col md:flex-row items-center gap-6 sm:gap-8">
            {/* Level Emblem */}
            <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-gradient-to-br from-gray-800 to-gray-900 border border-white/10 flex flex-col items-center justify-center shadow-xl ring-4 ring-[#E8A800]/10 flex-shrink-0">
              <span className="text-[10px] sm:text-xs font-black uppercase text-[#E8A800] tracking-widest">Level</span>
              <span className="text-4xl sm:text-5xl font-black text-white leading-none mt-1">{team.level}</span>
              <span className="text-[9px] font-bold text-gray-500 mt-2 uppercase tracking-wide">Manager Rank</span>
            </div>

            {/* XP progress */}
            <div className="flex-1 w-full text-center md:text-left">
              <h1 className="text-3xl sm:text-4xl font-black mb-2 bg-gradient-to-r from-[#FFC93A] to-[#E8A800] bg-clip-text text-transparent">
                {team.name} Showcase
              </h1>
              <p className="text-gray-400 text-sm mb-5">
                Earn XP from match results, clean sheets, high scores, and badge unlocks to level up your franchise!
              </p>

              {/* Progress bar */}
              <div className="space-y-2 max-w-xl mx-auto md:mx-0">
                <div className="flex justify-between text-xs font-bold text-gray-400">
                  <span>{xpInCurrentLevel.toLocaleString()} / {xpNeededForLevel.toLocaleString()} XP inside Lvl {team.level}</span>
                  <span className="text-white">{Math.round(progressPercent)}%</span>
                </div>
                <div className="w-full h-3 bg-white/5 border border-white/10 rounded-full overflow-hidden p-0.5">
                  <div 
                    className="h-full bg-gradient-to-r from-[#E8A800] to-[#FFB347] rounded-full transition-all duration-500 shadow-md shadow-[#E8A800]/30"
                    style={{ width: `${progressPercent}%` }}
                  ></div>
                </div>
                <div className="text-[10px] text-gray-500 flex justify-between font-medium">
                  <span>Current: {team.xp.toLocaleString()} total XP</span>
                  <span>Next Level: {nextThreshold.toLocaleString()} XP</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-white/10 gap-6 mb-8">
          <button
            onClick={() => setActiveTab("badges")}
            className={`pb-4 text-sm sm:text-base font-black transition-all border-b-2 relative ${
              activeTab === "badges"
                ? "text-[#E8A800] border-[#E8A800]"
                : "text-gray-500 border-transparent hover:text-white"
            }`}
          >
            Badges Showcase ({badges.length} Unlocked)
          </button>
          <button
            onClick={() => setActiveTab("ledger")}
            className={`pb-4 text-sm sm:text-base font-black transition-all border-b-2 relative ${
              activeTab === "ledger"
                ? "text-[#E8A800] border-[#E8A800]"
                : "text-gray-500 border-transparent hover:text-white"
            }`}
          >
            XP Progression Ledger ({xpHistory.length} events)
          </button>
        </div>

        {/* Tab Panels */}
        {activeTab === "badges" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {allBadgeKeys.map((key) => {
              const meta = BADGE_META[key]
              const isUnlocked = unlockedKeys.includes(key)
              const badge = badges.find(b => b.badgeKey === key)
              
              const tier = badge?.tier || "BRONZE"
              const tierClass = getTierColor(tier)

              return (
                <div
                  key={key}
                  onClick={() => isUnlocked && badge && setSelectedBadge(badge)}
                  className={`rounded-2xl border p-5 flex flex-col items-center justify-between text-center transition-all ${
                    isUnlocked
                      ? `bg-gradient-to-br from-white/5 to-white/[0.01] border-white/10 hover:border-[#E8A800]/50 shadow-lg cursor-pointer hover:scale-105 active:scale-95 duration-200`
                      : "bg-white/[0.01] border-white/5 opacity-40 select-none"
                  }`}
                >
                  {/* Badge emblem placeholder */}
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${isUnlocked ? tierClass : 'from-gray-800 to-gray-900 border-gray-700'} border flex items-center justify-center shadow-inner mb-4`}>
                    <svg className={`w-8 h-8 ${isUnlocked ? '' : 'text-gray-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      {isUnlocked ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138z" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      )}
                    </svg>
                  </div>

                  <div>
                    <h3 className="font-bold text-sm sm:text-base text-white leading-tight mb-1">
                      {key.replace(/_/g, " ")}
                    </h3>
                    <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-2">
                      {isUnlocked ? `${tier} TIER` : "LOCKED"}
                    </p>
                    <p className="text-gray-400 text-xs leading-normal">
                      {meta.description}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div>
            {xpHistory.length > 0 ? (
              <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/[0.01]">
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Event Type</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Description</th>
                        <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">XP Awarded</th>
                      </tr>
                    </thead>
                    <tbody>
                      {xpHistory.map((item) => (
                        <tr key={item.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                          <td className="px-6 py-4 text-xs sm:text-sm text-[#D4CCBB] whitespace-nowrap">
                            {new Date(item.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex px-2.5 py-1 rounded-lg text-xs font-bold border bg-purple-500/10 border-purple-500/20 text-purple-400">
                              {item.xpType.replace(/_/g, " ")}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs sm:text-sm text-gray-300">
                            {item.description}
                          </td>
                          <td className="px-6 py-4 text-right text-xs sm:text-sm font-black whitespace-nowrap text-emerald-400">
                            +{item.amount} XP
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl bg-white/5 border border-white/10 p-12 text-center">
                <svg className="w-16 h-16 text-[#7A7367] mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-lg font-bold text-white mb-2">No XP Logs Yet</h3>
                <p className="text-gray-400 max-w-sm mx-auto text-sm sm:text-base">
                  Complete league matches and unlock achievements to populate your franchise timeline!
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Badge detail modal */}
      {selectedBadge && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-all duration-300">
          <div className="relative w-full max-w-md rounded-2xl bg-gradient-to-br from-gray-900 via-[#0f0f0f] to-black border border-white/10 p-6 sm:p-8 shadow-2xl text-center animate-in fade-in zoom-in duration-200">
            {/* Close button */}
            <button
              onClick={() => setSelectedBadge(null)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white rounded-lg bg-white/5 border border-white/10 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Badge Emblem */}
            <div className={`w-24 h-24 rounded-3xl bg-gradient-to-br ${getTierColor(selectedBadge.tier)} border flex items-center justify-center shadow-lg mx-auto mb-6`}>
              <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138z" />
              </svg>
            </div>

            <h3 className="text-2xl font-black text-white mb-2">{selectedBadge.badgeName}</h3>
            <p className="text-[#E8A800] text-xs font-bold uppercase tracking-wider mb-4">{selectedBadge.tier} TIER UNLOCKED</p>
            <p className="text-gray-300 text-sm leading-relaxed mb-6">
              {BADGE_META[selectedBadge.badgeKey]?.description}
            </p>

            <div className="bg-white/5 rounded-xl border border-white/5 p-4 text-left text-xs space-y-2 mb-6">
              <div className="flex justify-between text-gray-500">
                <span>Unlocked on:</span>
                <span className="text-white font-bold">{new Date(selectedBadge.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Method:</span>
                <span className="text-white font-bold">Automated Achievements Engine</span>
              </div>
            </div>

            <button
              onClick={() => setSelectedBadge(null)}
              className="w-full py-3 bg-gradient-to-r from-[#E8A800] to-[#FFB347] hover:from-[#FFC93A] hover:to-[#FFB347] text-[#0a0a0a] rounded-xl font-bold transition-all shadow-md"
            >
              Great!
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
