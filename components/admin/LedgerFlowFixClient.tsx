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
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-4">Financial Ledger Flow Fix</h2>
        <p className="text-[#D4CCBB] mb-4">
          This tool recalculates all financial ledger entries to ensure the previousBalance and newBalance 
          flow correctly from one entry to the next. It will also update team current budgets to match 
          the final ledger balance.
        </p>

        <div className="flex gap-4">
          <button
            onClick={handlePreview}
            disabled={loading}
            className="px-6 py-2 bg-[#E8A800] text-black font-bold rounded-lg hover:bg-[#E8A800]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading && !data ? 'Loading...' : 'Preview Changes'}
          </button>

          {previewData && previewData.summary.teamsNeedingFix > 0 && (
            <button
              onClick={handleApply}
              disabled={loading}
              className="px-6 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'Applying...' : 'Apply Fixes'}
            </button>
          )}
        </div>
      </div>

      {data && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-white mb-3">
              {data.summary.mode === 'apply' ? '✅ Fixes Applied' : '📋 Preview Results'}
            </h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="bg-[#1a1a1a] border border-white/10 rounded-lg p-3">
                <div className="text-[#7A7367]">Teams Processed</div>
                <div className="text-2xl font-bold text-white">{data.summary.teamsProcessed}</div>
              </div>
              <div className="bg-[#1a1a1a] border border-white/10 rounded-lg p-3">
                <div className="text-[#7A7367]">Teams Needing Fix</div>
                <div className="text-2xl font-bold text-orange-400">{data.summary.teamsNeedingFix}</div>
              </div>
              <div className="bg-[#1a1a1a] border border-white/10 rounded-lg p-3">
                <div className="text-[#7A7367]">Teams Fixed</div>
                <div className="text-2xl font-bold text-green-400">{data.summary.teamsFixed}</div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {data.results.map((result) => (
              <div
                key={result.teamName}
                className={`rounded-lg p-4 border ${
                  result.status === 'correct'
                    ? 'bg-green-500/10 border-green-500/30'
                    : result.status === 'needs_fix'
                    ? 'bg-orange-500/10 border-orange-500/30'
                    : 'bg-white/5 border-white/10'
                }`}
              >
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => result.updates && toggleTeam(result.teamName)}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-white">{result.teamName}</span>
                    {result.status === 'correct' && (
                      <span className="text-xs bg-green-600 text-white px-2 py-1 rounded">✓ Correct</span>
                    )}
                    {result.status === 'needs_fix' && (
                      <span className="text-xs bg-orange-600 text-white px-2 py-1 rounded">
                        {result.entriesFixed} entries need fixing
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-[#7A7367]">
                      Entries: <span className="text-white">{result.entriesChecked}</span>
                    </div>
                    <div className="text-[#7A7367]">
                      Final Balance: <span className="text-white">{formatCurrency(result.finalBalance)}</span>
                    </div>
                    {result.finalBalance !== result.currentBudget && (
                      <div className="text-orange-400">
                        Current: {formatCurrency(result.currentBudget)}
                      </div>
                    )}
                    {result.updates && (
                      <span className="text-[#7A7367]">
                        {expandedTeams.has(result.teamName) ? '▼' : '▶'}
                      </span>
                    )}
                  </div>
                </div>

                {result.updates && expandedTeams.has(result.teamName) && (
                  <div className="mt-4 space-y-2">
                    {result.updates.map((update, idx) => (
                      <div key={update.id} className="bg-[#1a1a1a] border border-white/10 rounded-lg p-3 text-sm">
                        <div className="font-medium text-white mb-2">
                          {idx + 1}. {update.description}
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-xs">
                          <div>
                            <div className="text-[#7A7367]">Amount</div>
                            <div className="text-white">{formatCurrency(update.amount)}</div>
                          </div>
                          <div>
                            <div className="text-[#7A7367]">Current Values</div>
                            <div className="text-red-400">
                              Prev: {formatCurrency(update.current.previousBalance)}
                            </div>
                            <div className="text-red-400">
                              New: {formatCurrency(update.current.newBalance)}
                            </div>
                          </div>
                          <div>
                            <div className="text-[#7A7367]">Expected Values</div>
                            <div className="text-green-400">
                              Prev: {formatCurrency(update.expected.previousBalance)}
                            </div>
                            <div className="text-green-400">
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
