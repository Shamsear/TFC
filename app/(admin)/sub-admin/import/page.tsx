'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import ImportWizard from '@/components/import/ImportWizard'
import SearchableSelect from '@/components/ui/SearchableSelect'

interface Season {
  id: string
  name: string
  startingPurse: number
}

export default function DatabaseImportPage() {
  const [seasons, setSeasons] = useState<Season[]>([])
  const [selectedSeasonId, setSelectedSeasonId] = useState('')
  const [isLoadingSeasons, setIsLoadingSeasons] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchSeasons()
  }, [])

  const fetchSeasons = async () => {
    try {
      const response = await fetch('/api/seasons')
      if (!response.ok) throw new Error('Failed to fetch seasons')
      const data = await response.json()
      setSeasons(data)
    } catch (err) {
      setError('Failed to load seasons')
    } finally {
      setIsLoadingSeasons(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 pt-6">
      {/* Back Link */}
      <div className="mb-6">
        <Link
          href="/sub-admin"
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#E8A800] hover:text-[#FFC93A] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </Link>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl sm:text-5xl font-black text-white mb-2 bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent uppercase tracking-wider leading-none">
          Database Import
        </h1>
        <p className="text-[10px] sm:text-xs font-black text-gray-500 uppercase tracking-widest font-mono">
          Import player data from eFootball database with full preview and control
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl flex items-start gap-3 font-mono text-xs uppercase tracking-wider">
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Season Selection */}
      <div className="rounded-2xl bg-white/[0.01] border border-white/5 p-6 mb-8 backdrop-blur-xl shadow-md">
        <label htmlFor="season" className="block text-[10px] text-gray-500 font-extrabold uppercase tracking-widest font-mono mb-3">
          Select Season <span className="text-red-400">*</span>
        </label>
        {isLoadingSeasons ? (
          <div className="flex items-center gap-3 text-gray-500 py-3">
            <svg className="animate-spin h-5 w-5 text-[#E8A800]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-xs font-mono font-bold uppercase tracking-wider">Loading seasons...</span>
          </div>
        ) : seasons.length === 0 ? (
          <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 p-4 rounded-xl text-xs font-mono uppercase tracking-wider">
            No seasons available. Please contact a Super Admin to create a season.
          </div>
        ) : (
          <SearchableSelect
            value={selectedSeasonId}
            options={[
              { value: '', label: 'Choose a season...' },
              ...seasons.map(season => ({
                value: season.id,
                label: `${season.name} (Starting Purse: $${season.startingPurse.toLocaleString()})`
              }))
            ]}
            onChange={setSelectedSeasonId}
            enableSearch={true}
          />
        )}
      </div>

      {/* Import Wizard */}
      {selectedSeasonId ? (
        <ImportWizard seasonId={selectedSeasonId} />
      ) : (
        <div className="rounded-2xl bg-white/[0.01] border border-white/5 p-8 sm:p-12 text-center backdrop-blur-xl">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-[#E8A800] mx-auto mb-6">
            <svg className="w-8 h-8 sm:w-10 sm:h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <h3 className="text-xl font-black text-white mb-2 uppercase tracking-wide">Select a Season to Begin</h3>
          <p className="text-xs font-black text-gray-500 uppercase tracking-widest font-mono">Choose a season from the dropdown above to start importing players</p>
        </div>
      )}
    </div>
  )
}
