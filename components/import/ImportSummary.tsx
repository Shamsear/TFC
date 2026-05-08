'use client'

import { PreviewResponse } from '@/app/api/import/preview/route'

interface ImportSummaryProps {
  preview: PreviewResponse
  selectedCount: number
  onConfirm: () => void
  onBack: () => void
  isLoading: boolean
  error: string
}

export default function ImportSummary({
  preview,
  selectedCount,
  onConfirm,
  onBack,
  isLoading,
  error
}: ImportSummaryProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white/5 border border-white/10 p-8">
        <h2 className="text-2xl font-black text-white mb-6">Confirm Import</h2>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="rounded-xl bg-cyan-500/10 border border-cyan-500/20 p-4 text-center">
            <div className="text-3xl font-black text-cyan-400">{selectedCount}</div>
            <div className="text-sm text-gray-400">Players Selected</div>
          </div>
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-center">
            <div className="text-3xl font-black text-emerald-400">{preview.stats.new}</div>
            <div className="text-sm text-gray-400">New Players</div>
          </div>
          <div className="rounded-xl bg-orange-500/10 border border-orange-500/20 p-4 text-center">
            <div className="text-3xl font-black text-orange-400">{preview.stats.changed}</div>
            <div className="text-sm text-gray-400">Updates</div>
          </div>
          <div className="rounded-xl bg-gray-500/10 border border-gray-500/20 p-4 text-center">
            <div className="text-3xl font-black text-gray-400">{preview.players.length - selectedCount}</div>
            <div className="text-sm text-gray-400">Skipped</div>
          </div>
        </div>

        {/* Warning */}
        <div className="rounded-xl bg-yellow-500/10 border border-yellow-500/20 p-4 mb-6">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <div className="font-bold text-yellow-400 mb-1">Important</div>
              <div className="text-sm text-gray-300">
                {preview.mode === 'import' 
                  ? 'This will create new player records in the database. Make sure you have reviewed all selections.'
                  : 'This will update existing player stats. Changed data cannot be automatically recovered.'}
              </div>
            </div>
          </div>
        </div>

        {/* Action Details */}
        <div className="space-y-3 mb-6">
          <div className="text-sm font-bold text-white mb-2">What will happen:</div>
          {preview.mode === 'import' ? (
            <>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center text-emerald-400 flex-shrink-0">
                  1
                </div>
                <div className="text-gray-300">
                  Create <span className="font-bold text-white">{selectedCount}</span> new player records
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center text-emerald-400 flex-shrink-0">
                  2
                </div>
                <div className="text-gray-300">
                  Link players to season <span className="font-bold text-white">{preview.seasonId}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center text-emerald-400 flex-shrink-0">
                  3
                </div>
                <div className="text-gray-300">
                  Store all player stats and attributes
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-6 h-6 rounded-full bg-orange-500/20 border border-orange-500 flex items-center justify-center text-orange-400 flex-shrink-0">
                  1
                </div>
                <div className="text-gray-300">
                  Update <span className="font-bold text-white">{preview.stats.changed}</span> existing player records
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-6 h-6 rounded-full bg-orange-500/20 border border-orange-500 flex items-center justify-center text-orange-400 flex-shrink-0">
                  2
                </div>
                <div className="text-gray-300">
                  Add <span className="font-bold text-white">{preview.stats.new}</span> new players
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-6 h-6 rounded-full bg-orange-500/20 border border-orange-500 flex items-center justify-center text-orange-400 flex-shrink-0">
                  3
                </div>
                <div className="text-gray-300">
                  Keep <span className="font-bold text-white">{preview.stats.unchanged}</span> players unchanged
                </div>
              </div>
            </>
          )}
        </div>

        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={onBack}
            disabled={isLoading}
            className="px-6 py-3 bg-white/5 border border-white/10 text-white rounded-xl font-bold hover:bg-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Back
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading || selectedCount === 0}
            className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:from-gray-700 disabled:to-gray-800 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-bold transition-all"
          >
            {isLoading ? 'Processing...' : `Confirm Import (${selectedCount} Players)`}
          </button>
        </div>
      </div>
    </div>
  )
}
