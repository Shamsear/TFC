'use client';

import { useState } from 'react';

interface Team {
  id: string;
  name: string;
}

interface Player {
  id: string;
  name: string;
  soldPrice: number;
}

interface AllBid {
  playerId: string;
  playerName: string;
  bidAmount: number;
  roundId: string;
  roundNumber: number;
  roundName: string;
  isSold: boolean;
  soldToOther: boolean;
  ownedByTeam?: string;
  soldPrice?: number;
  acquiredInRound?: string;
}

export default function PlayerReplacementClient({ 
  seasonId, 
  teams 
}: { 
  seasonId: string;
  teams: Team[];
}) {
  const [selectedTeam, setSelectedTeam] = useState('');
  const [currentPlayers, setCurrentPlayers] = useState<Player[]>([]);
  const [allBids, setAllBids] = useState<AllBid[]>([]);
  const [selectedOldPlayer, setSelectedOldPlayer] = useState('');
  const [selectedNewBid, setSelectedNewBid] = useState<AllBid | null>(null);
  const [newAmount, setNewAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const loadTeamData = async (teamId: string) => {
    try {
      // Load current squad
      const playersResponse = await fetch(`/api/admin/teams/players?teamId=${teamId}&seasonId=${seasonId}`);
      const playersData = await playersResponse.json();
      setCurrentPlayers(playersData.players || []);

      // Load all bids
      const bidsResponse = await fetch(`/api/admin/teams/all-bids?teamId=${teamId}&seasonId=${seasonId}`);
      const bidsData = await bidsResponse.json();
      setAllBids(bidsData.bids || []);
    } catch (error) {
      console.error('Error loading team data:', error);
    }
  };

  const handleTeamChange = (teamId: string) => {
    setSelectedTeam(teamId);
    setSelectedOldPlayer('');
    setSelectedNewBid(null);
    setNewAmount('');
    setSearchTerm('');
    if (teamId) {
      loadTeamData(teamId);
    } else {
      setCurrentPlayers([]);
      setAllBids([]);
    }
  };

  const handleOldPlayerChange = (playerId: string) => {
    setSelectedOldPlayer(playerId);
    const player = currentPlayers.find(p => p.id === playerId);
    if (player) {
      setNewAmount((player.soldPrice || 0).toString());
    }
    setSelectedNewBid(null);
  };

  const handleReplace = async () => {
    if (!selectedTeam || !selectedOldPlayer || !selectedNewBid || !newAmount) {
      setMessage({ type: 'error', text: 'Please fill all fields' });
      return;
    }

    const team = teams.find(t => t.id === selectedTeam);
    const oldPlayer = currentPlayers.find(p => p.id === selectedOldPlayer);

    if (!confirm(
      `Replace ${oldPlayer?.name} (£${(oldPlayer?.soldPrice || 0).toLocaleString()}) with ${selectedNewBid.playerName} (£${parseInt(newAmount).toLocaleString()}) for ${team?.name}?\n\nThis will update transfer history, financial ledger, and recalculate all subsequent entries.`
    )) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/players/replace-allocation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seasonId,
          teamId: selectedTeam,
          oldPlayerId: selectedOldPlayer,
          newPlayerId: selectedNewBid.playerId,
          newAmount: parseInt(newAmount)
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to replace player');
      }

      setMessage({ 
        type: 'success', 
        text: `Successfully replaced ${data.oldPlayer} with ${data.newPlayer}. ${data.entriesRecalculated} ledger entries recalculated.` 
      });

      // Reset form
      setSelectedOldPlayer('');
      setSelectedNewBid(null);
      setNewAmount('');
      setSearchTerm('');

      // Reload team data
      loadTeamData(selectedTeam);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  // Filter bids based on search
  const filteredBids = allBids.filter(bid => 
    bid.playerName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Separate sold and unsold bids
  const soldBids = filteredBids.filter(b => b.isSold);
  const unsoldAvailable = filteredBids.filter(b => !b.isSold && !b.soldToOther);
  const soldToOthers = filteredBids.filter(b => b.soldToOther);

  return (
    <div className="space-y-6">
      <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-6">
        <p className="text-[#D4CCBB] mb-6">
          Replace a player that was incorrectly allocated with another player from the team's complete bid history. 
          Select a team to see all their bids across all rounds, then choose which player to replace.
        </p>

        {message && (
          <div className={`mb-4 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
            {message.text}
          </div>
        )}

        <div className="space-y-4">
          {/* Team Selection */}
          <div>
            <label className="block text-sm font-medium text-[#D4CCBB] mb-2">1. Select Team</label>
            <select
              value={selectedTeam}
              onChange={(e) => handleTeamChange(e.target.value)}
              className="w-full px-4 py-2 bg-[#1a1a1a] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#E8A800] transition-colors appearance-none cursor-pointer"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23D4CCBB' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                backgroundPosition: 'right 0.5rem center',
                backgroundRepeat: 'no-repeat',
                backgroundSize: '1.5em 1.5em',
                paddingRight: '2.5rem'
              }}
            >
              <option value="" className="bg-[#1a1a1a]">-- Select Team --</option>
              {teams.map(team => (
                <option key={team.id} value={team.id} className="bg-[#1a1a1a]">{team.name}</option>
              ))}
            </select>
          </div>

          {/* Old Player Selection */}
          {selectedTeam && currentPlayers.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-[#D4CCBB] mb-2">
                2. Select Player to Replace ({currentPlayers.length} players in squad)
              </label>
              <select
                value={selectedOldPlayer}
                onChange={(e) => handleOldPlayerChange(e.target.value)}
                className="w-full px-4 py-2 bg-[#1a1a1a] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#E8A800] transition-colors appearance-none cursor-pointer"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23D4CCBB' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                  backgroundPosition: 'right 0.5rem center',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '1.5em 1.5em',
                  paddingRight: '2.5rem'
                }}
              >
                <option value="" className="bg-[#1a1a1a]">-- Select Player to Replace --</option>
                {currentPlayers.map(player => (
                  <option key={player.id} value={player.id} className="bg-[#1a1a1a]">
                    {player.name} - £{(player.soldPrice || 0).toLocaleString()}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* All Bids Display */}
          {selectedOldPlayer && allBids.length > 0 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#D4CCBB] mb-2">
                  3. Select Replacement Player from Team's Bid History ({allBids.length} total bids)
                </label>
                
                {/* Search */}
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search players..."
                  className="w-full px-4 py-2 mb-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-[#7A7367] focus:outline-none focus:border-[#E8A800] transition-colors"
                />

                {/* Sold to This Team */}
                {soldBids.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-bold text-green-400 mb-2 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-400"></span>
                      Already Owned by This Team ({soldBids.length})
                    </h4>
                    <div className="max-h-60 overflow-y-auto bg-white/5 rounded-lg border border-white/10">
                      {soldBids.map(bid => (
                        <div
                          key={`${bid.playerId}-${bid.roundId}`}
                          className="p-3 border-b border-white/10 last:border-b-0 opacity-60"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="font-medium text-white italic">{bid.playerName}</div>
                              <div className="text-xs text-green-400 mt-1">
                                ✓ Owned • Bid: £{bid.bidAmount.toLocaleString()} • Sold: £{(bid.soldPrice || 0).toLocaleString()}
                              </div>
                              <div className="text-xs text-white/60 mt-1">{bid.roundName}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Available (Unsold) */}
                {unsoldAvailable.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-bold text-blue-400 mb-2 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                      Available for Replacement ({unsoldAvailable.length})
                    </h4>
                    <div className="max-h-60 overflow-y-auto bg-white/5 rounded-lg border border-white/10">
                      {unsoldAvailable.map(bid => (
                        <div
                          key={`${bid.playerId}-${bid.roundId}`}
                          onClick={() => {
                            setSelectedNewBid(bid);
                            setNewAmount(bid.bidAmount.toString());
                          }}
                          className={`p-3 cursor-pointer hover:bg-white/10 border-b border-white/10 last:border-b-0 transition-colors ${
                            selectedNewBid?.playerId === bid.playerId && selectedNewBid?.roundId === bid.roundId
                              ? 'bg-[#E8A800]/10 border-l-4 border-l-[#E8A800]'
                              : ''
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="font-medium text-white">{bid.playerName}</div>
                              <div className="text-xs text-blue-400 mt-1">
                                ✓ Available • Bid: £{bid.bidAmount.toLocaleString()}
                              </div>
                              <div className="text-xs text-white/60 mt-1">{bid.roundName}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sold to Other Teams */}
                {soldToOthers.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-red-400 mb-2 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-400"></span>
                      Sold to Other Teams ({soldToOthers.length})
                    </h4>
                    <div className="max-h-40 overflow-y-auto bg-white/5 rounded-lg border border-white/10 opacity-60">
                      {soldToOthers.map(bid => (
                        <div
                          key={`${bid.playerId}-${bid.roundId}`}
                          className="p-3 border-b border-white/10 last:border-b-0"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="font-medium text-white italic">{bid.playerName}</div>
                              <div className="text-xs text-red-400 mt-1">
                                ✗ Owned by {bid.ownedByTeam} • Bid: £{bid.bidAmount.toLocaleString()}
                              </div>
                              <div className="text-xs text-white/60 mt-1">{bid.roundName}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* New Amount */}
          {selectedNewBid && (
            <div>
              <label className="block text-sm font-medium text-[#D4CCBB] mb-2">4. Adjust Transfer Amount (£)</label>
              <input
                type="number"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                placeholder="Enter amount"
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-[#7A7367] focus:outline-none focus:border-[#E8A800] transition-colors"
              />
              <p className="text-xs text-[#7A7367] mt-1">Original bid amount: £{selectedNewBid.bidAmount.toLocaleString()}</p>
            </div>
          )}

          {/* Replace Button */}
          {selectedNewBid && newAmount && (
            <button
              onClick={handleReplace}
              disabled={loading}
              className="w-full px-6 py-3 bg-[#E8A800] text-black font-bold rounded-lg hover:bg-[#E8A800]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'Replacing...' : 'Replace Player & Update Ledger'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}layers, setCurrentP