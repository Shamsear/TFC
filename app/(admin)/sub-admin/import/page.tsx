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
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-6 sm:pb-8 lg:pb-12">
        {/* Header */}
        <div className="mb-6 sm:mb-8 lg:mb-12">
          <Link
            href="/sub-admin"
            className="inline-flex items-center gap-2 text-[#E8A800] hover:text-[#FFC93A] text-sm font-medium mb-4 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-2 sm:mb-3">
            <span className="bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent">
              Database Import
            </span>
          </h1>
          <p className="text-[#D4CCBB] text-sm sm:text-base">
            Import player data from eFootball database with full preview and control
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl flex items-start gap-3">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Season Selection */}
        <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6 mb-6">
          <label htmlFor="season" className="block text-sm sm:text-base font-bold mb-3 text-white">
            Select Season <span className="text-red-400">*</span>
          </label>
          {isLoadingSeasons ? (
            <div className="flex items-center gap-3 text-[#D4CCBB] py-3">
              <svg className="animate-spin h-5 w-5 text-[#E8A800]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-sm">Loading seasons...</span>
            </div>
          ) : seasons.length === 0 ? (
            <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 px-4 py-3 rounded-xl text-sm">
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
          <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-8 sm:p-12 text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl bg-[#E8A800]/10 border border-[#E8A800]/20 flex items-center justify-center text-[#E8A800] mx-auto mb-4 sm:mb-6">
              <svg className="w-8 h-8 sm:w-10 sm:h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white mb-2">Select a Season to Begin</h3>
            <p className="text-sm sm:text-base text-[#7A7367]">Choose a season from the dropdown above to start importing players</p>
          </div>
        )}
      </div>
    </div>
  )
}
