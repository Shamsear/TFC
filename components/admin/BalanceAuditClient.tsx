'use client'

import { useState, useEffect } from 'react'

interface TeamAudit {
  teamId: string
  teamName: string
  currentBalance: number
  initialPurse: number
  totalSpent: number
  totalSales: number
  totalRefunds: number
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
  const [fixingAll, setFixingAll] = useState(false)
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

  const fixAllBalances = async () => {
    if (!result || result.audits.errors.length === 0) return

    const confirmFix = confirm(
      `Are you sure you want to fix all ${result.audits.errors.length} team balance(s)? This will create adjustment transactions for each team.`
    )

    if (!confirmFix) return

    setFixingAll(true)
    setFixResults({})

    const errors = result.audits.errors
    let successCount = 0
    let failCount = 0

    for (const team of errors) {
      try {
        const response = await fetch('/api/admin/balances/fix', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            seasonId,
            teamId: team.teamId,
            correctBalance: team.calculatedBalance,
            reason: `Bulk auto-fix: Balance audit correction`
          })
        })

        const data = await response.json()
        setFixResults((prev) => ({ ...prev, [team.teamId]: data }))

        if (data.success) {
          successCount++
        } else {
          failCount++
        }
      } catch (error) {
        setFixResults((prev) => ({
          ...prev,
          [team.teamId]: { success: false, error: 'Failed to fix balance' }
        }))
        failCount++
      }
    }

    setFixingAll(false)

    // Re-run audit after all fixes
    setTimeout(() => {
      runAudit()
      alert(`Fixed ${successCount} team(s) successfully. ${failCount > 0 ? `${failCount} failed.` : ''}`)
    }, 1000)
  }

  useEffect(() => {
    runAudit()
  }, [seasonId])

  return (
    <div className="space-y-6">
      {/* Run Audit Button */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-white mb-1 uppercase tracking-wider font-mono">Balance Audit Report</h2>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider font-mono">Check all team balances for discrepancies</p>
        </div>
        <button
          onClick={runAudit}
          disabled={loading}
          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#E8A800] to-[#FFB347] hover:from-[#FFC93A] hover:to-[#FFB347] text-[#0a0a0a] font-bold transition-all disabled:opacity-50 text-xs uppercase tracking-wider cursor-pointer shadow-md"
        >
          {loading ? 'Running...' : 'Run Audit'}
        </button>
      </div>

      {/* Summary */}
      {result && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl bg-white/[0.01] border border-white/5 p-5 backdrop-blur-xl shadow-md transition-all hover:border-[#E8A800]/25 duration-300">
            <div className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest font-mono mb-1">Total Teams</div>
            <div className="text-2xl font-black text-white font-mono">{result.totalTeams}</div>
          </div>

          <div className="rounded-2xl bg-emerald-500/[0.02] border border-emerald-500/10 p-5 backdrop-blur-xl shadow-md">
            <div className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-widest font-mono mb-1">Correct Balances</div>
            <div className="text-2xl font-black text-emerald-400 font-mono">{result.teamsWithoutErrors}</div>
          </div>

          <div className="rounded-2xl bg-red-500/[0.02] border border-red-500/10 p-5 backdrop-blur-xl shadow-md">
            <div className="text-[10px] text-red-400 font-extrabold uppercase tracking-widest font-mono mb-1">Balance Errors</div>
            <div className="text-2xl font-black text-red-400 font-mono">{result.teamsWithErrors}</div>
          </div>

          <div className="rounded-2xl bg-orange-500/[0.02] border border-orange-500/10 p-5 backdrop-blur-xl shadow-md">
            <div className="text-[10px] text-orange-400 font-extrabold uppercase tracking-widest font-mono mb-1">Total Discrepancy</div>
            <div className="text-2xl font-black text-orange-400 font-mono">£{result.totalDiscrepancy.toLocaleString()}</div>
          </div>
        </div>
      )}

      {/* Teams with Errors */}
      {result && result.audits.errors.length > 0 && (
        <div className="rounded-2xl bg-red-500/[0.02] border border-red-500/10 p-6 backdrop-blur-xl shadow-md">
          <div className="flex items-center justify-between mb-4 border-b border-red-500/10 pb-4">
            <h3 className="text-lg font-black text-red-400 flex items-center gap-2 uppercase tracking-wider font-mono">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Teams with Balance Errors
            </h3>
            <button
              onClick={fixAllBalances}
              disabled={fixingAll || fixing !== null}
              className="px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer flex items-center gap-2"
            >
              {fixingAll ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4}></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Fixing All...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Fix All Balances
                </>
              )}
            </button>
          </div>

          <div className="space-y-4">
            {result.audits.errors.map((team) => (
              <div key={team.teamId} className="rounded-xl bg-white/[0.01] border border-white/5 hover:border-red-500/20 transition-all p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="text-base sm:text-lg font-black text-white mb-1 uppercase tracking-tight">{team.teamName}</div>
                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider font-mono">
                      {team.transferCount} transfers • {team.ledgerEntryCount} ledger entries
                    </div>
                  </div>
                  <button
                    onClick={() => fixBalance(team.teamId, team.calculatedBalance, team.teamName)}
                    disabled={fixing === team.teamId}
                    className="px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {fixing === team.teamId ? 'Fixing...' : 'Fix Balance'}
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 text-xs border-t border-white/5 pt-3">
                  <div>
                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider font-mono mb-0.5">Starting Purse</div>
                    <div className="font-extrabold text-blue-400 font-mono">£{team.initialPurse.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider font-mono mb-0.5">Total Spent</div>
                    <div className="font-extrabold text-red-400 font-mono">-£{team.totalSpent.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider font-mono mb-0.5">Total Sales</div>
                    <div className="font-extrabold text-emerald-400 font-mono">+£{team.totalSales.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider font-mono mb-0.5">Total Refunds</div>
                    <div className="font-extrabold text-cyan-400 font-mono">+£{team.totalRefunds.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider font-mono mb-0.5">Current</div>
                    <div className="font-extrabold text-white font-mono">£{team.currentBalance.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider font-mono mb-0.5">Expected</div>
                    <div className="font-extrabold text-emerald-400 font-mono">£{team.calculatedBalance.toLocaleString()}</div>
                  </div>
                </div>
                
                <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                  <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider font-mono">
                    Calculated Summary
                    {team.totalAdjustments !== 0 && (
                      <span className="ml-2">• Adjustments: £{team.totalAdjustments.toLocaleString()}</span>
                    )}
                  </div>
                  <div className="text-xs font-black text-red-400 font-mono uppercase tracking-wider">
                    Difference: {team.difference > 0 ? '+' : ''}£{team.difference.toLocaleString()}
                  </div>
                </div>

                {fixResults[team.teamId] && (
                  <div
                    className={`mt-3 p-3 rounded-xl font-mono text-xs uppercase tracking-wider ${
                      fixResults[team.teamId].success
                        ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                        : 'bg-red-500/10 border border-red-500/20 text-red-400'
                    }`}
                  >
                    {fixResults[team.teamId].success
                      ? `✓ Fixed: old £${fixResults[team.teamId].oldBalance} → new £${fixResults[team.teamId].newBalance}`
                      : `✗ ${fixResults[team.teamId].error}`}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Teams without Errors */}
      {result && result.audits.correct.length > 0 && (
        <div className="rounded-2xl bg-emerald-500/[0.02] border border-emerald-500/10 p-6 backdrop-blur-xl shadow-md">
          <h3 className="text-lg font-black text-emerald-400 mb-4 flex items-center gap-2 uppercase tracking-wider font-mono">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Teams with Correct Balances ({result.audits.correct.length})
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {result.audits.correct.map((team) => (
              <div key={team.teamId} className="rounded-xl bg-white/[0.01] border border-white/5 p-4">
                <div className="font-extrabold text-white mb-1 uppercase tracking-tight text-sm sm:text-base">{team.teamName}</div>
                <div className="text-xs text-emerald-400 font-mono font-bold">
                  Balance: £{team.currentBalance.toLocaleString()}
                </div>
                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider font-mono mt-2 border-t border-white/5 pt-2">
                  {team.transferCount} transfers • £{team.totalSpent.toLocaleString()} spent
                  {team.totalSales > 0 && ` • £${team.totalSales.toLocaleString()} sales`}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && !result && (
        <div className="rounded-2xl bg-white/[0.01] border border-white/5 p-12 text-center backdrop-blur-xl shadow-md">
          <div className="text-xs text-gray-500 font-bold uppercase tracking-wider font-mono">Click "Run Audit" to check team balances</div>
        </div>
      )}
    </div>
  )
}
