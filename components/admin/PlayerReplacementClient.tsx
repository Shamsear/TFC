'use client';

import { useState } from 'react';
import SearchableSelect from '@/components/ui/SearchableSelect';

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
  const [highlightedRoundId, setHighlightedRoundId] = useState<string | null>(null);

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
    setHighlightedRoundId(null);
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
      
      // Find which round this player was acquired in
      const playerBid = allBids.find(bid => bid.playerId === playerId && bid.isSold);
      if (playerBid) {
        setHighlightedRoundId(playerBid.roundId);
        // Scroll to that round after a short delay to ensure DOM is ready
        setTimeout(() => {
          const element = document.getElementById(`round-${playerBid.roundId}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }, 100);
      }
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
      setHighlightedRoundId(null);

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

  // If a player is selected to replace, only show the round where they were acquired
  const bidsToShow = selectedOldPlayer && highlightedRoundId
    ? filteredBids.filter(bid => bid.roundId === highlightedRoundId)
    : filteredBids;

  // Group bids by round
  const bidsByRound = bidsToShow.reduce((acc, bid) => {
    if (!acc[bid.roundId]) {
      acc[bid.roundId] = {
        roundId: bid.roundId,
        roundNumber: bid.roundNumber,
        roundName: bid.roundName,
        bids: []
      };
    }
    acc[bid.roundId].bids.push(bid);
    return acc;
  }, {} as Record<string, { roundId: string; roundNumber: number; roundName: string; bids: AllBid[] }>);

  // Convert to array, sort by round number, and sort bids within each round by amount (high to low)
  const roundGroups = Object.values(bidsByRound)
    .sort((a, b) => a.roundNumber - b.roundNumber)
    .map(round => ({
      ...round,
      bids: round.bids.sort((a, b) => b.bidAmount - a.bidAmount) // Sort bids high to low
    }));

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white/[0.01] border border-white/5 p-6 backdrop-blur-xl shadow-md">
        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider font-mono mb-6 leading-relaxed">
          Replace a player that was incorrectly allocated with another player from the team's complete bid history. 
          Select a team to see all their bids grouped by round, then choose which player to replace.
        </p>

        {message && (
          <div className={`mb-6 p-4 rounded-xl font-mono text-xs uppercase tracking-wider ${message.type === 'success' ? 'bg-green-500/10 border border-green-500/30 text-green-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'}`}>
            {message.text}
          </div>
        )}

        <div className="space-y-6">
          {/* Team Selection */}
          <SearchableSelect
            label="1. Select Team"
            value={selectedTeam}
            options={[
              { value: '', label: '-- Select Team --' },
              ...teams.map(team => ({ value: team.id, label: team.name }))
            ]}
            onChange={handleTeamChange}
            enableSearch={true}
          />

          {/* Old Player Selection */}
          {selectedTeam && currentPlayers.length > 0 && (
            <SearchableSelect
              label={`2. Select Player to Replace (${currentPlayers.length} players in squad)`}
              value={selectedOldPlayer}
              options={[
                { value: '', label: '-- Select Player to Replace --' },
                ...currentPlayers.map(player => ({
                  value: player.id,
                  label: `${player.name} - £${(player.soldPrice || 0).toLocaleString()}`
                }))
              ]}
              onChange={handleOldPlayerChange}
              enableSearch={true}
            />
          )}

          {/* All Bids Display - Grouped by Round */}
          {selectedOldPlayer && allBids.length > 0 && (
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] text-gray-500 font-extrabold uppercase tracking-widest font-mono mb-2">
                  3. Select Replacement Player from {highlightedRoundId ? 'Acquisition Round' : 'Team\'s Bid History'} ({bidsToShow.length} {highlightedRoundId ? 'bids in this round' : 'total bids across ' + roundGroups.length + ' rounds'})
                </label>
                
                {/* Search */}
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search players..."
                  className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#E8A800]/30 transition-all font-mono mb-4"
                />

                {/* Rounds */}
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                  {roundGroups.map(round => {
                    const soldCount = round.bids.filter(b => b.isSold).length;
                    const unsoldAvailableCount = round.bids.filter(b => !b.isSold && !b.soldToOther).length;
                    const soldToOthersCount = round.bids.filter(b => b.soldToOther).length;
                    const isHighlighted = highlightedRoundId === round.roundId;

                    return (
                      <div 
                        key={round.roundId} 
                        id={`round-${round.roundId}`}
                        className={`bg-white/[0.01] rounded-2xl border transition-all backdrop-blur-xl shadow-md ${
                          isHighlighted 
                            ? 'border-[#E8A800] shadow-[#E8A800]/10' 
                            : 'border-white/5'
                        }`}
                      >
                        {/* Round Header */}
                        <div className={`border-b px-4 py-3 ${
                          isHighlighted 
                            ? 'bg-[#E8A800]/5 border-[#E8A800]/20' 
                            : 'bg-white/[0.02] border-white/5'
                        }`}>
                          <div className="flex items-center justify-between">
                            <h4 className={`font-black uppercase tracking-wider text-xs font-mono ${
                              isHighlighted ? 'text-[#E8A800]' : 'text-gray-400'
                            }`}>
                              {round.roundName}
                              {isHighlighted && <span className="ml-2 text-[10px] text-white font-normal lowercase tracking-normal">(Player acquired here)</span>}
                            </h4>
                            <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider font-mono">
                              <span className="text-green-400">✓ {soldCount} Owned</span>
                              <span className="text-blue-400">◯ {unsoldAvailableCount} Available</span>
                              <span className="text-red-400">✗ {soldToOthersCount} Lost</span>
                            </div>
                          </div>
                        </div>

                        {/* Bids List */}
                        <div className="divide-y divide-white/5">
                          {round.bids.map(bid => {
                            const isOwned = bid.isSold;
                            const isLost = bid.soldToOther;
                            const isAvailable = !isOwned && !isLost;
                            const isSelected = selectedNewBid?.playerId === bid.playerId && selectedNewBid?.roundId === bid.roundId;
                            const isReplacingThisPlayer = selectedOldPlayer === bid.playerId && isOwned;

                            return (
                              <div
                                key={`${bid.playerId}-${bid.roundId}`}
                                onClick={() => {
                                  if (isAvailable) {
                                    setSelectedNewBid(bid);
                                    setNewAmount(bid.bidAmount.toString());
                                  }
                                }}
                                className={`p-3.5 transition-all duration-300 ${
                                  isAvailable 
                                    ? 'cursor-pointer hover:bg-white/[0.02]' 
                                    : 'opacity-40 cursor-not-allowed'
                                } ${
                                  isSelected ? 'bg-[#E8A800]/5 border-l-4 border-l-[#E8A800]' : ''
                                } ${
                                  isReplacingThisPlayer ? 'bg-red-500/5 border-l-4 border-l-red-500' : ''
                                }`}
                              >
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <div className={`text-sm font-bold uppercase tracking-tight ${isOwned || isLost ? 'italic text-gray-400' : 'text-white'} ${
                                      isReplacingThisPlayer ? 'text-red-400 font-black' : ''
                                    }`}>
                                      {bid.playerName}
                                      {isReplacingThisPlayer && <span className="ml-2 text-[10px] text-red-500 font-extrabold uppercase tracking-widest font-mono">(TO BE REPLACED)</span>}
                                    </div>
                                    <div className="flex items-center gap-3 mt-1.5 text-[10px] font-bold uppercase tracking-wider font-mono">
                                      {isOwned && (
                                        <>
                                          <span className="text-green-400">✓ OWNED</span>
                                          <span className="text-gray-500">Bid: £{bid.bidAmount.toLocaleString()}</span>
                                          <span className="text-green-400">Sold: £{(bid.soldPrice || 0).toLocaleString()}</span>
                                        </>
                                      )}
                                      {isAvailable && (
                                        <>
                                          <span className="text-blue-400">◯ AVAILABLE</span>
                                          <span className="text-gray-500">Bid: £{bid.bidAmount.toLocaleString()}</span>
                                        </>
                                      )}
                                      {isLost && (
                                        <>
                                          <span className="text-red-400">✗ LOST</span>
                                          <span className="text-gray-500">Bid: £{bid.bidAmount.toLocaleString()}</span>
                                          <span className="text-red-400">to {bid.ownedByTeam}</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* New Amount */}
          {selectedNewBid && (
            <div>
              <label className="block text-[10px] text-gray-500 font-extrabold uppercase tracking-widest font-mono mb-2">4. Adjust Transfer Amount (£)</label>
              <input
                type="number"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                placeholder="Enter amount"
                className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#E8A800]/30 transition-all font-mono"
              />
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider font-mono mt-2">Original bid amount: £{selectedNewBid.bidAmount.toLocaleString()}</p>
            </div>
          )}

          {/* Replace Button */}
          {selectedNewBid && newAmount && (
            <button
              onClick={handleReplace}
              disabled={loading}
              className="w-full px-6 py-3 bg-gradient-to-r from-[#E8A800] to-[#FFB347] hover:from-[#FFC93A] hover:to-[#FFB347] text-[#0a0a0a] rounded-xl font-bold transition-all text-xs uppercase tracking-wider cursor-pointer shadow-md hover:shadow-[#E8A800]/25"
            >
              {loading ? 'Replacing...' : 'Replace Player & Update Ledger'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}