'use client';

import { useState, useEffect } from 'react';

interface DuplicatePlayer {
  playerId: string;
  playerName: string;
  transferCount: number;
}

interface RoundAudit {
  id: string;
  roundNumber: number;
  position?: string | null;
  positionGroup?: string | null;
  status: string;
  roundType: string;
  totalTransfers: number;
  uniquePlayersCount: number;
  duplicateTransfersCount: number;
  totalLedgerEntries: number;
  duplicateLedgerCount: number;
  duplicatePlayers: DuplicatePlayer[];
  hasIssue: boolean;
  endTime?: string | null;
  createdAt: string;
}

interface AuditResponse {
  success: boolean;
  seasonId: string;
  totalRounds: number;
  roundsWithIssuesCount: number;
  roundAudits: RoundAudit[];
  error?: string;
}

interface FinalizationFixClientProps {
  seasonId: string;
  isSuperAdmin: boolean;
}

export default function FinalizationFixClient({ seasonId, isSuperAdmin }: FinalizationFixClientProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AuditResponse | null>(null);
  const [fixingRoundId, setFixingRoundId] = useState<string | null>(null);
  const [fixingAll, setFixingAll] = useState(false);
  const [filter, setFilter] = useState<'all' | 'issues'>('issues');
  const [search, setSearch] = useState('');
  const [fixMessage, setFixMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchAudit = async () => {
    setLoading(true);
    setFixMessage(null);
    try {
      const res = await fetch(`/api/admin/rounds/audit-finalization?seasonId=${seasonId}`);
      const data = await res.json();
      if (data.success) {
        setResult(data);
      } else {
        setFixMessage({ type: 'error', text: data.error || 'Failed to fetch round audit.' });
      }
    } catch (err) {
      setFixMessage({ type: 'error', text: 'Network error while fetching audit.' });
    } finally {
      setLoading(false);
    }
  };

  const handleFixRound = async (roundId: string) => {
    if (!confirm(`Are you sure you want to fix double finalisation for ${roundId}? This will remove duplicate transfers and duplicate ledger entries, and sync team budgets.`)) {
      return;
    }

    setFixingRoundId(roundId);
    setFixMessage(null);

    try {
      const res = await fetch('/api/admin/rounds/fix-finalization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roundId, seasonId })
      });
      const data = await res.json();

      if (data.success) {
        setFixMessage({ type: 'success', text: data.message });
        await fetchAudit();
      } else {
        setFixMessage({ type: 'error', text: data.error || 'Failed to fix round.' });
      }
    } catch (err) {
      setFixMessage({ type: 'error', text: 'Failed to execute round cleanup.' });
    } finally {
      setFixingRoundId(null);
    }
  };

  const handleFixAll = async () => {
    if (!result || result.roundsWithIssuesCount === 0) return;

    if (!confirm(`Are you sure you want to fix all ${result.roundsWithIssuesCount} round(s) with double finalisation issues?`)) {
      return;
    }

    setFixingAll(true);
    setFixMessage(null);

    const roundsToFix = result.roundAudits.filter(r => r.hasIssue);
    let successCount = 0;
    let failCount = 0;

    for (const r of roundsToFix) {
      try {
        const res = await fetch('/api/admin/rounds/fix-finalization', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roundId: r.id, seasonId })
        });
        const data = await res.json();
        if (data.success) successCount++;
        else failCount++;
      } catch (err) {
        failCount++;
      }
    }

    setFixingAll(false);
    setFixMessage({
      type: successCount > 0 ? 'success' : 'error',
      text: `Fixed ${successCount} round(s). ${failCount > 0 ? `${failCount} failed.` : ''}`
    });

    await fetchAudit();
  };

  useEffect(() => {
    fetchAudit();
  }, [seasonId]);

  const filteredRounds = (result?.roundAudits || []).filter(round => {
    if (filter === 'issues' && !round.hasIssue) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        round.id.toLowerCase().includes(q) ||
        round.roundNumber.toString().includes(q) ||
        (round.position || '').toLowerCase().includes(q) ||
        (round.positionGroup || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalDuplicates = (result?.roundAudits || []).reduce(
    (sum, r) => sum + r.duplicateTransfersCount + r.duplicateLedgerCount,
    0
  );

  return (
    <div className="space-[#1E293B] font-sans">
      {/* Top Banner / Actions */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/10 p-6 backdrop-blur-xl mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white uppercase tracking-wider mb-1 flex items-center gap-2">
            <span>🛡️ Finalisation Audit & Fix</span>
          </h2>
          <p className="text-xs text-gray-400 font-medium">
            Scans all auction rounds in <span className="text-[#E8A800] font-bold">{seasonId}</span> for duplicate executions, cleans up extra transfers & ledger entries, and corrects team budgets.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchAudit}
            disabled={loading}
            className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-wider border border-white/10 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Auditing...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Re-Audit Season
              </>
            )}
          </button>
          {result && result.roundsWithIssuesCount > 0 && (
            <button
              onClick={handleFixAll}
              disabled={fixingAll || loading}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-red-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {fixingAll ? 'Fixing All...' : `Fix All (${result.roundsWithIssuesCount})`}
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {fixMessage && (
        <div
          className={`p-4 rounded-xl mb-6 text-sm font-bold flex items-center justify-between ${
            fixMessage.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
              : 'bg-red-500/10 border border-red-500/20 text-red-400'
          }`}
        >
          <span>{fixMessage.text}</span>
          <button onClick={() => setFixMessage(null)} className="text-gray-400 hover:text-white font-black">
            ✕
          </button>
        </div>
      )}

      {/* Stats Overview */}
      {result && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-xl">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-1">Total Rounds</span>
            <span className="text-3xl font-black text-white">{result.totalRounds}</span>
          </div>

          <div className={`p-5 rounded-2xl border backdrop-blur-xl ${
            result.roundsWithIssuesCount > 0
              ? 'bg-red-500/10 border-red-500/20 text-red-400'
              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
          }`}>
            <span className="text-xs font-bold uppercase tracking-wider block mb-1">Rounds with Issues</span>
            <span className="text-3xl font-black">{result.roundsWithIssuesCount}</span>
          </div>

          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-xl">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-1">Total Duplicates</span>
            <span className="text-3xl font-black text-amber-400">{totalDuplicates}</span>
          </div>

          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-xl">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-1">Audit Status</span>
            <span className={`text-lg font-black uppercase tracking-wide block mt-1 ${
              result.roundsWithIssuesCount === 0 ? 'text-emerald-400' : 'text-red-400'
            }`}>
              {result.roundsWithIssuesCount === 0 ? '✅ Clean' : '⚠️ Action Needed'}
            </span>
          </div>
        </div>
      )}

      {/* Controls & Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/10 w-fit">
          <button
            onClick={() => setFilter('issues')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
              filter === 'issues'
                ? 'bg-[#E8A800] text-black shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Issues Only ({result?.roundsWithIssuesCount || 0})
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
              filter === 'all'
                ? 'bg-[#E8A800] text-black shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            All Rounds ({result?.totalRounds || 0})
          </button>
        </div>

        <input
          type="text"
          placeholder="Search by Round ID, number, position..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-xs font-medium focus:outline-none focus:border-[#E8A800] transition-colors w-full sm:w-64"
        />
      </div>

      {/* Rounds List */}
      {loading && !result ? (
        <div className="py-20 text-center text-gray-400 font-mono text-sm">
          <svg className="animate-spin h-8 w-8 text-[#E8A800] mx-auto mb-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          Scanning season rounds for double finalisation...
        </div>
      ) : filteredRounds.length === 0 ? (
        <div className="rounded-2xl bg-white/[0.01] border border-white/5 p-12 text-center">
          <p className="text-gray-400 font-bold text-sm uppercase tracking-wider mb-2">
            {filter === 'issues' ? '🎉 No rounds with double finalisation issues found!' : 'No matching rounds.'}
          </p>
          <p className="text-xs text-gray-600">
            {filter === 'issues' ? 'All rounds in this season are clean and verified.' : 'Try adjusting your search query.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRounds.map((round) => (
            <div
              key={round.id}
              className={`rounded-2xl border p-5 backdrop-blur-xl transition-all ${
                round.hasIssue
                  ? 'bg-red-500/[0.02] border-red-500/30'
                  : 'bg-white/[0.01] border-white/5'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <span className="text-xl font-black text-white uppercase tracking-wide">
                      Round {round.roundNumber} <span className="text-gray-500 text-sm font-mono font-normal">({round.id})</span>
                    </span>

                    <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                      round.status === 'completed'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                    }`}>
                      {round.status}
                    </span>

                    {round.position && (
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {round.position} {round.positionGroup ? `(${round.positionGroup})` : ''}
                      </span>
                    )}

                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      {round.roundType}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-gray-400 flex-wrap font-mono">
                    <span>Transfers: <strong className="text-white">{round.totalTransfers}</strong></span>
                    <span>Unique Players: <strong className="text-white">{round.uniquePlayersCount}</strong></span>
                    <span>Ledger Entries: <strong className="text-white">{round.totalLedgerEntries}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {round.hasIssue ? (
                    <button
                      onClick={() => handleFixRound(round.id)}
                      disabled={fixingRoundId === round.id}
                      className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-red-600/20 transition-all disabled:opacity-50"
                    >
                      {fixingRoundId === round.id ? 'Fixing...' : 'Fix Round Finalisation'}
                    </button>
                  ) : (
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                      <span>✓ Clean</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Duplicate Details Breakdown */}
              {round.hasIssue && (
                <div className="mt-4 pt-4 border-t border-red-500/20 text-xs">
                  <p className="font-bold text-red-400 mb-2 uppercase tracking-wider">
                    ⚠️ Issues Detected:
                  </p>
                  <ul className="space-y-1 text-gray-300 font-mono">
                    {round.duplicateTransfersCount > 0 && (
                      <li>• <strong className="text-red-300">{round.duplicateTransfersCount}</strong> duplicate transfer record(s) created in secondary run.</li>
                    )}
                    {round.duplicateLedgerCount > 0 && (
                      <li>• <strong className="text-red-300">{round.duplicateLedgerCount}</strong> duplicate financial ledger charge(s) created.</li>
                    )}
                  </ul>

                  {round.duplicatePlayers.length > 0 && (
                    <div className="mt-3">
                      <p className="font-bold text-gray-400 text-[11px] uppercase tracking-wider mb-1">Affected Players:</p>
                      <div className="flex flex-wrap gap-2">
                        {round.duplicatePlayers.map(p => (
                          <span key={p.playerId} className="px-2 py-1 rounded bg-red-500/10 border border-red-500/20 text-red-300 text-[11px]">
                            {p.playerName} ({p.transferCount} transfers)
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
