'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle, CheckCircle, Search, Trash2, ArrowRightLeft, X } from 'lucide-react';

interface Team {
  id: string;
  name: string;
}

interface Player {
  id: string;
  name: string;
  position: string;
  position_group: string | null;
  overallRating: number;
  team: Team;
  soldPrice: number;
}

interface PlayerManagementClientProps {
  seasonId: string;
}

export default function PlayerManagementClient({ seasonId }: PlayerManagementClientProps) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [teamPlayers, setTeamPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Single operation state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Player[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [targetTeam, setTargetTeam] = useState<string>('');
  const [notes, setNotes] = useState('');

  // Bulk operation state
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set());
  const [bulkTargetTeam, setBulkTargetTeam] = useState<string>('');
  const [bulkNotes, setBulkNotes] = useState('');

  useEffect(() => {
    loadTeams();
  }, [seasonId]);

  useEffect(() => {
    if (selectedTeam) {
      loadTeamPlayers(selectedTeam);
    }
  }, [selectedTeam]);

  const loadTeams = async () => {
    try {
      const res = await fetch(`/api/seasons/${seasonId}/teams`);
      const data = await res.json();
      setTeams(data.teams || []);
    } catch (error) {
      console.error('Failed to load teams:', error);
    }
  };

  const loadTeamPlayers = async (teamId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/players/search?seasonId=${seasonId}&team=${encodeURIComponent(teams.find(t => t.id === teamId)?.name || '')}`);
      const data = await res.json();
      setTeamPlayers(data.players || []);
    } catch (error) {
      console.error('Failed to load players:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchPlayers = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/players/search?search=${encodeURIComponent(searchQuery)}&seasonId=${seasonId}`);
      const data = await res.json();
      // Filter to only sold players
      const soldPlayers = (data.players || []).filter((p: any) => p.status === 'SOLD' && p.team);
      setSearchResults(soldPlayers);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const transferPlayer = async () => {
    if (!selectedPlayer || !targetTeam) {
      setMessage({ type: 'error', text: 'Please select a player and target team' });
      return;
    }

    if (selectedPlayer.team.id === targetTeam) {
      setMessage({ type: 'error', text: 'Player is already in the target team' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/admin/players/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seasonId,
          transfers: [{
            playerId: selectedPlayer.id,
            fromTeamId: selectedPlayer.team.id,
            toTeamId: targetTeam,
            notes: notes || `Transferred ${selectedPlayer.name} from ${selectedPlayer.team.name} to ${teams.find(t => t.id === targetTeam)?.name}`
          }]
        })
      });

      const data = await res.json();

      if (data.success && data.transferred > 0) {
        setMessage({ type: 'success', text: `Successfully transferred ${selectedPlayer.name}` });
        setSelectedPlayer(null);
        setTargetTeam('');
        setNotes('');
        setSearchQuery('');
        setSearchResults([]);
        if (selectedTeam) {
          loadTeamPlayers(selectedTeam);
        }
      } else {
        setMessage({ type: 'error', text: data.error || 'Transfer failed' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to transfer player' });
    } finally {
      setLoading(false);
    }
  };

  const releasePlayer = async () => {
    if (!selectedPlayer) {
      setMessage({ type: 'error', text: 'Please select a player' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/admin/players/release', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seasonId,
          releases: [{
            playerId: selectedPlayer.id,
            teamId: selectedPlayer.team.id,
            notes: notes || `Released ${selectedPlayer.name} from ${selectedPlayer.team.name}`
          }]
        })
      });

      const data = await res.json();

      if (data.success && data.released > 0) {
        setMessage({ type: 'success', text: `Successfully released ${selectedPlayer.name}` });
        setSelectedPlayer(null);
        setNotes('');
        setSearchQuery('');
        setSearchResults([]);
        if (selectedTeam) {
          loadTeamPlayers(selectedTeam);
        }
      } else {
        setMessage({ type: 'error', text: data.error || 'Release failed' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to release player' });
    } finally {
      setLoading(false);
    }
  };

  const bulkTransfer = async () => {
    if (selectedPlayers.size === 0 || !bulkTargetTeam) {
      setMessage({ type: 'error', text: 'Please select players and target team' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const transfers = Array.from(selectedPlayers).map(playerId => {
        const player = teamPlayers.find(p => p.id === playerId);
        return {
          playerId,
          fromTeamId: player?.team.id,
          toTeamId: bulkTargetTeam,
          notes: bulkNotes || `Bulk transfer to ${teams.find(t => t.id === bulkTargetTeam)?.name}`
        };
      });

      const res = await fetch('/api/admin/players/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seasonId, transfers })
      });

      const data = await res.json();

      if (data.success) {
        setMessage({ 
          type: 'success', 
          text: `Successfully transferred ${data.transferred} player(s)${data.errors.length > 0 ? `, ${data.errors.length} failed` : ''}` 
        });
        setSelectedPlayers(new Set());
        setBulkTargetTeam('');
        setBulkNotes('');
        if (selectedTeam) {
          loadTeamPlayers(selectedTeam);
        }
      } else {
        setMessage({ type: 'error', text: data.error || 'Bulk transfer failed' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to transfer players' });
    } finally {
      setLoading(false);
    }
  };

  const bulkRelease = async () => {
    if (selectedPlayers.size === 0) {
      setMessage({ type: 'error', text: 'Please select players to release' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const releases = Array.from(selectedPlayers).map(playerId => {
        const player = teamPlayers.find(p => p.id === playerId);
        return {
          playerId,
          teamId: player?.team.id,
          notes: bulkNotes || 'Bulk release'
        };
      });

      const res = await fetch('/api/admin/players/release', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seasonId, releases })
      });

      const data = await res.json();

      if (data.success) {
        setMessage({ 
          type: 'success', 
          text: `Successfully released ${data.released} player(s)${data.errors.length > 0 ? `, ${data.errors.length} failed` : ''}` 
        });
        setSelectedPlayers(new Set());
        setBulkNotes('');
        if (selectedTeam) {
          loadTeamPlayers(selectedTeam);
        }
      } else {
        setMessage({ type: 'error', text: data.error || 'Bulk release failed' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to release players' });
    } finally {
      setLoading(false);
    }
  };

  const togglePlayerSelection = (playerId: string) => {
    const newSelection = new Set(selectedPlayers);
    if (newSelection.has(playerId)) {
      newSelection.delete(playerId);
    } else {
      newSelection.add(playerId);
    }
    setSelectedPlayers(newSelection);
  };

  const selectAllPlayers = () => {
    if (selectedPlayers.size === teamPlayers.length) {
      setSelectedPlayers(new Set());
    } else {
      setSelectedPlayers(new Set(teamPlayers.map(p => p.id)));
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Player Management</h1>
        <p className="text-muted-foreground">Transfer and release players</p>
      </div>

      {message && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
          {message.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="single" className="w-full">
        <TabsList>
          <TabsTrigger value="single">Single Operation</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Operation</TabsTrigger>
        </TabsList>

        <TabsContent value="single" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Single Player Transfer/Release</CardTitle>
              <CardDescription>
                Transfer a player to another team or release them
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label>Search Player</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      placeholder="Search player name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && searchPlayers()}
                    />
                    <Button onClick={searchPlayers} disabled={loading}>
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {searchResults.length > 0 && !selectedPlayer && (
                  <div className="border rounded-lg p-4 space-y-2 max-h-96 overflow-y-auto">
                    {searchResults.map((player) => (
                      <div
                        key={player.id}
                        className="p-3 border rounded cursor-pointer hover:bg-accent"
                        onClick={() => setSelectedPlayer(player)}
                      >
                        <div className="font-medium">{player.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {player.team.name} • {player.position} ({player.position_group}) • OVR {player.overallRating} • £{player.soldPrice}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {selectedPlayer && (
                  <div className="border rounded-lg p-4 bg-accent">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <div className="font-bold text-lg">{selectedPlayer.name}</div>
                        <div className="text-sm text-muted-foreground">
                          Current Team: {selectedPlayer.team.name} • £{selectedPlayer.soldPrice}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {selectedPlayer.position} ({selectedPlayer.position_group}) • OVR {selectedPlayer.overallRating}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedPlayer(null);
                          setTargetTeam('');
                          setNotes('');
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Label>Target Team (for transfer)</Label>
                        <Select value={targetTeam} onValueChange={setTargetTeam}>
                          <SelectTrigger className="mt-2">
                            <SelectValue placeholder="Select target team..." />
                          </SelectTrigger>
                          <SelectContent>
                            {teams
                              .filter(t => t.id !== selectedPlayer.team.id)
                              .map(team => (
                                <SelectItem key={team.id} value={team.id}>
                                  {team.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Notes (optional)</Label>
                        <Textarea
                          placeholder="Add notes about this operation..."
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          className="mt-2"
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={transferPlayer}
                          disabled={loading || !targetTeam}
                          className="flex-1"
                        >
                          <ArrowRightLeft className="mr-2 h-4 w-4" />
                          Transfer to {teams.find(t => t.id === targetTeam)?.name || 'Team'}
                        </Button>
                        <Button
                          onClick={releasePlayer}
                          disabled={loading}
                          variant="destructive"
                          className="flex-1"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Release Player
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bulk" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bulk Player Transfer/Release</CardTitle>
              <CardDescription>
                Transfer or release multiple players at once
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label>Select Team</Label>
                <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select team..." />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map(team => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedTeam && teamPlayers.length > 0 && (
                <>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Team Players ({teamPlayers.length})</Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={selectAllPlayers}
                      >
                        {selectedPlayers.size === teamPlayers.length ? 'Deselect All' : 'Select All'}
                      </Button>
                    </div>
                    <div className="border rounded-lg max-h-96 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12"></TableHead>
                            <TableHead>Player</TableHead>
                            <TableHead>Position</TableHead>
                            <TableHead>OVR</TableHead>
                            <TableHead className="text-right">Price</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {teamPlayers.map((player) => (
                            <TableRow key={player.id}>
                              <TableCell>
                                <Checkbox
                                  checked={selectedPlayers.has(player.id)}
                                  onCheckedChange={() => togglePlayerSelection(player.id)}
                                />
                              </TableCell>
                              <TableCell className="font-medium">{player.name}</TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {player.position} ({player.position_group})
                                </Badge>
                              </TableCell>
                              <TableCell>{player.overallRating}</TableCell>
                              <TableCell className="text-right">£{player.soldPrice}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  {selectedPlayers.size > 0 && (
                    <div className="space-y-4 border-t pt-4">
                      <div className="bg-muted p-3 rounded-lg">
                        <div className="font-medium">
                          {selectedPlayers.size} player(s) selected
                        </div>
                      </div>

                      <div>
                        <Label>Target Team (for transfer)</Label>
                        <Select value={bulkTargetTeam} onValueChange={setBulkTargetTeam}>
                          <SelectTrigger className="mt-2">
                            <SelectValue placeholder="Select target team..." />
                          </SelectTrigger>
                          <SelectContent>
                            {teams
                              .filter(t => t.id !== selectedTeam)
                              .map(team => (
                                <SelectItem key={team.id} value={team.id}>
                                  {team.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Notes (optional)</Label>
                        <Textarea
                          placeholder="Add notes about this bulk operation..."
                          value={bulkNotes}
                          onChange={(e) => setBulkNotes(e.target.value)}
                          className="mt-2"
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={bulkTransfer}
                          disabled={loading || !bulkTargetTeam}
                          className="flex-1"
                        >
                          <ArrowRightLeft className="mr-2 h-4 w-4" />
                          Transfer {selectedPlayers.size} Player(s)
                        </Button>
                        <Button
                          onClick={bulkRelease}
                          disabled={loading}
                          variant="destructive"
                          className="flex-1"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Release {selectedPlayers.size} Player(s)
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {selectedTeam && teamPlayers.length === 0 && !loading && (
                <div className="text-center py-8 text-muted-foreground">
                  No players found in this team
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
