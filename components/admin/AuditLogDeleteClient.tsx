'use client';

import { useState, useEffect } from 'react';
import SearchableSelect from '@/components/ui/SearchableSelect';

interface Team {
  id: string;
  name: string;
}

interface FinancialLedger {
  id: string;
  transactionType: string;
  amount: number;
  previousBalance: number;
  newBalance: number;
  description: string | null;
  player_name: string | null;
  createdAt: string;
  seasonTeam: {
    team: {
      name: string;
    };
  };
}

export default function AuditLogDeleteClient({ 
  seasonId, 
  teams 
}: { 
  seasonId: string;
  teams: Team[];
}) {
  const [selectedTeam, setSelectedTeam] = useState('');
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [financialLedger, setFinancialLedger] = useState<FinancialLedger[]>([]);
  const [deletingLogId, setDeletingLogId] = useState<string | null>(null);

  // Fetch logs when filters change
  useEffect(() => {
    fetchLogs();
  }, [selectedTeam]);

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const params = new URLSearchParams({
        seasonId,
        logType: 'financial_ledger'
      });
      if (selectedTeam) {
        params.append('teamId', selectedTeam);
      }

      const response = await fetch(`/api/admin/audit-logs/list?${params}`);
      const data = await response.json();

      if (response.ok) {
        setFinancialLedger(data.financialLedger || []);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleDeleteSingle = async (logId: string) => {
    if (!confirm('⚠️ Are you sure you want to delete this ledger entry? This action cannot be undone.')) {
      return;
    }

    setDeletingLogId(logId);
    try {
      const response = await fetch('/api/admin/audit-logs/delete-single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logId, logType: 'financial_ledger' })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete ledger entry');
      }

      setMessage({ type: 'success', text: data.message });
      
      // Remove from local state
      setFinancialLedger(prev => prev.filter(log => log.id !== logId));
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setDeletingLogId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white/[0.01] border border-white/5 p-6 backdrop-blur-xl shadow-md">
        <div className="mb-6 p-5 bg-red-500/[0.02] border border-red-500/20 rounded-2xl backdrop-blur-xl shadow-md">
          <p className="text-red-400 font-black text-xs uppercase tracking-widest font-mono mb-2">⚠️ Danger Zone</p>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-wider font-mono leading-relaxed">
            This tool allows you to delete individual financial ledger entries. Use with caution as deleted entries cannot be recovered.
          </p>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-xl font-mono text-xs uppercase tracking-wider ${message.type === 'success' ? 'bg-green-500/10 border border-green-500/30 text-green-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'}`}>
            {message.text}
          </div>
        )}

        <div className="space-y-4">
          {/* Team Selection */}
          <div>
            <SearchableSelect
              label="Filter by Team (Optional)"
              value={selectedTeam}
              options={[
                { value: '', label: 'All Teams' },
                ...teams.map(team => ({ value: team.id, label: team.name }))
              ]}
              onChange={setSelectedTeam}
              enableSearch={true}
            />
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider font-mono mt-2">Leave empty to view ledger entries for all teams</p>
          </div>
        </div>
      </div>

      {/* Financial Ledger Display */}
      {loadingLogs ? (
        <div className="rounded-2xl bg-white/[0.01] border border-white/5 p-8 text-center backdrop-blur-xl shadow-md">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#E8A800]"></div>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-wider font-mono mt-4">Loading financial ledger...</p>
        </div>
      ) : financialLedger.length > 0 ? (
        <div className="rounded-2xl bg-white/[0.01] border border-white/5 p-6 backdrop-blur-xl shadow-md">
          <h2 className="text-base sm:text-lg font-black text-white mb-4 uppercase tracking-wider font-mono">Financial Ledger Entries ({financialLedger.length})</h2>
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {financialLedger.map((log) => (
              <div key={log.id} className="bg-white/[0.01] border border-white/5 rounded-xl p-4 flex items-center justify-between gap-4 hover:border-white/10 transition-all shadow-sm">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5 mb-2.5">
                    <span className="text-[10px] font-bold text-gray-500 bg-white/5 px-2 py-0.5 rounded-lg font-mono">
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                    <span className="text-[10px] font-extrabold text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-lg uppercase tracking-wider font-mono">
                      {log.transactionType}
                    </span>
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider font-mono">{log.seasonTeam.team.name}</span>
                  </div>
                  <div className="text-sm font-mono flex flex-wrap items-center gap-4">
                    <span className={`font-bold ${log.amount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {log.amount >= 0 ? '+' : ''}£{log.amount.toLocaleString()}
                    </span>
                    <span className="text-gray-500 font-bold">
                      £{log.previousBalance.toLocaleString()} → £{log.newBalance.toLocaleString()}
                    </span>
                  </div>
                  {(log.description || log.player_name) && (
                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider font-mono mt-1.5 leading-relaxed">
                      {log.player_name && <span className="text-white font-extrabold">{log.player_name}</span>}
                      {log.description && <span> • {log.description}</span>}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleDeleteSingle(log.id)}
                  disabled={deletingLogId === log.id}
                  className="flex-shrink-0 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 text-xs font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider font-mono cursor-pointer"
                >
                  {deletingLogId === log.id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl bg-white/[0.01] border border-white/5 p-8 text-center backdrop-blur-xl shadow-md">
          <p className="text-xs text-gray-500 font-bold uppercase tracking-wider font-mono">No financial ledger entries found for the selected team</p>
        </div>
      )}
    </div>
  );
}
