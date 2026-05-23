'use client'

import { useState, useEffect } from 'react'

interface TeamAudit {
  teamId: string
  teamName: string
  currentBalance: number
  initialPurse: number
  totalSpent: number
  totalAdjustments: number
  calculatedBalance: number
  difference: number
  hasError: boolean
  transferCount: number
  ledgerEntryCount: number
}

interface AuditResult {
  success: boolean
  seasonId: string
  totalTeams: number
  teamsWithErrors: number
  teamsWithoutErrors: number
  totalDiscrepancy: number
  audits: {
    errors: TeamAudit[]
    correct: TeamAudit[]
  }
}

interface BalanceAuditClientProps {
  seasonId: string
  isSuperAdmin: boolean
}

export default function BalanceAuditClient({ seasonId, isSuperAdmin }: BalanceAuditClientProps) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AuditResult | null>(null)
  const [fixing, setFixing] = useState<string | null>(null)
  const [fixResults, setFixResults] = useState<Record<string, any>>({})

  const runAudit = async () => {
    setLoading(true)
    setResult(null)
    setFixResults({})

    try {
      const response = await fetch(`/api/admin/balances/audit?seasonId=${seasonId}`)
      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error('Audit failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const fixBalance = async (teamId: string, correctBalance: number, teamName: string) => {
    setFixing(teamId)

    try {
      const response = await fetch('/api/admin/balances/fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seasonId,
          teamId,
          correctBalance,
          reason: `Auto-fix: Balance audit correction`
        })
      })

      const data = await response.json()
      setFixResults((prev) => ({ ...prev, [teamId]: data }))

      if (data.success) {
        // Re-run audit after fix
        setTimeout(() => runAudit(), 1000)
      }
    } catch (error) {
      setFixResults((prev) => ({
        ...prev,
        [teamId]: { success: false, error: 'Failed to fix balance' }
      }))
    } finally {
      setFixing(null)
    }
  }

  useEffect(() => {
    runAudit()
  }, [seasonId])

  return (
    <div className="space-y-6">
      {/* Run Audit Button */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-white mb-1">Balance Audit Report</h2>
          <p className="text-gray-400 text-sm">Check all team balances for discrepancies</p>
        </div>
        <button
          onClick={runAudit}
          disabled={loading}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#E8A800] to-[#FFB347] hover:from-[#FFC93A] hover:to-[#FFB347] text-[#0a0a0a] font-bold transition-all disabled:opacity-50"
        >
          {loading ? 'Running...' : 'Run Audit'}
        </button>
      </div>

      {/* Summary */}
      {result && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl bg-white/5 border border-white/10 p-6">
            <div className="text-sm text-gray-400 mb-2">Total Teams</div>
            <div className="text-3xl font-black text-white">{result.totalTeams}</div>
          </div>

          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-6">
            <div className="text-sm text-emerald-400 mb-2">Correct Balances</div>
            <div className="text-3xl font-black text-emerald-400">{result.teamsWithoutErrors}</div>
          </div>

          <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-6">
            <div className="text-sm text-red-400 mb-2">Balance Errors</div>
            <div className="text-3xl font-black text-red-400">{result.teamsWithErrors}</div>
          </div>

          <div className="rounded-xl bg-orange-500/10 border border-orange-500/20 p-6">
            <div className="text-sm text-orange-400 mb-2">Total Discrepancy</div>
            <div className="text-3xl font-black text-orange-400">£{result.totalDiscrepancy}</div>
          </div>
        </div>
      )}

      {/* Teams with Errors */}
      {result && result.audits.errors.length > 0 && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-6">
          <h3 className="text-xl font-black text-red-400 mb-4 flex items-center gap-2">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Teams with Balance Errors
          </h3>

          <div className="space-y-4">
            {result.audits.errors.map((team) => (
              <div key={team.teamId} className="rounded-lg bg-black/30 border border-red-500/20 p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="text-lg font-black text-white mb-1">{team.teamName}</div>
                    <div className="text-sm text-gray-400">
                      {team.transferCount} transfers • {team.ledgerEntryCount} ledger entries
                    </div>
                  </div>
                  <button
                    onClick={() => fixBalance(team.teamId, team.calculatedBalance, team.teamName)}
                    disabled={fixing === team.teamId}
                    className="px-4 py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 font-bold text-sm transition-all disabled:opacity-50"
                  >
                    {fixing === team.teamId ? 'Fixing...' : 'Fix Balance'}
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div>
                    <div className="text-gray-500 mb-1">Current</div>
                    <div className="font-bold text-white">£{team.currentBalance.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 mb-1">Expected</div>
                    <div className="font-bold text-emerald-400">£{team.calculatedBalance.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 mb-1">Difference</div>
                    <div className="font-bold text-red-400">
                      {team.difference > 0 ? '+' : ''}£{team.difference.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500 mb-1">Total Spent</div>
                    <div className="font-bold text-gray-300">£{team.totalSpent.toLocaleString()}</div>
                  </div>
                </div>

                {fixResults[team.teamId] && (
                  <div
                    className={`mt-3 p-3 rounded-lg ${
                      fixResults[team.teamId].success
                        ? 'bg-emerald-500/10 border border-emerald-500/20'
                        : 'bg-red-500/10 border border-red-500/20'
                    }`}
                  >
                    <div
                      className={`text-sm font-bold ${
                        fixResults[team.teamId].success ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {fixResults[team.teamId].success
                        ? `✓ Fixed: £${fixResults[team.teamId].oldBalance} → £${fixResults[team.teamId].newBalance}`
                        : `✗ ${fixResults[team.teamId].error}`}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Teams without Errors */}
      {result && result.audits.correct.length > 0 && (
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-6">
          <h3 className="text-xl font-black text-emerald-400 mb-4 flex items-center gap-2">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Teams with Correct Balances ({result.audits.correct.length})
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {result.audits.correct.map((team) => (
              <div key={team.teamId} className="rounded-lg bg-black/30 border border-emerald-500/20 p-4">
                <div className="font-bold text-white mb-1">{team.teamName}</div>
                <div className="text-sm text-gray-400">
                  Balance: £{team.currentBalance.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {team.transferCount} transfers • £{team.totalSpent.toLocaleString()} spent
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && !result && (
        <div className="rounded-xl bg-white/5 border border-white/10 p-12 text-center">
          <div className="text-gray-400">Click "Run Audit" to check team balances</div>
        </div>
      )}
    </div>
  )
}
