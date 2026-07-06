"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import PageLoader from "@/components/ui/PageLoader"
import LoadingSpinner from "@/components/ui/LoadingSpinner"
import SearchableSelect from '@/components/ui/SearchableSelect'

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
          setFormData({
            auction_window: data.settings.auction_window || 'season_start',
            phase_1_end_round: data.settings.phase_1_end_round,
            phase_1_min_balance: data.settings.phase_1_min_balance,
            phase_2_end_round: data.settings.phase_2_end_round,
            phase_2_min_balance: data.settings.phase_2_min_balance,
            phase_3_min_balance: data.settings.phase_3_min_balance,
            min_squad_size: data.settings.min_squad_size,
            max_squad_size: data.settings.max_squad_size,
            max_rounds: data.settings.max_rounds,
            min_balance_per_round: data.settings.min_balance_per_round,
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

    // Validation
    if (formData.phase_2_end_round <= formData.phase_1_end_round) {
      setMessage({ type: 'error', text: 'Phase 2 end round must be after Phase 1 end round' })
      return
    }

    if (formData.max_squad_size < formData.min_squad_size) {
      setMessage({ type: 'error', text: 'Maximum squad size must be >= minimum squad size' })
      return
    }

    if (formData.max_rounds < formData.phase_2_end_round) {
      setMessage({ type: 'error', text: 'Max rounds must be >= Phase 2 end round' })
      return
    }

    setSaving(true)

    try {
      const response = await fetch('/api/auction-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          season_id: seasonId,
          ...formData
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save settings')
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
          <h2 className="text-lg font-black text-white mb-1 uppercase tracking-tight">Auction Window</h2>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-4">
            When the auction takes place relative to the season
          </p>
          <div>
            <SearchableSelect
              label="Auction Timing"
              value={formData.auction_window}
              options={[
                { value: 'season_start', label: 'Season Start' },
                { value: 'mid_season', label: 'Mid Season' },
                { value: 'season_end', label: 'Season End' }
              ]}
              onChange={(val) => setFormData(prev => ({ ...prev, auction_window: val }))}
              required={true}
              enableSearch={false}
            />
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider font-mono mt-1.5">When the auction window opens</p>
          </div>
        </div>

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
                onChange={(e) => setFormData(prev => ({ ...prev, phase_1_end_round: parseInt(e.target.value) }))}
                className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500/30 transition-all font-mono"
                min="1"
                required
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
                  onChange={(e) => setFormData(prev => ({ ...prev, phase_1_min_balance: parseInt(e.target.value) }))}
                  className="w-full bg-white/[0.02] border border-white/5 rounded-xl pl-8 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500/30 transition-all font-mono"
                  min="1"
                  required
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
                onChange={(e) => setFormData(prev => ({ ...prev, phase_2_end_round: parseInt(e.target.value) }))}
                className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/30 transition-all font-mono"
                min={formData.phase_1_end_round + 1}
                required
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
                  onChange={(e) => setFormData(prev => ({ ...prev, phase_2_min_balance: parseInt(e.target.value) }))}
                  className="w-full bg-white/[0.02] border border-white/5 rounded-xl pl-8 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/30 transition-all font-mono"
                  min="1"
                  required
                />
              </div>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider font-mono mt-1.5">Reserve per remaining round</p>
            </div>
          </div>
        </div>

        {/* Phase 3 Settings */}
        <div className="rounded-2xl bg-blue-500/[0.02] border border-blue-500/10 p-6 backdrop-blur-xl shadow-md">
          <h2 className="text-lg font-black text-blue-400 mb-1 uppercase tracking-tight">Phase 3 - Flexible Floor</h2>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-4">
            Reserve enforced only until minimum squad reached. After that, no restrictions.
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
                  onChange={(e) => setFormData(prev => ({ ...prev, phase_3_min_balance: parseInt(e.target.value) }))}
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
                onChange={(e) => setFormData(prev => ({ ...prev, max_rounds: parseInt(e.target.value) }))}
                className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/30 transition-all font-mono"
                min={formData.phase_2_end_round + 1}
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
