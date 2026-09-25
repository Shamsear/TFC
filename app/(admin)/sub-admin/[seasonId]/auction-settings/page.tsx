"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import PageLoader from "@/components/ui/PageLoader"
import LoadingSpinner from "@/components/ui/LoadingSpinner"

interface AuctionSettings {
  id: number
  season_id: string
  auction_window: string
  phase_1_end_round: number
  phase_1_min_balance: number
  phase_2_end_round: number
  phase_2_min_balance: number
  phase_3_min_balance: number
  min_squad_size: number
  max_squad_size: number
  max_rounds: number
  min_balance_per_round: number
  default_max_bids_per_team: number
}

export default function AuctionSettingsPage() {
  const router = useRouter()
  const params = useParams()
  const seasonId = params.seasonId as string

  const [settings, setSettings] = useState<AuctionSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const [formData, setFormData] = useState({
    auction_window: 'season_start',
    phase_1_end_round: 18,
    phase_1_min_balance: 30,
    phase_2_end_round: 20,
    phase_2_min_balance: 30,
    phase_3_min_balance: 10,
    min_squad_size: 25,
    max_squad_size: 30,
    max_rounds: 25,
    min_balance_per_round: 30,
    default_max_bids_per_team: 10
  })

  const isMidSeason = formData.auction_window?.toLowerCase().replace(/[-\s]/g, '_') === 'mid_season'

  const handleAuctionWindowChange = (val: string) => {
    const isMid = val.toLowerCase().replace(/[-\s]/g, '_') === 'mid_season'
    setFormData(prev => ({
      ...prev,
      auction_window: val,
      phase_1_end_round: isMid ? 0 : (prev.phase_1_end_round === 0 ? 18 : prev.phase_1_end_round),
      phase_1_min_balance: isMid ? 0 : (prev.phase_1_min_balance === 0 ? 30 : prev.phase_1_min_balance),
      phase_2_end_round: isMid ? 0 : (prev.phase_2_end_round === 0 ? 20 : prev.phase_2_end_round),
      phase_2_min_balance: isMid ? 0 : (prev.phase_2_min_balance === 0 ? 30 : prev.phase_2_min_balance),
    }))
  }

  useEffect(() => {
    fetchSettings()
  }, [seasonId])

  const fetchSettings = async () => {
    try {
      const response = await fetch(`/api/auction-settings?season_id=${seasonId}`)
      if (response.ok) {
        const data = await response.json()
        if (data.settings) {
          setSettings(data.settings)
          const isMid = data.settings.auction_window?.toLowerCase().replace(/[-\s]/g, '_') === 'mid_season'
          setFormData({
            auction_window: data.settings.auction_window || 'season_start',
            phase_1_end_round: isMid ? 0 : (data.settings.phase_1_end_round ?? 18),
            phase_1_min_balance: isMid ? 0 : (data.settings.phase_1_min_balance ?? 30),
            phase_2_end_round: isMid ? 0 : (data.settings.phase_2_end_round ?? 20),
            phase_2_min_balance: isMid ? 0 : (data.settings.phase_2_min_balance ?? 30),
            phase_3_min_balance: data.settings.phase_3_min_balance ?? 10,
            min_squad_size: data.settings.min_squad_size ?? 25,
            max_squad_size: data.settings.max_squad_size ?? 30,
            max_rounds: data.settings.max_rounds ?? 25,
            min_balance_per_round: data.settings.min_balance_per_round ?? 30,
            default_max_bids_per_team: data.settings.default_max_bids_per_team || 10
          })
        }
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    const isMid = formData.auction_window?.toLowerCase().replace(/[-\s]/g, '_') === 'mid_season'

    // Validation
    if (!isMid) {
      if (formData.phase_2_end_round <= formData.phase_1_end_round) {
        setMessage({ type: 'error', text: 'Phase 2 end round must be after Phase 1 end round' })
        return
      }

      if (formData.max_rounds < formData.phase_2_end_round) {
        setMessage({ type: 'error', text: 'Max rounds must be >= Phase 2 end round' })
        return
      }
    }

    if (formData.max_squad_size < formData.min_squad_size) {
      setMessage({ type: 'error', text: 'Maximum squad size must be >= minimum squad size' })
      return
    }

    if (formData.max_rounds < 1) {
      setMessage({ type: 'error', text: 'Max rounds must be at least 1' })
      return
    }

    setSaving(true)

    try {
      const payload = {
        season_id: seasonId,
        ...formData,
        auction_window: formData.auction_window,
        phase_1_end_round: isMid ? 0 : formData.phase_1_end_round,
        phase_1_min_balance: isMid ? 0 : formData.phase_1_min_balance,
        phase_2_end_round: isMid ? 0 : formData.phase_2_end_round,
        phase_2_min_balance: isMid ? 0 : formData.phase_2_min_balance,
      }

      const response = await fetch('/api/auction-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save settings')
      }

      setMessage({ type: 'success', text: 'Auction settings saved successfully!' })
      fetchSettings()
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <PageLoader />
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 pt-6">
      {/* Back Link */}
      <div className="mb-6">
        <Link
          href={`/sub-admin/${seasonId}`}
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#E8A800] hover:text-[#FFC93A] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Season
        </Link>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl sm:text-5xl font-black text-white mb-2 bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent uppercase tracking-wider leading-none">
          Auction Settings
        </h1>
        <p className="text-[10px] sm:text-xs font-black text-gray-500 uppercase tracking-widest font-mono">
          Configure phase boundaries, reserve amounts, and squad size limits
        </p>
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-6 p-4 rounded-2xl border font-mono text-xs uppercase tracking-wider ${
          message.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
            : 'bg-red-500/10 border-red-500/25 text-red-400'
        }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Auction Window Setting */}
        <div className="rounded-2xl bg-white/[0.01] border border-white/5 p-6 backdrop-blur-xl shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
            <h2 className="text-lg font-black text-white uppercase tracking-tight">Auction Window</h2>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider font-mono border self-start sm:self-auto ${
              isMidSeason 
                ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' 
                : formData.auction_window === 'season_end'
                  ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                  : 'bg-[#E8A800]/10 text-[#E8A800] border-[#E8A800]/30'
            }`}>
              {isMidSeason ? '⚡ Mid Season: Phase 3 Only' : formData.auction_window === 'season_end' ? 'Season End' : 'Season Start: 3 Phases'}
            </span>
          </div>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-5">
            When the auction takes place relative to the season
          </p>

          {/* Interactive Mode Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            {[
              {
                value: 'season_start',
                label: 'Season Start',
                badge: '3 Phases',
                badgeColor: 'border-red-500/30 text-red-400 bg-red-500/10',
                desc: 'Standard season-opening auction with Phase 1, Phase 2, and Phase 3 reserve rules.'
              },
              {
                value: 'mid_season',
                label: 'Mid Season',
                badge: 'Phase 3 Only',
                badgeColor: 'border-blue-500/30 text-blue-400 bg-blue-500/10',
                desc: 'Mid-season reinforcement auction. Only Phase 3 applies. Phase 1 & 2 are bypassed.'
              },
              {
                value: 'season_end',
                label: 'Season End',
                badge: 'Post Season',
                badgeColor: 'border-purple-500/30 text-purple-400 bg-purple-500/10',
                desc: 'End-of-season auction window for wrap-up squad adjustments.'
              }
            ].map(option => {
              const selected = formData.auction_window === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleAuctionWindowChange(option.value)}
                  className={`relative p-4 rounded-xl text-left transition-all cursor-pointer border ${
                    selected
                      ? 'bg-[#E8A800]/10 border-[#E8A800] shadow-[0_0_20px_rgba(232,168,0,0.15)] ring-1 ring-[#E8A800]/50'
                      : 'bg-white/[0.02] border-white/5 hover:border-white/20 hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-black uppercase tracking-wider ${selected ? 'text-[#E8A800]' : 'text-white'}`}>
                      {option.label}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border font-mono ${option.badgeColor}`}>
                      {option.badge}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 font-medium leading-relaxed">
                    {option.desc}
                  </p>
                  {selected && (
                    <div className="mt-3 flex items-center gap-1.5 text-[10px] font-bold text-[#E8A800] uppercase tracking-widest font-mono">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Active Mode
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {/* Quick Select Fallback */}
          <div className="pt-3 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider font-mono">Or select via dropdown:</span>
            <select
              value={formData.auction_window}
              onChange={(e) => handleAuctionWindowChange(e.target.value)}
              className="bg-black/60 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#E8A800] font-mono cursor-pointer"
            >
              <option value="season_start" className="bg-[#121212] text-white">Season Start (3 Phases)</option>
              <option value="mid_season" className="bg-[#121212] text-white">Mid Season (Phase 3 Only)</option>
              <option value="season_end" className="bg-[#121212] text-white">Season End</option>
            </select>
          </div>
        </div>

        {isMidSeason ? (
          /* Mid Season Phase Notice */
          <div className="rounded-2xl bg-blue-500/[0.04] border border-blue-500/20 p-6 backdrop-blur-xl shadow-md">
            <div className="flex items-start gap-4">
              <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-black text-sm shrink-0 mt-0.5">
                P3
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-base font-black text-blue-400 uppercase tracking-tight">Phase 3 Only Auction</h3>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-blue-500/15 text-blue-400 border border-blue-500/30 font-mono">
                    Mid Season Mode
                  </span>
                </div>
                <p className="text-xs text-gray-400 font-medium leading-relaxed">
                  Mid Season auctions operate exclusively under <strong className="text-white">Phase 3</strong>. Phase 1 (Strict Reserve) and Phase 2 (Soft Reserve) are bypassed. Teams maintain flexible reserves strictly to reach their minimum squad size.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Phase 1 Settings */}
            <div className="rounded-2xl bg-red-500/[0.02] border border-red-500/10 p-6 backdrop-blur-xl shadow-md">
              <h2 className="text-lg font-black text-red-400 mb-1 uppercase tracking-tight">Phase 1 - Strict Reserve</h2>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-4">
                Teams must maintain reserves for all future rounds. Cannot skip rounds.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] text-gray-500 font-extrabold uppercase tracking-widest font-mono mb-2">
                    End Round <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.phase_1_end_round}
                    onChange={(e) => setFormData(prev => ({ ...prev, phase_1_end_round: parseInt(e.target.value) || 0 }))}
                    className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500/30 transition-all font-mono"
                    min="1"
                    required={!isMidSeason}
                  />
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider font-mono mt-1.5">Rounds 1 to this number</p>
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 font-extrabold uppercase tracking-widest font-mono mb-2">
                    Minimum Balance per Round <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-mono text-sm">£</span>
                    <input
                      type="number"
                      value={formData.phase_1_min_balance}
                      onChange={(e) => setFormData(prev => ({ ...prev, phase_1_min_balance: parseInt(e.target.value) || 0 }))}
                      className="w-full bg-white/[0.02] border border-white/5 rounded-xl pl-8 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500/30 transition-all font-mono"
                      min="1"
                      required={!isMidSeason}
                    />
                  </div>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider font-mono mt-1.5">Reserve per remaining round</p>
                </div>
              </div>
            </div>

            {/* Phase 2 Settings */}
            <div className="rounded-2xl bg-amber-500/[0.02] border border-amber-500/10 p-6 backdrop-blur-xl shadow-md">
              <h2 className="text-lg font-black text-amber-400 mb-1 uppercase tracking-tight">Phase 2 - Soft Reserve with Floor</h2>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-4">
                Floor reserve enforced, recommended reserve shown. Teams can skip if balance &lt; minimum.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] text-gray-500 font-extrabold uppercase tracking-widest font-mono mb-2">
                    End Round <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.phase_2_end_round}
                    onChange={(e) => setFormData(prev => ({ ...prev, phase_2_end_round: parseInt(e.target.value) || 0 }))}
                    className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/30 transition-all font-mono"
                    min={formData.phase_1_end_round + 1}
                    required={!isMidSeason}
                  />
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider font-mono mt-1.5">After Phase 1 to this number</p>
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 font-extrabold uppercase tracking-widest font-mono mb-2">
                    Minimum Balance per Round <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-mono text-sm">£</span>
                    <input
                      type="number"
                      value={formData.phase_2_min_balance}
                      onChange={(e) => setFormData(prev => ({ ...prev, phase_2_min_balance: parseInt(e.target.value) || 0 }))}
                      className="w-full bg-white/[0.02] border border-white/5 rounded-xl pl-8 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/30 transition-all font-mono"
                      min="1"
                      required={!isMidSeason}
                    />
                  </div>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider font-mono mt-1.5">Reserve per remaining round</p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Phase 3 Settings */}
        <div className="rounded-2xl bg-blue-500/[0.02] border border-blue-500/10 p-6 backdrop-blur-xl shadow-md">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-black text-blue-400 uppercase tracking-tight">
              {isMidSeason ? 'Phase 3 - Flexible Floor (Active Phase)' : 'Phase 3 - Flexible Floor'}
            </h2>
            {isMidSeason && (
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-blue-500/15 text-blue-400 border border-blue-500/30 font-mono">
                Sole Active Phase
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-4">
            {isMidSeason 
              ? 'Reserve enforced only until minimum squad reached. After that, no restrictions.'
              : 'Reserve enforced only until minimum squad reached. After that, no restrictions.'}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] text-gray-500 font-extrabold uppercase tracking-widest font-mono mb-2">
                Minimum Balance per Slot <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-mono text-sm">£</span>
                <input
                  type="number"
                  value={formData.phase_3_min_balance}
                  onChange={(e) => setFormData(prev => ({ ...prev, phase_3_min_balance: parseInt(e.target.value) || 0 }))}
                  className="w-full bg-white/[0.02] border border-white/5 rounded-xl pl-8 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/30 transition-all font-mono"
                  min="1"
                  required
                />
              </div>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider font-mono mt-1.5">Reserve per slot to reach min squad</p>
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 font-extrabold uppercase tracking-widest font-mono mb-2">
                Max Rounds <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                value={formData.max_rounds}
                onChange={(e) => setFormData(prev => ({ ...prev, max_rounds: parseInt(e.target.value) || 0 }))}
                className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/30 transition-all font-mono"
                min={isMidSeason ? 1 : formData.phase_2_end_round + 1}
                required
              />
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider font-mono mt-1.5">Total auction rounds</p>
            </div>
          </div>
        </div>

        {/* Squad Size Settings */}
        <div className="rounded-2xl bg-purple-500/[0.02] border border-purple-500/10 p-6 backdrop-blur-xl shadow-md">
          <h2 className="text-lg font-black text-purple-400 mb-1 uppercase tracking-tight">Squad Size Configuration</h2>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-4">
            Minimum squad size is mandatory. After reaching it, teams can optionally acquire up to maximum.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] text-gray-500 font-extrabold uppercase tracking-widest font-mono mb-2">
                Minimum Squad Size <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                value={formData.min_squad_size}
                onChange={(e) => setFormData(prev => ({ ...prev, min_squad_size: parseInt(e.target.value) }))}
                className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500/30 transition-all font-mono"
                min="1"
                required
              />
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider font-mono mt-1.5">Mandatory minimum players</p>
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 font-extrabold uppercase tracking-widest font-mono mb-2">
                Maximum Squad Size <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                value={formData.max_squad_size}
                onChange={(e) => setFormData(prev => ({ ...prev, max_squad_size: parseInt(e.target.value) }))}
                className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500/30 transition-all font-mono"
                min={formData.min_squad_size}
                required
              />
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider font-mono mt-1.5">Optional maximum players</p>
            </div>
          </div>
        </div>

        {/* Other Settings */}
        <div className="rounded-2xl bg-white/[0.01] border border-white/5 p-6 backdrop-blur-xl shadow-md">
          <h2 className="text-lg font-black text-white mb-4 uppercase tracking-tight">Other Settings</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] text-gray-500 font-extrabold uppercase tracking-widest font-mono mb-2">
                Min Balance per Round <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-mono text-sm">£</span>
                <input
                  type="number"
                  value={formData.min_balance_per_round}
                  onChange={(e) => setFormData(prev => ({ ...prev, min_balance_per_round: parseInt(e.target.value) }))}
                  className="w-full bg-white/[0.02] border border-white/5 rounded-xl pl-8 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#E8A800]/30 transition-all font-mono"
                  min="1"
                  required
                />
              </div>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider font-mono mt-1.5">Minimum balance required per round</p>
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 font-extrabold uppercase tracking-widest font-mono mb-2">
                Default Max Bids per Team <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                value={formData.default_max_bids_per_team}
                onChange={(e) => setFormData(prev => ({ ...prev, default_max_bids_per_team: parseInt(e.target.value) }))}
                className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#E8A800]/30 transition-all font-mono"
                min="1"
                max="50"
                required
              />
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider font-mono mt-1.5">Default maximum bids per team in regular rounds</p>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-gradient-to-r from-[#E8A800] to-[#FFB347] hover:from-[#FFC93A] hover:to-[#FFB347] disabled:opacity-40 text-[#0a0a0a] px-6 py-2.5 rounded-xl font-bold transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
          >
            {saving && <LoadingSpinner size="sm" />}
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
          <Link
            href={`/sub-admin/${seasonId}`}
            className="px-6 py-2.5 bg-white/[0.01] border border-white/5 hover:border-white/10 text-white rounded-xl font-bold transition-all text-xs uppercase tracking-wider text-center cursor-pointer"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
