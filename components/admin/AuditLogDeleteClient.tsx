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
      <div className="rounded-xl bg-white/5 border border-white/10 p-6">
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-red-400 font-bold mb-2">⚠️ Danger Zone</p>
          <p className="text-[#D4CCBB] text-sm">
            This tool allows you to delete individual financial ledger entries. Use with caution as deleted entries cannot be recovered.
          </p>
        </div>

        {message && (
          <div className={`mb-4 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
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
            <p className="text-xs text-[#7A7367] mt-1">Leave empty to view ledger entries for all teams</p>
          </div>
        </div>
      </div>

      {/* Financial Ledger Display */}
      {loadingLogs ? (
        <div className="rounded-xl bg-white/5 border border-white/10 p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#E8A800]"></div>
          <p className="text-[#D4CCBB] mt-4">Loading financial ledger...</p>
        </div>
      ) : financialLedger.length > 0 ? (
        <div className="rounded-xl bg-white/5 border border-white/10 p-6">
          <h2 className="text-xl font-bold text-white mb-4">Financial Ledger Entries ({financialLedger.length})</h2>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {financialLedger.map((log) => (
              <div key={log.id} className="bg-[#1a1a1a] border border-white/10 rounded-lg p-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs font-mono text-[#7A7367] bg-white/5 px-2 py-1 rounded">
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                    <span className="text-xs font-bold text-green-400 bg-green-400/10 px-2 py-1 rounded">
                      {log.transactionType}
                    </span>
                    <span className="text-xs text-[#7A7367]">{log.seasonTeam.team.name}</span>
                  </div>
                  <div className="text-sm text-[#D4CCBB] flex items-center gap-4">
                    <span className={log.amount >= 0 ? 'text-green-400' : 'text-red-400'}>
                      {log.amount >= 0 ? '+' : ''}£{log.amount.toLocaleString()}
                    </span>
                    <span className="text-[#7A7367]">
                      £{log.previousBalance.toLocaleString()} → £{log.newBalance.toLocaleString()}
                    </span>
                  </div>
                  {(log.description || log.player_name) && (
                    <div className="text-xs text-[#7A7367] mt-1">
                      {log.player_name && <span className="font-medium">{log.player_name}</span>}
                      {log.description && <span> - {log.description}</span>}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleDeleteSingle(log.id)}
                  disabled={deletingLogId === log.id}
                  className="flex-shrink-0 px-3 py-1.5 bg-red-600/20 text-red-400 text-xs font-bold rounded hover:bg-red-600/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {deletingLogId === log.id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-xl bg-white/5 border border-white/10 p-8 text-center">
          <p className="text-[#7A7367]">No financial ledger entries found for the selected team</p>
        </div>
      )}
    </div>
  );
}
