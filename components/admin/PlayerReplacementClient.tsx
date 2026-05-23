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

interface RoundBid {
  roundId: string;
  roundNumber: number;
  roundName: string;
  bidCount: number;
}

interface BidPlayer {
  playerId: string;
  playerName: string;
  bidAmount: number;
  isSold: boolean;
  ownedByTeam?: string;
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
  const [teamRounds, setTeamRounds] = useState<RoundBid[]>([]);
  const [selectedRound, setSelectedRound] = useState('');
  const [roundBids, setRoundBids] = useState<BidPlayer[]>([]);
  const [selectedOldPlayer, setSelectedOldPlayer] = useState('');
  const [selectedNewPlayer, setSelectedNewPlayer] = useState<BidPlayer | null>(null);
  const [newAmount, setNewAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadTeamData = async (teamId: string) => {
    try {
      // Load current squad
      const playersResponse = await fetch(`/api/admin/teams/players?teamId=${teamId}&seasonId=${seasonId}`);
      const playersData = await playersResponse.json();
      setCurrentPlayers(playersData.players || []);

      // Load team's bid rounds
      const roundsResponse = await fetch(`/api/admin/teams/bid-rounds?teamId=${teamId}&seasonId=${seasonId}`);
      const roundsData = await roundsResponse.json();
      setTeamRounds(roundsData.rounds || []);
    } catch (error) {
      console.error('Error loading team data:', error);
    }
  };

  const loadRoundBids = async (roundId: string, teamId: string) => {
    try {
      const response = await fetch(`/api/admin/rounds/${roundId}/team-bids-with-status?teamId=${teamId}&seasonId=${seasonId}`);
      const data = await response.json();
      setRoundBids(data.bids || []);
    } catch (error) {
      console.error('Error loading round bids:', error);
    }
  };

  const handleTeamChange = (teamId: string) => {
    setSelectedTeam(teamId);
    setSelectedOldPlayer('');
    setSelectedRound('');
    setSelectedNewPlayer(null);
    setRoundBids([]);
    setNewAmount('');
    if (teamId) {
      loadTeamData(teamId);
    } else {
      setCurrentPlayers([]);
      setTeamRounds([]);
    }
  };

  const handleOldPlayerChange = async (playerId: string) => {
    setSelectedOldPlayer(playerId);
    const player = currentPlayers.find(p => p.id === playerId);
    if (player) {
      setNewAmount((player.soldPrice || 0).toString());
      
      // Auto-find and select the round where this player was acquired
      try {
        const response = await fetch(`/api/admin/players/acquisition-round?playerId=${playerId}&teamId=${selectedTeam}&seasonId=${seasonId}`);
        const data = await response.json();
        
        if (data.roundId) {
          setSelectedRound(data.roundId);
          // Load bids for that round
          loadRoundBids(data.roundId, selectedTeam);
        }
      } catch (error) {
        console.error('Error finding acquisition round:', error);
      }
    }
    setSelectedNewPlayer(null);
  };

  const handleRoundChange = (roundId: string) => {
    setSelectedRound(roundId);
    setSelectedNewPlayer(null);
    if (roundId && selectedTeam) {
      loadRoundBids(roundId, selectedTeam);
    } else {
      setRoundBids([]);
    }
  };

  const handleReplace = async () => {
    if (!selectedTeam || !selectedOldPlayer || !selectedNewPlayer || !newAmount) {
      setMessage({ type: 'error', text: 'Please fill all fields' });
      return;
    }

    const team = teams.find(t => t.id === selectedTeam);
    const oldPlayer = currentPlayers.find(p => p.id === selectedOldPlayer);

    if (!confirm(
      `Replace ${oldPlayer?.name} (£${(oldPlayer?.soldPrice || 0).toLocaleString()}) with ${selectedNewPlayer.playerName} (£${parseInt(newAmount).toLocaleString()}) for ${team?.name}?\n\nThis will update transfer history, financial ledger, and recalculate all subsequent entries.`
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
          newPlayerId: selectedNewPlayer.playerId,
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
      setSelectedRound('');
      setSelectedNewPlayer(null);
      setRoundBids([]);
      setNewAmount('');

      // Reload team data
      loadTeamData(selectedTeam);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const soldPlayers = roundBids.filter(b => b.isSold);
  const unsoldPlayers = roundBids.filter(b => !b.isSold);

  return (
    <div className="space-y-6">
      <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-6">
        <p className="text-[#D4CCBB] mb-6">
          Replace a player that was incorrectly allocated with another player from the team's bid list. 
          Select a team, then the player to replace, then choose a round to see available (unsold) players from that round's bids.
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

          {/* Round Selection */}
          {selectedOldPlayer && teamRounds.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-[#D4CCBB] mb-2">
                3. Select Round ({teamRounds.length} rounds with bids)
              </label>
              <select
                value={selectedRound}
                onChange={(e) => handleRoundChange(e.target.value)}
                className="w-full px-4 py-2 bg-[#1a1a1a] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#E8A800] transition-colors appearance-none cursor-pointer"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23D4CCBB' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                  backgroundPosition: 'right 0.5rem center',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '1.5em 1.5em',
                  paddingRight: '2.5rem'
                }}
              >
                <option value="" className="bg-[#1a1a1a]">-- Select Round --</option>
                {teamRounds.map(round => (
                  <option key={round.roundId} value={round.roundId} className="bg-[#1a1a1a]">
                    {round.roundName} ({round.bidCount} bids)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Bid Players Display */}
          {selectedRound && roundBids.length > 0 && (
            <div className="space-y-4">
              {/* Unsold Players */}
              <div>
                <label className="block text-sm font-medium text-green-400 mb-2">
                  4. Select Replacement Player - Available ({unsoldPlayers.length} unsold)
                </label>
                <div className="max-h-60 overflow-y-auto bg-white/5 rounded-lg border border-white/10">
                  {unsoldPlayers.map(player => (
                    <div
                      key={player.playerId}
                      onClick={() => {
                        setSelectedNewPlayer(player);
                        setNewAmount(player.bidAmount.toString());
                      }}
                      className={`p-3 cursor-pointer hover:bg-white/10 border-b border-white/10 last:border-b-0 transition-colors ${
                        selectedNewPlayer?.playerId === player.playerId ? 'bg-[#E8A800]/10 border-l-4 border-l-[#E8A800]' : ''
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div className="font-medium text-white">{player.playerName}</div>
                        <div className="text-green-400 font-bold">£{player.bidAmount.toLocaleString()}</div>
                      </div>
                      <div className="text-xs text-green-400 mt-1">✓ Available</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sold Players (Read-only) */}
              {soldPlayers.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-red-400 mb-2">
                    Already Sold ({soldPlayers.length} players)
                  </label>
                  <div className="max-h-40 overflow-y-auto bg-white/5 rounded-lg border border-white/10 opacity-60">
                    {soldPlayers.map(player => (
                      <div
                        key={player.playerId}
                        className="p-3 border-b border-white/10 last:border-b-0"
                      >
                        <div className="flex justify-between items-center">
                          <div className="font-medium text-white">{player.playerName}</div>
                          <div className="text-gray-400">£{player.bidAmount.toLocaleString()}</div>
                        </div>
                        <div className="text-xs text-red-400 mt-1">✗ Owned by {player.ownedByTeam}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* New Amount */}
          {selectedNewPlayer && (
            <div>
              <label className="block text-sm font-medium text-[#D4CCBB] mb-2">5. Adjust Transfer Amount (£)</label>
              <input
                type="number"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                placeholder="Enter amount"
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-[#7A7367] focus:outline-none focus:border-[#E8A800] transition-colors"
              />
              <p className="text-xs text-[#7A7367] mt-1">Original bid amount: £{selectedNewPlayer.bidAmount.toLocaleString()}</p>
            </div>
          )}

          {/* Replace Button */}
          {selectedNewPlayer && newAmount && (
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
}
