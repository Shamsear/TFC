"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import SearchableSelect from "@/components/ui/SearchableSelect";

interface BaseData {
  id: string;
  name: string;
  seasonNumber?: number;
  managerName?: string;
  photoUrl?: string;
}

interface HistoricalDataWizardProps {
  initialSeasons: BaseData[];
  initialTeams: BaseData[];
  players: BaseData[];
}

const STORAGE_KEY = "tfc_historical_wizard_bulk";

export default function HistoricalDataWizard({
  initialSeasons,
  initialTeams,
  players,
}: HistoricalDataWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isInitialized, setIsInitialized] = useState(false);

  // Form State
  const [season, setSeason] = useState({ id: "", name: "" });
  const [seasonTeams, setSeasonTeams] = useState<{ id: string; name: string; managerName: string; tempId: string }[]>([]);
  const [tournaments, setTournaments] = useState<{ id: string; name: string; type: string; startDate: string; groupName: string }[]>([
    { id: "t_1", name: "League", type: "LEAGUE", startDate: new Date().toISOString().split("T")[0], groupName: "" }
  ]);
  const [stats, setStats] = useState<Record<string, { played: number, won: number, drawn: number, lost: number, goalsFor: number, goalsAgainst: number, points: number }>>({});
  const [teamPlayers, setTeamPlayers] = useState<Record<string, string[]>>({});
  
  // Awards State
  const [awards, setAwards] = useState<{
    winnerTeamId: string;
    runnerUpTeamId: string;
    goldenBootPlayerId: string;
    goldenGlovePlayerId: string;
    goldenBallPlayerId: string;
    ballonDorPlayerId: string;
    teamOfTheSeasonPlayerIds: string[];
  }>({
    winnerTeamId: "",
    runnerUpTeamId: "",
    goldenBootPlayerId: "",
    goldenGlovePlayerId: "",
    goldenBallPlayerId: "",
    ballonDorPlayerId: "",
    teamOfTheSeasonPlayerIds: [],
  });
  
  // UI State
  const [activePlayerTeamId, setActivePlayerTeamId] = useState<string>("");
  const [playerSearch, setPlayerSearch] = useState("");
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [teamModalSearch, setTeamModalSearch] = useState("");
  const [selectedModalTeamIds, setSelectedModalTeamIds] = useState<string[]>([]);

  // Load draft
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.step) setStep(parsed.step);
        if (parsed.season) setSeason(parsed.season);
        if (parsed.seasonTeams) setSeasonTeams(parsed.seasonTeams);
        if (parsed.tournaments) setTournaments(parsed.tournaments);
        if (parsed.stats) setStats(parsed.stats);
        if (parsed.teamPlayers) setTeamPlayers(parsed.teamPlayers);
        if (parsed.awards) setAwards(parsed.awards);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  // Save draft
  useEffect(() => {
    if (!isInitialized) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ step, season, seasonTeams, tournaments, stats, teamPlayers, awards }));
    } catch (err) {
      console.error(err);
    }
  }, [step, season, seasonTeams, tournaments, stats, teamPlayers, awards, isInitialized]);

  const clearDraft = () => {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
  };

  const handleNext = () => setStep((s) => s + 1);
  const handlePrev = () => setStep((s) => s - 1);

  // --- Fetch Existing Season Data ---
  const handleSeasonSelect = async (val: string) => {
    if (val === "new") {
      setSeason({ id: "", name: "" });
      // Reset everything else
      setSeasonTeams([]);
      setTournaments([{ id: "t_1", name: "League", type: "LEAGUE", startDate: new Date().toISOString().split("T")[0], groupName: "" }]);
      setStats({});
      setTeamPlayers({});
      setAwards({ winnerTeamId: "", runnerUpTeamId: "", goldenBootPlayerId: "", goldenGlovePlayerId: "", goldenBallPlayerId: "", ballonDorPlayerId: "", teamOfTheSeasonPlayerIds: [] });
    } else {
      const s = initialSeasons.find(x => x.id === val);
      if (s) {
        setSeason({ id: s.id, name: s.name });
        setLoading(true);
        try {
          const res = await fetch(`/api/admin/historical-data/${s.id}`);
          if (res.ok) {
            const data = await res.json();
            if (data.seasonTeams) setSeasonTeams(data.seasonTeams);
            if (data.tournaments && data.tournaments.length > 0) setTournaments(data.tournaments);
            if (data.stats) setStats(data.stats);
            if (data.teamPlayers) setTeamPlayers(data.teamPlayers);
            if (data.awards) setAwards(prev => ({ ...prev, ...data.awards }));
          }
        } catch (e) {
          console.error("Failed to fetch season data", e);
        } finally {
          setLoading(false);
        }
      }
    }
  };

  // --- Helpers for Step 2: Teams ---
  const handleAddMultipleTeams = () => {
    const newTeams = selectedModalTeamIds.map(id => {
      const t = initialTeams.find(it => it.id === id);
      return {
        id: id,
        name: t?.name || "",
        managerName: t?.managerName || "",
        tempId: `tm_${Date.now()}_${id}`
      };
    });
    setSeasonTeams([...seasonTeams, ...newTeams]);
    setShowTeamModal(false);
    setSelectedModalTeamIds([]);
    setTeamModalSearch("");
  };

  const addTeam = () => {
    setSeasonTeams([...seasonTeams, { id: "", name: "", managerName: "", tempId: `tm_${Date.now()}` }]);
  };
  const removeTeam = (tempId: string) => {
    setSeasonTeams(seasonTeams.filter(t => t.tempId !== tempId));
    // Cleanup stats and players
    const newStats = { ...stats };
    Object.keys(newStats).forEach(key => {
      if (key.endsWith(`_${tempId}`)) delete newStats[key];
    });
    setStats(newStats);
    
    const newTeamPlayers = { ...teamPlayers };
    delete newTeamPlayers[tempId];
    setTeamPlayers(newTeamPlayers);
    
    if (activePlayerTeamId === tempId) setActivePlayerTeamId("");
  };
  const updateTeam = (tempId: string, field: string, value: string) => {
    setSeasonTeams(seasonTeams.map(t => {
      if (t.tempId === tempId) {
        const updated = { ...t, [field]: value };
        
        if (field === "id" && value !== "new" && value !== "") {
          const selected = initialTeams.find(it => it.id === value);
          if (selected) {
            updated.name = selected.name;
            updated.managerName = selected.managerName || "";
          }
        } else if (field === "managerName" || field === "name") {
          // If editing name or managerName, check if the combo exactly matches an existing team
          const matchedTeam = initialTeams.find(
            it => it.name.trim().toLowerCase() === updated.name.trim().toLowerCase() &&
                  (it.managerName || "").trim().toLowerCase() === updated.managerName.trim().toLowerCase()
          );
          if (matchedTeam) {
            // Revert back to the existing team ID
            updated.id = matchedTeam.id;
            updated.name = matchedTeam.name; // Keep correct capitalization
            updated.managerName = matchedTeam.managerName || "";
          } else {
            // Diverged, force creation of new team
            updated.id = "new";
          }
        }
        
        return updated;
      }
      return t;
    }));
  };

  // --- Helpers for Step 3: Tournaments ---
  const addTournament = () => {
    setTournaments([...tournaments, { id: `t_${Date.now()}`, name: "", type: "CUP", startDate: new Date().toISOString().split("T")[0], groupName: "" }]);
  };
  const removeTournament = (id: string) => {
    setTournaments(tournaments.filter(t => t.id !== id));
    const newStats = { ...stats };
    Object.keys(newStats).forEach(key => {
      if (key.startsWith(`${id}_`)) delete newStats[key];
    });
    setStats(newStats);
  };
  const updateTournament = (id: string, field: string, value: string) => {
    setTournaments(tournaments.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  // --- Helpers for Step 4: Stats ---
  const updateStat = (tournId: string, teamTempId: string, field: string, value: string) => {
    const key = `${tournId}_${teamTempId}`;
    const current = stats[key] || { played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 };
    setStats({
      ...stats,
      [key]: { ...current, [field]: Number(value) }
    });
  };

  // --- Helpers for Step 5: Players ---
  const togglePlayer = (playerId: string) => {
    if (!activePlayerTeamId) return;
    const current = teamPlayers[activePlayerTeamId] || [];
    const updated = current.includes(playerId) 
      ? current.filter(id => id !== playerId)
      : [...current, playerId];
    setTeamPlayers({ ...teamPlayers, [activePlayerTeamId]: updated });
  };
  const filteredPlayers = players.filter((p) => p.name.toLowerCase().includes(playerSearch.toLowerCase()));

  // --- Helpers for Step 6: Awards ---
  // Auto-calculate league winner based on points in LEAGUE tournaments
  useEffect(() => {
    if (step === 6) {
      const leagueT = tournaments.find(t => t.type === "LEAGUE");
      if (leagueT) {
        const teamPoints = seasonTeams.map(t => {
          const key = `${leagueT.id}_${t.tempId}`;
          const pts = stats[key]?.points || 0;
          return { tempId: t.tempId, points: pts };
        }).sort((a, b) => b.points - a.points);

        if (teamPoints.length > 0 && !awards.winnerTeamId) {
          setAwards(prev => ({ ...prev, winnerTeamId: teamPoints[0].tempId }));
        }
        if (teamPoints.length > 1 && !awards.runnerUpTeamId) {
          setAwards(prev => ({ ...prev, runnerUpTeamId: teamPoints[1].tempId }));
        }
      }
    }
  }, [step, tournaments, seasonTeams, stats, awards.winnerTeamId, awards.runnerUpTeamId]);

  // Aggregate all assigned players for awards dropdowns
  const assignedPlayerIds = useMemo(() => {
    const ids = new Set<string>();
    Object.values(teamPlayers).forEach(arr => arr.forEach(id => ids.add(id)));
    return Array.from(ids);
  }, [teamPlayers]);
  
  const assignedPlayersOptions = useMemo(() => {
    return assignedPlayerIds.map(id => {
      const p = players.find(x => x.id === id);
      return { value: id, label: p?.name || id };
    });
  }, [assignedPlayerIds, players]);

  // --- Submit ---
  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      const payload = { season, seasonTeams, tournaments, stats, teamPlayers, awards };
      const res = await fetch("/api/admin/historical-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save historical data");
      }
      clearDraft();
      router.push("/super-admin");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const teamOptions = [
    { value: "new", label: "+ Create New Team" },
    ...initialTeams.map(t => ({ value: t.id, label: t.name }))
  ];
  const seasonOptions = [
    { value: "new", label: "+ Create New Season" },
    ...initialSeasons.map(s => ({ value: s.id, label: `${s.name} (Season ${s.seasonNumber})` }))
  ];

  return (
    <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 sm:p-8">
      {/* Steps Indicator */}
      <div className="flex items-center justify-between mb-8 pb-8 border-b border-white/10 overflow-x-auto custom-scrollbar">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="flex items-center shrink-0">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg transition-colors ${step >= i ? "bg-gradient-to-r from-[#E8A800] to-[#FFB347] text-black" : "bg-white/10 text-gray-500"}`}>
              {i}
            </div>
            {i < 6 && <div className={`h-1 w-6 sm:w-12 mx-1 sm:mx-2 rounded ${step > i ? "bg-[#E8A800]" : "bg-white/10"}`} />}
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl">
          {error}
        </div>
      )}

      {/* STEP 1: Season */}
      {step === 1 && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-white mb-4">Step 1: Select Season</h2>
          <div className="space-y-4">
            <SearchableSelect
              label="Season"
              value={season.id || (season.name ? "new" : "")}
              options={seasonOptions}
              onChange={handleSeasonSelect}
              placeholder="Select a Season"
            />
            
            {season.id === "" && (season.name !== "" || initialSeasons.length === 0 || seasonOptions.length > 0) && (
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">New Season Name</label>
                <input
                  type="text"
                  placeholder="e.g. Season 1"
                  className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-[#E8A800]"
                  value={season.name}
                  onChange={(e) => setSeason({ ...season, name: e.target.value })}
                />
              </div>
            )}
            {loading && <p className="text-[#E8A800] text-sm animate-pulse">Loading existing season data...</p>}
          </div>
        </div>
      )}

      {/* STEP 2: Season Teams */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white">Step 2: Participating Teams</h2>
            <div className="flex gap-2">
              <button onClick={() => setShowTeamModal(true)} className="px-4 py-2 bg-[#E8A800]/20 text-[#E8A800] hover:bg-[#E8A800]/30 rounded-lg transition-colors text-sm font-medium">
                + Add Multiple Teams
              </button>
              <button onClick={addTeam} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors text-sm font-medium">
                + Add Team
              </button>
            </div>
          </div>
          
          <div className="space-y-4">
            {seasonTeams.map((t, index) => (
              <div key={t.tempId} className="p-4 bg-black/30 border border-white/10 rounded-xl flex flex-col sm:flex-row gap-4 items-start sm:items-end">
                <div className="flex-1 w-full">
                  <SearchableSelect
                    label={`Team ${index + 1}`}
                    value={t.id || (t.name ? "new" : "")}
                    options={teamOptions}
                    onChange={(val) => updateTeam(t.tempId, "id", val)}
                    placeholder="Select Team"
                  />
                  {(t.id === "" || t.id === "new") && (
                    <input
                      type="text"
                      placeholder="New Team Name"
                      className="mt-2 w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-[#E8A800] text-sm"
                      value={t.name}
                      onChange={(e) => updateTeam(t.tempId, "name", e.target.value)}
                    />
                  )}
                  <div className="mt-2">
                    {t.id && t.id !== "new" ? (
                      <span className="text-xs font-mono text-green-400 bg-green-400/10 px-2 py-1 rounded">ID: {t.id} (Existing)</span>
                    ) : (t.name || t.id === "new" ? (
                      <span className="text-xs font-mono text-blue-400 bg-blue-400/10 px-2 py-1 rounded">Will create new team</span>
                    ) : null)}
                  </div>
                </div>
                <div className="flex-1 w-full">
                  <label className="block text-xs sm:text-sm font-bold text-[#F5F0E8] mb-2">Manager Name</label>
                  <input
                    type="text"
                    placeholder="Manager"
                    className="w-full bg-black/50 border border-white/10 rounded-xl p-3 sm:py-3 py-2 text-white focus:outline-none focus:border-[#E8A800] text-sm"
                    value={t.managerName}
                    onChange={(e) => updateTeam(t.tempId, "managerName", e.target.value)}
                  />
                </div>
                <button onClick={() => removeTeam(t.tempId)} className="text-red-500 hover:bg-red-500/10 p-2 sm:p-3 rounded-lg mt-6">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
            {seasonTeams.length === 0 && <p className="text-gray-500 text-center py-8">No teams added yet. Add all teams that participated in this season.</p>}
          </div>
        </div>
      )}

      {/* STEP 3: Tournaments */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white">Step 3: Tournaments</h2>
            <button onClick={addTournament} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors text-sm font-medium">
              + Add Tournament
            </button>
          </div>
          
          {tournaments.map((t, index) => (
            <div key={t.id} className="p-4 bg-black/30 border border-white/10 rounded-xl space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-[#E8A800]">Tournament {index + 1}</h3>
                {tournaments.length > 1 && (
                  <button onClick={() => removeTournament(t.id)} className="text-red-500 hover:text-red-400 text-sm">Remove</button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Name</label>
                  <input type="text" className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-white text-sm" value={t.name} onChange={(e) => updateTournament(t.id, "name", e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Type</label>
                  <select className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-white text-sm" value={t.type} onChange={(e) => updateTournament(t.id, "type", e.target.value)}>
                    <option value="LEAGUE">League</option>
                    <option value="CUP">Cup</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Group (Optional)</label>
                  <input type="text" className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-white text-sm" value={t.groupName} onChange={(e) => updateTournament(t.id, "groupName", e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Start Date</label>
                  <input type="date" className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-white text-sm" value={t.startDate} onChange={(e) => updateTournament(t.id, "startDate", e.target.value)} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* STEP 4: Stats */}
      {step === 4 && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-white mb-4">Step 4: Team Stats</h2>
          <p className="text-gray-400 text-sm">Enter the final standings/stats for all teams in each tournament.</p>
          
          {tournaments.map((tourn, index) => (
            <div key={tourn.id} className="p-4 sm:p-6 bg-black/30 border border-white/10 rounded-xl overflow-x-auto">
              <h3 className="font-bold text-[#E8A800] mb-4">{tourn.name || `Tournament ${index + 1}`}</h3>
              <table className="w-full text-left min-w-[600px]">
                <thead>
                  <tr className="text-xs text-gray-400 border-b border-white/10">
                    <th className="py-2 px-2 font-medium">Team</th>
                    <th className="py-2 px-2 font-medium w-16 text-center">P</th>
                    <th className="py-2 px-2 font-medium w-16 text-center">W</th>
                    <th className="py-2 px-2 font-medium w-16 text-center">D</th>
                    <th className="py-2 px-2 font-medium w-16 text-center">L</th>
                    <th className="py-2 px-2 font-medium w-16 text-center">GF</th>
                    <th className="py-2 px-2 font-medium w-16 text-center">GA</th>
                    <th className="py-2 px-2 font-medium w-20 text-center">Pts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {seasonTeams.map(team => {
                    const key = `${tourn.id}_${team.tempId}`;
                    const currentStats = stats[key] || { played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 };
                    return (
                      <tr key={team.tempId}>
                        <td className="py-2 px-2 text-sm font-bold truncate max-w-[150px]">{team.name || "Unnamed"}</td>
                        {['played', 'won', 'drawn', 'lost', 'goalsFor', 'goalsAgainst', 'points'].map(field => (
                          <td key={field} className="py-2 px-1">
                            <input
                              type="number"
                              className={`w-full bg-black/50 border border-white/10 rounded text-center text-sm p-1 ${field === 'points' ? 'font-bold text-[#E8A800]' : 'text-white'} focus:border-[#E8A800] focus:outline-none`}
                              value={currentStats[field as keyof typeof currentStats]}
                              onChange={(e) => updateStat(tourn.id, team.tempId, field, e.target.value)}
                            />
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {/* STEP 5: Assign Players */}
      {step === 5 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white">Step 5: Assign Players</h2>
          </div>
          
          <div className="flex flex-col md:flex-row gap-6">
            <div className="md:w-1/3 bg-black/30 border border-white/10 rounded-xl p-2 h-[400px] overflow-y-auto">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-2 pt-2">Select Team to Assign</h3>
              {seasonTeams.map(t => (
                <button
                  key={t.tempId}
                  onClick={() => setActivePlayerTeamId(t.tempId)}
                  className={`w-full text-left px-4 py-3 rounded-lg mb-1 transition-colors flex justify-between items-center ${
                    activePlayerTeamId === t.tempId ? "bg-[#E8A800]/20 text-[#E8A800]" : "text-gray-300 hover:bg-white/5"
                  }`}
                >
                  <span className="font-bold truncate pr-2">{t.name || "Unnamed Team"}</span>
                  <span className="text-xs bg-black/50 px-2 py-1 rounded-full text-white shrink-0">
                    {(teamPlayers[t.tempId] || []).length} 
                  </span>
                </button>
              ))}
            </div>

            <div className="md:w-2/3 bg-black/30 border border-white/10 rounded-xl p-4 flex flex-col h-[400px]">
              {!activePlayerTeamId ? (
                <div className="flex-1 flex items-center justify-center text-gray-500">
                  Select a team on the left to assign players
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <input
                      type="text"
                      placeholder="Search players to assign..."
                      className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-[#E8A800]"
                      value={playerSearch}
                      onChange={(e) => setPlayerSearch(e.target.value)}
                    />
                  </div>
                  <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto pr-2 custom-scrollbar content-start">
                    {filteredPlayers.map((p) => {
                      const isSelected = (teamPlayers[activePlayerTeamId] || []).includes(p.id);
                      return (
                        <button
                          key={p.id}
                          onClick={() => togglePlayer(p.id)}
                          className={`flex flex-col items-center p-3 rounded-xl border text-center transition-all ${
                            isSelected ? "bg-[#E8A800]/10 border-[#E8A800] text-white" : "bg-white/5 border-transparent hover:bg-white/10 text-gray-400 hover:text-white"
                          }`}
                        >
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-800 mb-2 shrink-0">
                            {p.photoUrl ? (
                              <img src={p.photoUrl} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center font-bold text-xs">{p.name.substring(0,2).toUpperCase()}</div>
                            )}
                          </div>
                          <span className="text-xs font-medium line-clamp-2 leading-tight">{p.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STEP 6: Awards */}
      {step === 6 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white">Step 6: Season Awards</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 bg-black/30 border border-white/10 rounded-xl space-y-4">
              <h3 className="text-[#E8A800] font-bold border-b border-white/10 pb-2 mb-4">Team Awards</h3>
              
              <SearchableSelect
                label="🏆 League Winner"
                value={awards.winnerTeamId}
                options={[{value: "", label: "-- Select Winner --"}, ...seasonTeams.map(t => ({value: t.tempId, label: t.name}))]}
                onChange={(val) => setAwards({...awards, winnerTeamId: val})}
              />

              <SearchableSelect
                label="🥈 Runner Up"
                value={awards.runnerUpTeamId}
                options={[{value: "", label: "-- Select Runner Up --"}, ...seasonTeams.map(t => ({value: t.tempId, label: t.name}))]}
                onChange={(val) => setAwards({...awards, runnerUpTeamId: val})}
              />
            </div>
            
            <div className="p-6 bg-black/30 border border-white/10 rounded-xl space-y-4">
              <h3 className="text-[#E8A800] font-bold border-b border-white/10 pb-2 mb-4">Player Awards</h3>
              
              <SearchableSelect
                label="⚽ Golden Boot"
                value={awards.goldenBootPlayerId}
                options={[{value: "", label: "-- Select Golden Boot --"}, ...assignedPlayersOptions]}
                onChange={(val) => setAwards({...awards, goldenBootPlayerId: val})}
              />
              
              <SearchableSelect
                label="🧤 Golden Glove"
                value={awards.goldenGlovePlayerId}
                options={[{value: "", label: "-- Select Golden Glove --"}, ...assignedPlayersOptions]}
                onChange={(val) => setAwards({...awards, goldenGlovePlayerId: val})}
              />

              <SearchableSelect
                label="🌟 Golden Ball"
                value={awards.goldenBallPlayerId}
                options={[{value: "", label: "-- Select Golden Ball --"}, ...assignedPlayersOptions]}
                onChange={(val) => setAwards({...awards, goldenBallPlayerId: val})}
              />

              <SearchableSelect
                label="✨ Ballon d'Or"
                value={awards.ballonDorPlayerId}
                options={[{value: "", label: "-- Select Ballon d'Or --"}, ...assignedPlayersOptions]}
                onChange={(val) => setAwards({...awards, ballonDorPlayerId: val})}
              />
            </div>
            
            <div className="p-6 bg-black/30 border border-white/10 rounded-xl space-y-4 md:col-span-2">
              <h3 className="text-[#E8A800] font-bold border-b border-white/10 pb-2 mb-4">Team of the Season</h3>
              <p className="text-xs text-gray-400 mb-2">Select the players that made it into the Team of the Season.</p>
              
              <div className="flex flex-wrap gap-2 mb-4">
                {awards.teamOfTheSeasonPlayerIds.map(pid => {
                  const p = players.find(x => x.id === pid);
                  return (
                    <div key={pid} className="bg-[#E8A800]/20 text-[#E8A800] text-sm px-3 py-1 rounded-full flex items-center gap-2">
                      {p?.name || pid}
                      <button onClick={() => setAwards({...awards, teamOfTheSeasonPlayerIds: awards.teamOfTheSeasonPlayerIds.filter(x => x !== pid)})} className="hover:text-white">&times;</button>
                    </div>
                  );
                })}
              </div>

              <SearchableSelect
                value=""
                options={[{value: "", label: "-- Add Player to TOTS --"}, ...assignedPlayersOptions.filter(opt => !awards.teamOfTheSeasonPlayerIds.includes(opt.value))]}
                onChange={(val) => {
                  if (val && !awards.teamOfTheSeasonPlayerIds.includes(val)) {
                    setAwards({...awards, teamOfTheSeasonPlayerIds: [...awards.teamOfTheSeasonPlayerIds, val]});
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Navigation Controls */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/10">
        <button
          onClick={handlePrev}
          disabled={step === 1 || loading}
          className="px-6 py-3 rounded-xl font-bold text-gray-400 hover:text-white hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Back
        </button>
        
        {step < 6 ? (
          <button
            onClick={handleNext}
            disabled={
              (step === 1 && (!season.id && !season.name)) ||
              (step === 2 && (seasonTeams.length === 0 || seasonTeams.some(t => (!t.id && !t.name) || !t.managerName))) ||
              (step === 3 && tournaments.some(t => !t.name))
            }
            className="px-8 py-3 bg-white text-black rounded-xl font-black hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Continue
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={loading || seasonTeams.length === 0}
            className="px-8 py-3 bg-gradient-to-r from-[#E8A800] to-[#FFB347] text-black rounded-xl font-black hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-[#E8A800]/20 flex items-center gap-2"
          >
            {loading ? "Saving..." : "Save Historical Data"}
          </button>
        )}
      </div>

      {/* Multi-Team Modal */}
      {showTeamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-2xl flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-white/10 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">Select Multiple Teams</h3>
              <button onClick={() => setShowTeamModal(false)} className="text-gray-400 hover:text-white">&times;</button>
            </div>
            <div className="p-6 border-b border-white/10">
              <input
                type="text"
                placeholder="Search teams..."
                className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-[#E8A800]"
                value={teamModalSearch}
                onChange={(e) => setTeamModalSearch(e.target.value)}
              />
            </div>
            <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {initialTeams
                  .filter(t => t.name.toLowerCase().includes(teamModalSearch.toLowerCase()))
                  .filter(t => !seasonTeams.some(st => st.id === t.id))
                  .map(t => {
                    const isSelected = selectedModalTeamIds.includes(t.id);
                    return (
                      <button
                        key={t.id}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedModalTeamIds(prev => prev.filter(id => id !== t.id));
                          } else {
                            setSelectedModalTeamIds(prev => [...prev, t.id]);
                          }
                        }}
                        className={`p-3 rounded-xl border text-left transition-all flex items-center gap-3 ${
                          isSelected ? "bg-[#E8A800]/10 border-[#E8A800] text-white" : "bg-white/5 border-transparent hover:bg-white/10 text-gray-400 hover:text-white"
                        }`}
                      >
                        <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${isSelected ? "border-[#E8A800] bg-[#E8A800]" : "border-gray-500"}`}>
                          {isSelected && <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                        </div>
                        <span className="font-medium truncate">{t.name}</span>
                      </button>
                    );
                  })}
              </div>
            </div>
            <div className="p-6 border-t border-white/10 flex justify-end gap-3">
              <button onClick={() => setShowTeamModal(false)} className="px-6 py-2 rounded-xl text-gray-400 hover:text-white">Cancel</button>
              <button onClick={handleAddMultipleTeams} disabled={selectedModalTeamIds.length === 0} className="px-6 py-2 bg-[#E8A800] text-black rounded-xl font-bold disabled:opacity-50 hover:bg-[#FFB347]">
                Add {selectedModalTeamIds.length} Teams
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
