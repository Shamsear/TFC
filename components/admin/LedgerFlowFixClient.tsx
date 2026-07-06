'use client';

import { useState } from 'react';

interface LedgerUpdate {
  id: string;
  description: string;
  amount: number;
  current: {
    previousBalance: number;
    newBalance: number;
  };
  expected: {
    previousBalance: number;
    newBalance: number;
  };
}

interface TeamResult {
  teamName: string;
  status: 'correct' | 'needs_fix' | 'no_entries';
  entriesChecked: number;
  entriesFixed: number;
  finalBalance: number;
  currentBudget: number;
  updates?: LedgerUpdate[];
}

interface FixResponse {
  results: TeamResult[];
  summary: {
    mode: string;
    teamsProcessed: number;
    teamsNeedingFix: number;
    teamsFixed: number;
  };
}

export default function LedgerFlowFixClient({ seasonId }: { seasonId: string }) {
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<FixResponse | null>(null);
  const [applyData, setApplyData] = useState<FixResponse | null>(null);
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());

  const handlePreview = async () => {
    setLoading(true);
    setApplyData(null);
    try {
      const response = await fetch('/api/admin/ledger/fix-flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seasonId, mode: 'preview' })
      });

      if (!response.ok) throw new Error('Failed to preview');

      const data = await response.json();
      setPreviewData(data);
    } catch (error) {
      console.error('Preview error:', error);
      alert('Failed to preview ledger fixes');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!confirm('Are you sure you want to apply these fixes? This will update all ledger entries and team balances.')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/admin/ledger/fix-flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seasonId, mode: 'apply' })
      });

      if (!response.ok) throw new Error('Failed to apply fixes');

      const data = await response.json();
      setApplyData(data);
      setPreviewData(null);
    } catch (error) {
      console.error('Apply error:', error);
      alert('Failed to apply ledger fixes');
    } finally {
      setLoading(false);
    }
  };

  const toggleTeam = (teamName: string) => {
    const newExpanded = new Set(expandedTeams);
    if (newExpanded.has(teamName)) {
      newExpanded.delete(teamName);
    } else {
      newExpanded.add(teamName);
    }
    setExpandedTeams(newExpanded);
  };

  const formatCurrency = (amount: number) => {
    return `£${amount.toLocaleString()}`;
  };

  const data = applyData || previewData;

  return (
    <div className="space-y-6">
      <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-6 backdrop-blur-xl shadow-md">
        <h2 className="text-xl sm:text-2xl font-black text-white mb-4 uppercase tracking-wider font-mono">Financial Ledger Flow Fix</h2>
        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider font-mono mb-6 leading-relaxed">
          This tool recalculates all financial ledger entries to ensure the previousBalance and newBalance 
          flow correctly from one entry to the next. It will also update team current budgets to match 
          the final ledger balance.
        </p>

        <div className="flex gap-4">
          <button
            onClick={handlePreview}
            disabled={loading}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#E8A800] to-[#FFB347] hover:from-[#FFC93A] hover:to-[#FFB347] text-[#0a0a0a] font-bold transition-all disabled:opacity-50 text-xs uppercase tracking-wider cursor-pointer shadow-md"
          >
            {loading && !data ? 'Loading...' : 'Preview Changes'}
          </button>

          {previewData && previewData.summary.teamsNeedingFix > 0 && (
            <button
              onClick={handleApply}
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#10B981] to-[#34D399] hover:from-[#059669] hover:to-[#34D399] text-[#0a0a0a] font-bold transition-all disabled:opacity-50 text-xs uppercase tracking-wider cursor-pointer shadow-md"
            >
              {loading ? 'Applying...' : 'Apply Fixes'}
            </button>
          )}
        </div>
      </div>

      {data && (
        <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-6 backdrop-blur-xl shadow-md">
          <div className="mb-6">
            <h3 className="text-lg font-black text-white mb-4 uppercase tracking-wider font-mono">
              {data.summary.mode === 'apply' ? '✅ Fixes Applied' : '📋 Preview Results'}
            </h3>
            <div className="grid grid-cols-3 gap-4 text-xs">
              <div className="bg-white/[0.01] border border-white/5 rounded-xl p-3 shadow-md">
                <div className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest font-mono mb-1">Teams Processed</div>
                <div className="text-2xl font-black text-white font-mono">{data.summary.teamsProcessed}</div>
              </div>
              <div className="bg-white/[0.01] border border-white/5 rounded-xl p-3 shadow-md">
                <div className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest font-mono mb-1">Teams Needing Fix</div>
                <div className="text-2xl font-black text-orange-400 font-mono">{data.summary.teamsNeedingFix}</div>
              </div>
              <div className="bg-white/[0.01] border border-white/5 rounded-xl p-3 shadow-md">
                <div className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest font-mono mb-1">Teams Fixed</div>
                <div className="text-2xl font-black text-green-400 font-mono">{data.summary.teamsFixed}</div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {data.results.map((result) => (
              <div
                key={result.teamName}
                className={`rounded-xl p-4 border transition-all ${
                  result.status === 'correct'
                    ? 'bg-green-500/[0.02] border-green-500/10'
                    : result.status === 'needs_fix'
                    ? 'bg-orange-500/[0.02] border-orange-500/10'
                    : 'bg-white/[0.01] border-white/5'
                }`}
              >
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => result.updates && toggleTeam(result.teamName)}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-base sm:text-lg font-black text-white uppercase tracking-tight">{result.teamName}</span>
                    {result.status === 'correct' && (
                      <span className="text-[10px] bg-green-500/20 border border-green-500/30 text-green-400 px-2 py-0.5 rounded-lg font-bold uppercase tracking-wider">✓ Correct</span>
                    )}
                    {result.status === 'needs_fix' && (
                      <span className="text-[10px] bg-orange-500/20 border border-orange-500/30 text-orange-400 px-2 py-0.5 rounded-lg font-bold uppercase tracking-wider">
                        {result.entriesFixed} entries need fixing
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs font-mono">
                    <div className="text-gray-500 font-bold uppercase tracking-wider">
                      Entries: <span className="text-white font-extrabold">{result.entriesChecked}</span>
                    </div>
                    <div className="text-gray-500 font-bold uppercase tracking-wider">
                      Final Balance: <span className="text-white font-extrabold">{formatCurrency(result.finalBalance)}</span>
                    </div>
                    {result.finalBalance !== result.currentBudget && (
                      <div className="text-orange-400 font-bold uppercase tracking-wider">
                        Current: {formatCurrency(result.currentBudget)}
                      </div>
                    )}
                    {result.updates && (
                      <span className="text-gray-500">
                        {expandedTeams.has(result.teamName) ? '▼' : '▶'}
                      </span>
                    )}
                  </div>
                </div>

                {result.updates && expandedTeams.has(result.teamName) && (
                  <div className="mt-4 space-y-3 border-t border-white/5 pt-3">
                    {result.updates.map((update, idx) => (
                      <div key={update.id} className="bg-white/[0.01] border border-white/5 rounded-xl p-3 text-xs">
                        <div className="font-bold text-white mb-2 uppercase tracking-tight">
                          {idx + 1}. {update.description}
                        </div>
                        <div className="grid grid-cols-3 gap-4 font-mono text-[10px] uppercase tracking-wider">
                          <div>
                            <div className="text-gray-500 font-bold mb-0.5">Amount</div>
                            <div className="text-white font-bold">{formatCurrency(update.amount)}</div>
                          </div>
                          <div>
                            <div className="text-gray-500 font-bold mb-0.5">Current Values</div>
                            <div className="text-red-400 font-bold">
                              Prev: {formatCurrency(update.current.previousBalance)}
                            </div>
                            <div className="text-red-400 font-bold">
                              New: {formatCurrency(update.current.newBalance)}
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-500 font-bold mb-0.5">Expected Values</div>
                            <div className="text-green-400 font-bold">
                              Prev: {formatCurrency(update.expected.previousBalance)}
                            </div>
                            <div className="text-green-400 font-bold">
                              New: {formatCurrency(update.expected.newBalance)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
