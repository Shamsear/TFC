'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Badge } from '@/components/ui/badge';
import { RefreshCw, AlertCircle, CheckCircle, Search } from 'lucide-react';

interface BalanceAudit {
  teamId: string;
  teamName: string;
  currentBalance: number;
  calculatedBalance: number;
  difference: number;
  hasError: boolean;
  transferCount: number;
  totalSpent: number;
  initialPurse: number;
}

interface AdminToolsClientProps {
  seasonId: string;
}

export default function AdminToolsClient({ seasonId }: AdminToolsClientProps) {
  const [audits, setAudits] = useState<BalanceAudit[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Transfer fix state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedTransfer, setSelectedTransfer] = useState<any>(null);
  const [newPlayerSearch, setNewPlayerSearch] = useState('');
  const [newPlayerResults, setNewPlayerResults] = useState<any[]>([]);
  const [selectedNewPlayer, setSelectedNewPlayer] = useState<any>(null);

  useEffect(() => {
    loadAudits();
  }, [seasonId]);

  const loadAudits = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/balances/audit?seasonId=${seasonId}`);
      const data = await res.json();
      if (data.audits) {
        setAudits(data.audits);
      }
    } catch (error) {
      console.error('Failed to load audits:', error);
    } finally {
      setLoading(false);
    }
  };

  const fixBalance = async (teamId: string) => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/balances/fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seasonId, teamId })
      });
      
      const data = await res.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: data.message });
        await loadAudits();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to fix balance' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to fix balance' });
    } finally {
      setLoading(false);
    }
  };

  const fixAllBalances = async () => {
    const teamsWithErrors = audits.filter(a => a.hasError);
    if (teamsWithErrors.length === 0) {
      setMessage({ type: 'success', text: 'All balances are correct' });
      return;
    }

    setLoading(true);
    setMessage(null);
    
    let fixed = 0;
    for (const audit of teamsWithErrors) {
      try {
        const res = await fetch('/api/admin/balances/fix', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ seasonId, teamId: audit.teamId })
        });
        
        if (res.ok) {
          fixed++;
        }
      } catch (error) {
        console.error(`Failed to fix ${audit.teamName}:`, error);
      }
    }

    setMessage({ type: 'success', text: `Fixed ${fixed} of ${teamsWithErrors.length} teams` });
    await loadAudits();
    setLoading(false);
  };

  const searchTransfers = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/players/search?search=${encodeURIComponent(searchQuery)}&seasonId=${seasonId}`);
      const data = await res.json();
      
      // Filter to only show players that have transfers
      const playersWithTransfers = [];
      for (const player of data.players || []) {
        if (player.status === 'SOLD' && player.team) {
          const transferRes = await fetch(`/api/admin/transfers/search?playerId=${player.id}&seasonId=${seasonId}`);
          const transferData = await transferRes.json();
          if (transferData.transfer) {
            playersWithTransfers.push({
              ...player,
              transfer: transferData.transfer
            });
          }
        }
      }
      
      setSearchResults(playersWithTransfers);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchNewPlayer = async () => {
    if (!newPlayerSearch.trim()) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/players/search?search=${encodeURIComponent(newPlayerSearch)}&seasonId=${seasonId}&team=Free Agent`);
      const data = await res.json();
      setNewPlayerResults(data.players || []);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const swapPlayer = async () => {
    if (!selectedTransfer || !selectedNewPlayer) return;

    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/transfers/fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'swap',
          transferId: selectedTransfer.transfer.id,
          newPlayerId: selectedNewPlayer.id
        })
      });

      const data = await res.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: data.message });
        setSelectedTransfer(null);
        setSelectedNewPlayer(null);
        setSearchQuery('');
        setNewPlayerSearch('');
        setSearchResults([]);
        setNewPlayerResults([]);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to swap player' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to swap player' });
    } finally {
      setLoading(false);
    }
  };

  const teamsWithErrors = audits.filter(a => a.hasError);
  const teamsWithoutErrors = audits.filter(a => !a.hasError);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Tools</h1>
        <p className="text-muted-foreground">Fix transfers and audit team balances</p>
      </div>

      {message && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
          {message.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="balances" className="w-full">
        <TabsList>
          <TabsTrigger value="balances">Balance Audit</TabsTrigger>
          <TabsTrigger value="transfers">Transfer Fixes</TabsTrigger>
        </TabsList>

        <TabsContent value="balances" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Team Balance Audit</CardTitle>
              <CardDescription>
                Check and fix team balance discrepancies
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button onClick={loadAudits} disabled={loading}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh Audit
                </Button>
                {teamsWithErrors.length > 0 && (
                  <Button onClick={fixAllBalances} disabled={loading} variant="destructive">
                    Fix All Errors ({teamsWithErrors.length})
                  </Button>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Teams</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{audits.length}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Teams with Errors</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">{teamsWithErrors.length}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Teams OK</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{teamsWithoutErrors.length}</div>
                  </CardContent>
                </Card>
              </div>

              {teamsWithErrors.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-2 text-red-600">Teams with Errors</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Team</TableHead>
                        <TableHead className="text-right">Current</TableHead>
                        <TableHead className="text-right">Calculated</TableHead>
                        <TableHead className="text-right">Difference</TableHead>
                        <TableHead className="text-right">Players</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {teamsWithErrors.map((audit) => (
                        <TableRow key={audit.teamId}>
                          <TableCell className="font-medium">{audit.teamName}</TableCell>
                          <TableCell className="text-right">£{audit.currentBalance.toLocaleString()}</TableCell>
                          <TableCell className="text-right">£{audit.calculatedBalance.toLocaleString()}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant="destructive">
                              £{audit.difference.toLocaleString()}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{audit.transferCount}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              onClick={() => fixBalance(audit.teamId)}
                              disabled={loading}
                            >
                              Fix
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {teamsWithoutErrors.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-2 text-green-600">Teams without Errors</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Team</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                        <TableHead className="text-right">Spent</TableHead>
                        <TableHead className="text-right">Players</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {teamsWithoutErrors.map((audit) => (
                        <TableRow key={audit.teamId}>
                          <TableCell className="font-medium">{audit.teamName}</TableCell>
                          <TableCell className="text-right">£{audit.currentBalance.toLocaleString()}</TableCell>
                          <TableCell className="text-right">£{audit.totalSpent.toLocaleString()}</TableCell>
                          <TableCell className="text-right">{audit.transferCount}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transfers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Transfer Fix Tool</CardTitle>
              <CardDescription>
                Swap players in existing transfers (maintains same price)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Search for existing transfer */}
                <div className="space-y-4">
                  <div>
                    <Label>1. Find Player to Replace</Label>
                    <div className="flex gap-2 mt-2">
                      <Input
                        placeholder="Search player name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && searchTransfers()}
                      />
                      <Button onClick={searchTransfers} disabled={loading}>
                        <Search className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {searchResults.length > 0 && (
                    <div className="border rounded-lg p-4 space-y-2 max-h-96 overflow-y-auto">
                      {searchResults.map((player) => (
                        <div
                          key={player.id}
                          className={`p-3 border rounded cursor-pointer hover:bg-accent ${
                            selectedTransfer?.id === player.id ? 'bg-accent' : ''
                          }`}
                          onClick={() => setSelectedTransfer(player)}
                        >
                          <div className="font-medium">{player.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {player.transfer.team.name} • £{player.transfer.soldPrice} • Round {player.transfer.round?.roundNumber}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {player.position} ({player.position_group}) • OVR {player.overallRating}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Search for replacement player */}
                <div className="space-y-4">
                  <div>
                    <Label>2. Find Replacement Player</Label>
                    <div className="flex gap-2 mt-2">
                      <Input
                        placeholder="Search player name..."
                        value={newPlayerSearch}
                        onChange={(e) => setNewPlayerSearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && searchNewPlayer()}
                        disabled={!selectedTransfer}
                      />
                      <Button onClick={searchNewPlayer} disabled={loading || !selectedTransfer}>
                        <Search className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {newPlayerResults.length > 0 && (
                    <div className="border rounded-lg p-4 space-y-2 max-h-96 overflow-y-auto">
                      {newPlayerResults.map((player) => (
                        <div
                          key={player.id}
                          className={`p-3 border rounded cursor-pointer hover:bg-accent ${
                            selectedNewPlayer?.id === player.id ? 'bg-accent' : ''
                          }`}
                          onClick={() => setSelectedNewPlayer(player)}
                        >
                          <div className="font-medium">{player.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {player.position} ({player.position_group}) • OVR {player.overallRating}
                          </div>
                          <Badge variant="outline" className="mt-1">Unsold</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {selectedTransfer && selectedNewPlayer && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-2">Swap Summary</h4>
                  <div className="bg-muted p-4 rounded-lg space-y-2">
                    <div className="flex justify-between">
                      <span>Team:</span>
                      <span className="font-medium">{selectedTransfer.transfer.team.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Remove:</span>
                      <span className="font-medium">{selectedTransfer.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Add:</span>
                      <span className="font-medium">{selectedNewPlayer.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Price:</span>
                      <span className="font-medium">£{selectedTransfer.transfer.soldPrice} (unchanged)</span>
                    </div>
                  </div>
                  <Button
                    onClick={swapPlayer}
                    disabled={loading}
                    className="w-full mt-4"
                  >
                    Execute Swap
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
