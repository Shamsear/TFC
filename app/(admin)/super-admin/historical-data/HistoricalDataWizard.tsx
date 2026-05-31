"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import SearchableSelect from "@/components/ui/SearchableSelect";
import * as XLSX from "xlsx";
import { getPhotoUrlFromDb } from "@/lib/image-cdn";

interface SeasonalPlayerStat {
  seasonId: string;
  position: string;
  overallRating: number;
}

interface BaseData {
  id: string;
  name: string;
  seasonNumber?: number;
  managerName?: string;
  photoUrl?: string;
  seasonId?: string;
  startingPurse?: number;
  normalized_name?: string | null;
  seasonalPlayerStats?: SeasonalPlayerStat[];
}

interface HistoricalDataWizardProps {
  initialSeasons: BaseData[];
  initialTeams: BaseData[];
  players: BaseData[];
  initialManagers?: any[];
  initialTournaments?: BaseData[];
}

const STORAGE_KEY = "tfc_historical_wizard_bulk";

export default function HistoricalDataWizard({
  initialSeasons,
  initialTeams,
  players,
  initialManagers = [],
  initialTournaments = [],
}: HistoricalDataWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ status: 'idle' | 'saving' | 'saved' | 'error', message: string, logs?: string[] }>({ status: 'idle', message: '' });

  // Form State
  const [season, setSeason] = useState({ id: "", name: "", startingPurse: 0 });
  const [seasonTeams, setSeasonTeams] = useState<{ id: string; name: string; managerName: string; tempId: string; isNewManager: boolean; originalName?: string }[]>([]);
  const [tournaments, setTournaments] = useState<{ id: string; name: string; type: string; startDate: string; groupName: string }[]>([
    { id: "t_1", name: "League", type: "LEAGUE_ONLY", startDate: new Date().toISOString().split("T")[0], groupName: "" }
  ]);
  const [stats, setStats] = useState<Record<string, { played: number, won: number, drawn: number, lost: number, goalsFor: number, goalsAgainst: number, points: number }>>({});
  const [teamPlayers, setTeamPlayers] = useState<Record<string, { id: string; price: number }[]>>({});
  const [missingPlayers, setMissingPlayers] = useState<string[]>([]);
  const [activeTournTeams, setActiveTournTeams] = useState<Record<string, string[]>>({});
  const [excelTeamNames, setExcelTeamNames] = useState<Record<string, string>>({});
  
  // Helpers for Step 4: Stats Add/Remove teams per tournament
  const getTournTeams = (tournId: string) => {
    return activeTournTeams[tournId] || [];
  };

  const handleRemoveTeamFromTourn = (tournId: string, teamTempId: string) => {
    const current = getTournTeams(tournId);
    const updated = current.filter(id => id !== teamTempId);
    setActiveTournTeams({
      ...activeTournTeams,
      [tournId]: updated
    });
    const newStats = { ...stats };
    delete newStats[`${tournId}_${teamTempId}`];
    setStats(newStats);
    
    // Also remove from excel names if it exists
    if (excelTeamNames[teamTempId]) {
      const newNames = { ...excelTeamNames };
      delete newNames[teamTempId];
      setExcelTeamNames(newNames);
    }
    setDirtyTournaments(prev => ({ ...prev, [tournId]: true }));
  };

  const handleAddTeamToTourn = (tournId: string, teamTempId: string) => {
    const current = getTournTeams(tournId);
    if (!current.includes(teamTempId)) {
      setActiveTournTeams({
        ...activeTournTeams,
        [tournId]: [...current, teamTempId]
      });
      const key = `${tournId}_${teamTempId}`;
      if (!stats[key]) {
        setStats({
          ...stats,
          [key]: { played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 }
        });
      }
      setDirtyTournaments(prev => ({ ...prev, [tournId]: true }));
    }
  };
  
  const resolveUnmappedTeam = (tournId: string, oldTempId: string, newTeamTempId: string) => {
    if (!newTeamTempId) return; // Do nothing if empty selection
    
    // Replace in activeTournTeams
    const currentTeams = getTournTeams(tournId);
    const updatedTeams = currentTeams.map(id => id === oldTempId ? newTeamTempId : id);
    setActiveTournTeams(prev => ({ ...prev, [tournId]: updatedTeams }));
    
    // Replace in stats
    const oldKey = `${tournId}_${oldTempId}`;
    const newKey = `${tournId}_${newTeamTempId}`;
    
    setStats(prev => {
      const newStats = { ...prev };
      if (newStats[oldKey]) {
        newStats[newKey] = newStats[oldKey];
        delete newStats[oldKey];
      }
      return newStats;
    });
    
    // Transfer excel name to new real ID
    setExcelTeamNames(prev => {
      const newNames = { ...prev };
      if (newNames[oldTempId]) {
        newNames[newTeamTempId] = newNames[oldTempId];
        delete newNames[oldTempId];
      }
      return newNames;
    });
    setDirtyTournaments(prev => ({ ...prev, [tournId]: true }));
  };
  
  // Awards State
  const [awards, setAwards] = useState<{
    winnerTeamId: string;
    runnerUpTeamId: string;
    goldenBootTeamId: string;
    goldenGloveTeamId: string;
    goldenBallTeamId?: string;
    ballonDorTeamId: string;
    teamOfTheSeasonPlayerIds: string[];
    tournamentAwards: Record<string, { winnerTeamId: string; runnerUpTeamId: string }>;
  }>({
    winnerTeamId: "",
    runnerUpTeamId: "",
    goldenBootTeamId: "",
    goldenGloveTeamId: "",
    goldenBallTeamId: "",
    ballonDorTeamId: "",
    teamOfTheSeasonPlayerIds: [],
    tournamentAwards: {},
  });
  
  // UI State
  const [activePlayerTeamId, setActivePlayerTeamId] = useState<string>("");
  const [playerSearch, setPlayerSearch] = useState("");
  const [playerPage, setPlayerPage] = useState(1);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [teamModalSearch, setTeamModalSearch] = useState("");
  const [selectedModalTeamIds, setSelectedModalTeamIds] = useState<string[]>([]);
  const [teamSaveStatus, setTeamSaveStatus] = useState<Record<string, { status: 'idle' | 'saving' | 'saved' | 'error', message: string }>>({});
  const [dirtyTeams, setDirtyTeams] = useState<Record<string, boolean>>({});
  const [tournSaveStatus, setTournSaveStatus] = useState<Record<string, { status: 'idle' | 'saving' | 'saved' | 'error', message: string }>>({});
  const [dirtyTournaments, setDirtyTournaments] = useState<Record<string, boolean>>({});
  const [teamSearch, setTeamSearch] = useState("");
  const [activeTab, setActiveTab] = useState<'teams' | 'search' | 'roster'>('teams');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load draft
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.step) setStep(parsed.step);
        if (parsed.season) {
          const s = parsed.season;
          if (s.startingPurse === 10000) s.startingPurse = 20000;
          setSeason(s);
        }
        if (parsed.seasonTeams) setSeasonTeams(parsed.seasonTeams);
        if (parsed.tournaments) setTournaments(parsed.tournaments);
        if (parsed.stats) setStats(parsed.stats);
        if (parsed.teamPlayers) setTeamPlayers(parsed.teamPlayers);
        if (parsed.awards) {
          setAwards({
            winnerTeamId: parsed.awards.winnerTeamId || "",
            runnerUpTeamId: parsed.awards.runnerUpTeamId || "",
            goldenBootTeamId: parsed.awards.goldenBootTeamId || "",
            goldenGloveTeamId: parsed.awards.goldenGloveTeamId || "",
            goldenBallTeamId: parsed.awards.goldenBallTeamId || "",
            ballonDorTeamId: parsed.awards.ballonDorTeamId || "",
            teamOfTheSeasonPlayerIds: parsed.awards.teamOfTheSeasonPlayerIds || [],
            tournamentAwards: parsed.awards.tournamentAwards || {},
          });
        }
        if (parsed.activeTournTeams) setActiveTournTeams(parsed.activeTournTeams);
        if (parsed.excelTeamNames) setExcelTeamNames(parsed.excelTeamNames);
        else if (parsed.unmappedStatTeams) setExcelTeamNames(parsed.unmappedStatTeams); // Fallback for backwards compat
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ step, season, seasonTeams, tournaments, stats, teamPlayers, awards, activeTournTeams, excelTeamNames }));
    } catch (err) {
      console.error(err);
    }
  }, [step, season, seasonTeams, tournaments, stats, teamPlayers, awards, activeTournTeams, excelTeamNames, isInitialized]);

  const clearDraft = () => {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    setActiveTournTeams({});
    setExcelTeamNames({});
  };

  const autoSave = async () => {
    setSaveStatus({ status: 'saving', message: 'Saving progress to database...' });
    try {
      const payload: any = { season };
      if (step >= 2) payload.seasonTeams = seasonTeams;
      if (step >= 3) {
        payload.tournaments = tournaments;
        payload.activeTournTeams = activeTournTeams;
      }
      if (step >= 4) payload.stats = stats;
      if (step >= 5) payload.awards = awards;
      if (step >= 6) payload.teamPlayers = teamPlayers;
      const res = await fetch("/api/admin/historical-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.details || errData.error || "Failed to auto-save");
      }
      
      const data = await res.json();
      
      if (data.seasonId && !season.id) {
        setSeason(s => ({ ...s, id: data.seasonId }));
      }
      
      const fetchId = data.seasonId || season.id;
      if (fetchId && step >= 1) { 
        // Always sync seasonTeams to ensure we have real database IDs instead of tempIds
        const getRes = await fetch(`/api/admin/historical-data/${fetchId}`);
        if (getRes.ok) {
          const syncData = await getRes.json();
          if (syncData.seasonTeams && syncData.seasonTeams.length > 0) setSeasonTeams(syncData.seasonTeams);
          if (syncData.activeTournTeams && Object.keys(syncData.activeTournTeams).length > 0) setActiveTournTeams(syncData.activeTournTeams);
          if (syncData.tournaments && syncData.tournaments.length > 0) setTournaments(syncData.tournaments);
        }
      }
      let msg = '✓ Progress saved';
      if (data.saved) {
        const parts = [];
        if (data.saved.season) parts.push('Season');
        if (data.saved.teams) parts.push(`${data.saved.teams} Teams`);
        if (data.saved.tournaments) parts.push(`${data.saved.tournaments} Tournaments`);
        if (data.saved.stats) parts.push(`${data.saved.stats} Stats`);
        if (data.saved.players) parts.push(`${data.saved.players} Squads`);
        if (data.saved.awards) parts.push(`${data.saved.awards} Awards`);
        if (parts.length > 0) msg += ` (${parts.join(', ')})`;
      }

      setSaveStatus({ status: 'saved', message: msg, logs: data.logs });
      setTimeout(() => setSaveStatus({ status: 'idle', message: '' }), 8000);
    } catch (err: any) {
      console.error(err);
      setSaveStatus({ status: 'error', message: err.message || 'Auto-save failed' });
    }
  };

  const handleNext = async () => {
    setIsSaving(true);
    await autoSave();
    setIsSaving(false);
    setStep((s) => s + 1);
  };
  
  const handlePrev = () => setStep((s) => s - 1);

  // --- Fetch Existing Season Data ---
  const handleSeasonSelect = async (val: string) => {
    if (val === "new") {
      setSeason({ id: "", name: "", startingPurse: 20000 });
      // Reset everything else
      setSeasonTeams([]);
      setTournaments([{ id: "t_1", name: "League", type: "LEAGUE_ONLY", startDate: new Date().toISOString().split("T")[0], groupName: "" }]);
      setStats({});
      setTeamPlayers({});
      setActiveTournTeams({});
      setExcelTeamNames({});
      setAwards({ winnerTeamId: "", runnerUpTeamId: "", goldenBootTeamId: "", goldenGloveTeamId: "", goldenBallTeamId: "", ballonDorTeamId: "", teamOfTheSeasonPlayerIds: [], tournamentAwards: {} });
      setStep(1);
    } else {
      const s = initialSeasons.find(x => x.id === val);
      if (s) {
        setSeason({ id: s.id, name: s.name, startingPurse: s.startingPurse === 10000 ? 20000 : (s.startingPurse || 20000) });
        setLoading(true);
        try {
          const res = await fetch(`/api/admin/historical-data/${s.id}`);
          if (res.ok) {
            const data = await res.json();
            if (data.seasonTeams) setSeasonTeams(data.seasonTeams);
            if (data.tournaments && data.tournaments.length > 0) setTournaments(data.tournaments);
            if (data.stats) {
              setStats(data.stats);
            }
            if (data.activeTournTeams) {
              setActiveTournTeams(data.activeTournTeams);
            } else if (data.stats) {
              // Fallback for older DB records before this fix
              const prePopulated: Record<string, string[]> = {};
              Object.keys(data.stats).forEach(key => {
                if (key.includes("_tm_")) {
                  const [tournId, suffix] = key.split("_tm_");
                  const teamTempId = "tm_" + suffix;
                  if (!prePopulated[tournId]) prePopulated[tournId] = [];
                  if (!prePopulated[tournId].includes(teamTempId)) {
                    prePopulated[tournId].push(teamTempId);
                  }
                }
              });
              setActiveTournTeams(prePopulated);
            }
            if (data.teamPlayers) setTeamPlayers(data.teamPlayers);
            if (data.awards) {
              setAwards({
                winnerTeamId: data.awards.winnerTeamId || "",
                runnerUpTeamId: data.awards.runnerUpTeamId || "",
                goldenBootTeamId: data.awards.goldenBootTeamId || "",
                goldenGloveTeamId: data.awards.goldenGloveTeamId || "",
                goldenBallTeamId: data.awards.goldenBallTeamId || "",
                ballonDorTeamId: data.awards.ballonDorTeamId || "",
                teamOfTheSeasonPlayerIds: data.awards.teamOfTheSeasonPlayerIds || [],
                tournamentAwards: data.awards.tournamentAwards || {},
              });
            }
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
        tempId: `tm_${Date.now()}_${id}`,
        isNewManager: !initialManagers.some(m => m.name.toLowerCase() === (t?.managerName || "").trim().toLowerCase())
      };
    });
    setSeasonTeams([...seasonTeams, ...newTeams]);
    setShowTeamModal(false);
    setSelectedModalTeamIds([]);
    setTeamModalSearch("");
  };

  const addTeam = () => {
    setSeasonTeams([...seasonTeams, { id: "", name: "", managerName: "", tempId: `tm_${Date.now()}`, isNewManager: true }]);
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
  const updateTeam = (tempId: string, field: string, value: any) => {
    setSeasonTeams(seasonTeams.map(t => {
      if (t.tempId === tempId) {
        let updated = { ...t };
        
        if (field === "managerName" && value === "new") {
          updated.isNewManager = true;
          updated.managerName = "";
          updated.id = "new";
        } else {
          updated = { ...updated, [field]: value };
          
          if (field === "id" && value !== "new" && value !== "") {
            const selected = initialTeams.find(it => it.id === value);
            if (selected) {
              updated.name = selected.name;
              updated.managerName = selected.managerName || "";
              updated.isNewManager = !initialManagers.some(m => m.name.toLowerCase() === updated.managerName.trim().toLowerCase());
            }
          } else if (field === "managerName" || field === "name") {
            if (field === "managerName") {
              updated.isNewManager = !initialManagers.some(m => m.name.toLowerCase() === value.trim().toLowerCase());
            }
            
            const matchedTeam = initialTeams.find(
              it => it.name.trim().toLowerCase() === updated.name.trim().toLowerCase() &&
                    (it.managerName || "").trim().toLowerCase() === updated.managerName.trim().toLowerCase()
            );
            if (matchedTeam) {
              updated.id = matchedTeam.id;
              updated.name = matchedTeam.name;
              updated.managerName = matchedTeam.managerName || "";
            } else {
              updated.id = "new";
            }
          }
        }
        
        return updated;
      }
      return t;
    }));
  };

  // --- Helpers for Step 3: Tournaments ---
  const addTournament = () => {
    const newId = `t_${Date.now()}`;
    setTournaments([...tournaments, { id: newId, name: "", type: "KNOCKOUT_ONLY", startDate: new Date().toISOString().split("T")[0], groupName: "" }]);
    // Default manual tournaments to empty active teams to force user to add them
    setActiveTournTeams(prev => ({ ...prev, [newId]: [] }));
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
    setDirtyTournaments(prev => ({ ...prev, [tournId]: true }));
  };

  // --- Helpers for Step 5: Players ---
  const playerAssignments = useMemo(() => {
    const map: Record<string, { teamTempId: string; teamName: string }> = {};
    for (const team of seasonTeams) {
      const roster = teamPlayers[team.tempId] || [];
      for (const p of roster) {
        map[p.id] = { teamTempId: team.tempId, teamName: team.name || "Unnamed Team" };
      }
    }
    return map;
  }, [seasonTeams, teamPlayers]);

  const handlePlayerAddOrTransfer = (p: BaseData) => {
    if (!activePlayerTeamId) return;

    // Check if player is already in another team
    const assigned = playerAssignments[p.id];

    if (assigned && assigned.teamTempId !== activePlayerTeamId) {
      const confirmTransfer = window.confirm(
        `Player "${p.name}" is currently assigned to "${assigned.teamName}".\n\nDo you want to transfer them to "${seasonTeams.find(t => t.tempId === activePlayerTeamId)?.name || "this team"}"?`
      );
      if (!confirmTransfer) return;

      // Remove from old team
      const oldRoster = teamPlayers[assigned.teamTempId] || [];
      const oldPlayerObj = oldRoster.find(x => x.id === p.id);
      const updatedOldRoster = oldRoster.filter(x => x.id !== p.id);

      // Add to new team
      const current = teamPlayers[activePlayerTeamId] || [];
      const updatedNewRoster = [...current, { id: p.id, price: oldPlayerObj?.price || 0 }];

      setTeamPlayers({
        ...teamPlayers,
        [assigned.teamTempId]: updatedOldRoster,
        [activePlayerTeamId]: updatedNewRoster
      });
      setDirtyTeams(prev => ({ ...prev, [assigned.teamTempId]: true, [activePlayerTeamId]: true }));
    } else {
      // Normal toggle
      const current = teamPlayers[activePlayerTeamId] || [];
      const exists = current.some(tp => tp.id === p.id);
      const updated = exists
        ? current.filter(tp => tp.id !== p.id)
        : [...current, { id: p.id, price: 0 }];
      setTeamPlayers({ ...teamPlayers, [activePlayerTeamId]: updated });
      setDirtyTeams(prev => ({ ...prev, [activePlayerTeamId]: true }));
    }
  };

  const handleRemovePlayer = (playerId: string) => {
    if (!activePlayerTeamId) return;
    const current = teamPlayers[activePlayerTeamId] || [];
    const updated = current.filter(p => p.id !== playerId);
    setTeamPlayers({ ...teamPlayers, [activePlayerTeamId]: updated });
    setDirtyTeams(prev => ({ ...prev, [activePlayerTeamId]: true }));
  };

  const updatePlayerPrice = (playerId: string, priceStr: string) => {
    if (!activePlayerTeamId) return;
    const price = parseInt(priceStr) || 0;
    const current = teamPlayers[activePlayerTeamId] || [];
    const updated = current.map(p => p.id === playerId ? { ...p, price } : p);
    setTeamPlayers({ ...teamPlayers, [activePlayerTeamId]: updated });
    setDirtyTeams(prev => ({ ...prev, [activePlayerTeamId]: true }));
  };

  const handleSaveTeamRoster = async (teamTempId: string) => {
    const team = seasonTeams.find(t => t.tempId === teamTempId);
    if (!team) return;

    if (!season.id) {
      setError("Please save the Season in Step 1 (or Step 2) first before saving rosters.");
      return;
    }

    if (!team.id || team.id === "new") {
      setError("This team has not been registered in the database yet. Please click 'Save & Continue' in Step 2 to save all teams first.");
      return;
    }

    setTeamSaveStatus(prev => ({
      ...prev,
      [teamTempId]: { status: 'saving', message: 'Saving roster...' }
    }));

    try {
      const roster = teamPlayers[teamTempId] || [];
      const res = await fetch("/api/admin/historical-data/save-team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seasonId: season.id,
          teamId: team.id,
          players: roster,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.details || errData.error || "Failed to save team roster");
      }

      const data = await res.json();
      setTeamSaveStatus(prev => ({
        ...prev,
        [teamTempId]: { status: 'saved', message: 'Squad synced successfully!' }
      }));

      // Mark as clean
      setDirtyTeams(prev => ({ ...prev, [teamTempId]: false }));

      // Auto-clear message after 4 seconds
      setTimeout(() => {
        setTeamSaveStatus(prev => {
          const next = { ...prev };
          delete next[teamTempId];
          return next;
        });
      }, 4000);
    } catch (err: any) {
      console.error(err);
      setTeamSaveStatus(prev => ({
        ...prev,
        [teamTempId]: { status: 'error', message: err.message || 'Save failed' }
      }));
    }
  };

  const handleSaveTournamentStats = async (tournId: string) => {
    if (!season.id) {
      setError("Please save the Season in Step 1 first.");
      return;
    }

    setTournSaveStatus(prev => ({
      ...prev,
      [tournId]: { status: 'saving', message: 'Saving tournament standings...' }
    }));

    try {
      const activeTeams = activeTournTeams[tournId] || [];
      const tournStats: Record<string, any> = {};
      
      // Filter stats for this tournament
      Object.entries(stats).forEach(([key, value]) => {
        if (key.startsWith(`${tournId}_`)) {
          tournStats[key] = value;
        }
      });

      const res = await fetch("/api/admin/historical-data/save-tournament", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seasonId: season.id,
          tournamentId: tournId,
          activeTeams,
          stats: tournStats,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.details || errData.error || "Failed to save tournament stats");
      }

      setTournSaveStatus(prev => ({
        ...prev,
        [tournId]: { status: 'saved', message: 'Standings synced successfully!' }
      }));

      // Mark as clean
      setDirtyTournaments(prev => ({ ...prev, [tournId]: false }));

      // Clear status message after 4 seconds
      setTimeout(() => {
        setTournSaveStatus(prev => {
          const next = { ...prev };
          delete next[tournId];
          return next;
        });
      }, 4000);
    } catch (err: any) {
      console.error(err);
      setTournSaveStatus(prev => ({
        ...prev,
        [tournId]: { status: 'error', message: err.message || 'Save failed' }
      }));
    }
  };

  useEffect(() => {
    setPlayerPage(1);
  }, [playerSearch, activePlayerTeamId]);

  const getPlayerDetails = (p: BaseData, activeSeasonId: string) => {
    const stats = p.seasonalPlayerStats || [];
    const active = stats.find(s => s.seasonId === activeSeasonId);
    if (active) {
      return { position: active.position, rating: active.overallRating };
    }
    if (stats.length > 0) {
      const best = [...stats].sort((a, b) => b.overallRating - a.overallRating)[0];
      return { position: best.position, rating: best.overallRating };
    }
    return { position: "N/A", rating: 0 };
  };

  const filteredPlayers = useMemo(() => {
    const search = playerSearch.toLowerCase();
    const list = players.filter((p) => {
      return (
        p.name.toLowerCase().includes(search) ||
        (p.normalized_name || "").toLowerCase().includes(search)
      );
    });

    return list.sort((a, b) => {
      const detailsA = getPlayerDetails(a, season.id);
      const detailsB = getPlayerDetails(b, season.id);
      if (detailsB.rating !== detailsA.rating) {
        return detailsB.rating - detailsA.rating;
      }
      return a.name.localeCompare(b.name);
    });
  }, [players, playerSearch, season.id]);
  const ITEMS_PER_PAGE = 48;
  const totalPlayerPages = Math.ceil(filteredPlayers.length / ITEMS_PER_PAGE);
  const paginatedPlayers = filteredPlayers.slice((playerPage - 1) * ITEMS_PER_PAGE, playerPage * ITEMS_PER_PAGE);

  // --- Helpers for Step 6: Awards ---
  // Auto-calculate league winner based on points in LEAGUE tournaments
  useEffect(() => {
    if (step === 5) {
      const leagueT = tournaments.find(t => t.type === "LEAGUE_ONLY" || t.type === "LEAGUE_PLAYOFF");
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

  // Aggregate combined stats across all tournaments for award suggestions
  const combinedTeamStats = useMemo(() => {
    const totals: Record<string, { tempId: string; name: string; played: number; won: number; drawn: number; lost: number; goalsFor: number; goalsAgainst: number; points: number }> = {};
    
    for (const team of seasonTeams) {
      totals[team.tempId] = {
        tempId: team.tempId,
        name: team.name || "Unnamed",
        played: 0, won: 0, drawn: 0, lost: 0,
        goalsFor: 0, goalsAgainst: 0, points: 0
      };
    }
    
    for (const [key, s] of Object.entries(stats)) {
      let teamTempId = "";
      if (key.includes("_tm_")) {
        teamTempId = "tm_" + key.split("_tm_")[1];
      } else {
        teamTempId = key.split("_").pop() || "";
      }
      if (totals[teamTempId]) {
        totals[teamTempId].played += s.played || 0;
        totals[teamTempId].won += s.won || 0;
        totals[teamTempId].drawn += s.drawn || 0;
        totals[teamTempId].lost += s.lost || 0;
        totals[teamTempId].goalsFor += s.goalsFor || 0;
        totals[teamTempId].goalsAgainst += s.goalsAgainst || 0;
        totals[teamTempId].points += s.points || 0;
      }
    }
    
    return Object.values(totals);
  }, [seasonTeams, stats]);

  // Sorted suggestions for Golden Boot (most goals scored) and Golden Glove (fewest goals conceded)
  const goldenBootSuggestions = useMemo(() => 
    [...combinedTeamStats].sort((a, b) => b.goalsFor - a.goalsFor), 
    [combinedTeamStats]
  );

  const goldenGloveSuggestions = useMemo(() => 
    [...combinedTeamStats].filter(t => t.played > 0).sort((a, b) => a.goalsAgainst - b.goalsAgainst), 
    [combinedTeamStats]
  );

  const teamAwardOptions = useMemo(() => {
    return seasonTeams.map(t => ({ value: t.tempId, label: t.name || "Unnamed" }));
  }, [seasonTeams]);

  // --- Submit ---
  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      const payload = { season, seasonTeams, tournaments, activeTournTeams, stats, teamPlayers, awards };
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

  // --- Excel / CSV Template Export ---
  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new();

    // 1. Teams Sheet
    const teamsData = [
      ["Team Name", "Manager Name"],
      ["Red Devils", "John Doe"],
      ["Blue Eagles", "Jane Smith"]
    ];
    const wsTeams = XLSX.utils.aoa_to_sheet(teamsData);
    XLSX.utils.book_append_sheet(wb, wsTeams, "Teams");

    // 2. Tournaments Sheet
    const tournamentsData = [
      ["Tournament Name", "Type", "Start Date", "Group (Optional)"],
      ["Premier League", "LEAGUE_ONLY", "2023-08-01", ""],
      ["Champions Cup", "LEAGUE_PLAYOFF", "2023-09-01", ""],
      ["World Cup", "GROUP_KNOCKOUT", "2023-11-01", "Group A"],
      ["FA Cup", "KNOCKOUT_ONLY", "2023-09-01", ""],
      ["", "", "", ""],
      ["--- Valid Types ---", "", "", ""],
      ["LEAGUE_ONLY", "League table only (no knockout stage)", "", ""],
      ["LEAGUE_PLAYOFF", "League stage + knockout playoffs after", "", ""],
      ["GROUP_KNOCKOUT", "Group stage tables + knockout stage after", "", ""],
      ["KNOCKOUT_ONLY", "Pure knockout bracket (no stats sheet needed)", "", ""],
    ];
    const wsTournaments = XLSX.utils.aoa_to_sheet(tournamentsData);
    XLSX.utils.book_append_sheet(wb, wsTournaments, "Tournaments");

    // 3. Stats Sheets (one per tournament that has a league/group stage)
    const statsData = [
      ["Team Name", "P", "MP", "W", "D", "L", "F", "A", "GD", "%"],
      ["Red Devils", 80, 38, 25, 5, 8, 70, 30, 40, "65%"],
      ["Blue Eagles", 70, 38, 20, 10, 8, 60, 40, 20, "52%"],
      ["", "", "", "", "", "", "", "", "", ""],
      ["NOTE: This sheet is for the league/group stage standings only."],
      ["Knockout results should be entered via the match fixtures UI."],
    ];
    const wsStats = XLSX.utils.aoa_to_sheet(statsData);
    XLSX.utils.book_append_sheet(wb, wsStats, "Stats - Premier League");

    // Example stats sheet for group knockout
    const groupStatsData = [
      ["Team Name", "P", "MP", "W", "D", "L", "F", "A", "GD", "%"],
      ["Red Devils", 9, 3, 3, 0, 0, 7, 1, 6, "100%"],
      ["Blue Eagles", 6, 3, 2, 0, 1, 5, 3, 2, "66%"],
      ["", "", "", "", "", "", "", "", "", ""],
      ["NOTE: Only group stage standings go here."],
      ["Knockout stage matches are entered separately."],
    ];
    const wsGroupStats = XLSX.utils.aoa_to_sheet(groupStatsData);
    XLSX.utils.book_append_sheet(wb, wsGroupStats, "Stats - World Cup");

    // 4. Squads Sheet (Step 5)
    const squadsData: any[][] = [
      ["Team Name", "Player Name", "Price"],
    ];
    
    // Generate 30 example teams with 25 players each
    for (let i = 1; i <= 30; i++) {
      const teamName = `Example Team ${i}`;
      for (let j = 1; j <= 25; j++) {
        squadsData.push([teamName, `Player ${j} of Team ${i}`, Math.floor(Math.random() * 900) + 10]);
      }
    }
    
    squadsData.push(["", ""]);
    squadsData.push(["NOTE: Players must already exist in the global Players database.", ""]);
    squadsData.push(["Match player names exactly as they appear in the system.", ""]);
    
    const wsSquads = XLSX.utils.aoa_to_sheet(squadsData);
    XLSX.utils.book_append_sheet(wb, wsSquads, "Squads");

    // 5. Awards Sheet
    const awardsData = [
      ["Award Name", "Team Name", "Tournament Name"],
      ["Winner", "Red Devils", "Premier League"],
      ["Runner Up", "Blue Eagles", "Premier League"],
      ["Winner", "Blue Eagles", "Champions Cup"],
      ["Runner Up", "Red Devils", "Champions Cup"],
      ["Golden Boot", "Red Devils", ""],
      ["Golden Glove", "Blue Eagles", ""],
      ["Ballon d'Or", "Red Devils", ""],
      ["Team of the Season", "Red Devils, Blue Eagles", ""]
    ];
    const wsAwards = XLSX.utils.aoa_to_sheet(awardsData);
    XLSX.utils.book_append_sheet(wb, wsAwards, "Awards");

    XLSX.writeFile(wb, "historical_data_template.xlsx");
  };

  // --- Excel / CSV Upload ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!season.id && !season.name) {
      setError("Please select or enter a New Season Name before uploading an Excel file.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const ab = evt.target?.result as ArrayBuffer;
        const wb = XLSX.read(ab, { type: "array" });
        
        // 1 & 2. Parse Teams
        if (step === 1 || step === 2) {
          const wsTeams = wb.Sheets["Teams"];
          let importedSeasonTeams: any[] = [];
          if (wsTeams) {
            const teamsJson = XLSX.utils.sheet_to_json(wsTeams, { header: 1 }) as any[];
            for (let i = 1; i < teamsJson.length; i++) {
              const row = teamsJson[i];
              if (row.length === 0 || !row[0]) continue;
              const teamName = String(row[0]).trim();
              let managerName = row[1] ? String(row[1]).trim() : "";
              
              if (!managerName) {
                 const possibleTeam = initialTeams.find(t => t.name.toLowerCase() === teamName.toLowerCase());
                 if (possibleTeam) {
                   const linkedManager = initialManagers.find(m => 
                     m.teamLinks?.some((link: any) => link.teamId === possibleTeam.id)
                   );
                   if (linkedManager) {
                     managerName = linkedManager.name;
                   } else if (possibleTeam.managerName) {
                     managerName = possibleTeam.managerName;
                   }
                 }
              }
              
              const existing = initialTeams.find(t => {
                const dbName = t.name.toLowerCase();
                const inputName = teamName.toLowerCase();
                const dbManager = (t.managerName || "").trim().toLowerCase();
                const inputManager = managerName.toLowerCase();
                
                const isGenericManager = (m: string) => 
                  !m || ["tbd", "n/a", "none", "vacant", "no manager", "temp", "temporary", "unassigned", "undefined", "null", "-", ""].includes(m.trim().toLowerCase());

                if (dbName === inputName) return true;
                if (inputManager && !isGenericManager(inputManager) && dbManager === inputManager) return true;
                return false;
              });
  
              const resolvedTeamName = teamName;
              const resolvedManagerName = managerName || existing?.managerName || "";
              
              const isManagerNew = !initialManagers.some(m => m.name.toLowerCase() === resolvedManagerName.toLowerCase());
  
              importedSeasonTeams.push({
                id: existing ? existing.id : "new",
                name: resolvedTeamName,
                originalName: teamName,
                managerName: resolvedManagerName,
                tempId: `tm_${Date.now()}_${i}`,
                isNewManager: isManagerNew
              });
            }
          }
          if (importedSeasonTeams.length > 0) setSeasonTeams(importedSeasonTeams);
        }
        
        // 3. Parse Tournaments
        if (step === 1 || step === 3) {
          const wsTournaments = wb.Sheets["Tournaments"];
          let importedTournaments: any[] = [];
          if (wsTournaments) {
            const tournJson = XLSX.utils.sheet_to_json(wsTournaments, { header: 1, raw: false, dateNF: "yyyy-mm-dd" }) as any[];
            for (let i = 1; i < tournJson.length; i++) {
              const row = tournJson[i];
              if (row.length === 0 || !row[0]) continue;
              const tournName = String(row[0]).trim();
              const rawType = String(row[1] || "KNOCKOUT_ONLY").toUpperCase().trim();
              
              let type = "KNOCKOUT_ONLY";
              if (rawType.includes("LEAGUE")) type = "LEAGUE_ONLY";
              if (rawType.includes("GROUP")) type = "GROUP_KNOCKOUT";
              if (["LEAGUE_ONLY", "LEAGUE_PLAYOFF", "GROUP_KNOCKOUT", "KNOCKOUT_ONLY"].includes(rawType)) {
                type = rawType;
              }

              let startDate = new Date().toISOString().split("T")[0];
              if (row[2]) {
                startDate = String(row[2]).trim();
              }
              const groupName = row[3] ? String(row[3]).trim() : "";
              
              // Ensure we only link to an existing tournament if it belongs to the active season
              const existingTourn = initialTournaments.find(t => 
                t.name.toLowerCase() === tournName.toLowerCase() && 
                t.seasonId === season.id
              );
              
              importedTournaments.push({
                id: existingTourn ? existingTourn.id : `t_${Date.now()}_${i}`,
                name: tournName,
                type,
                startDate,
                groupName
              });
            }
          }
          if (importedTournaments.length > 0) setTournaments(importedTournaments);
        }

        // 4. Parse Stats & activeTournTeams
        if (step === 1 || step === 4 || step === 3) { // Step 3 for activeTournTeams
          let importedStats: any = {};
          let importedActiveTournTeams: Record<string, string[]> = {};
          let newExcelTeamNames: Record<string, string> = {};
          
          const statsSheetNames = wb.SheetNames.filter(name => name.toLowerCase().startsWith("stats"));
          
          for (const sheetName of statsSheetNames) {
            const wsStats = wb.Sheets[sheetName];
            if (!wsStats) continue;
            
            // Extract tournament name from sheet name, e.g. "Stats - Premier League" -> "Premier League"
            let tournNameFromSheet = sheetName.replace(/^stats\s*-\s*/i, "").trim();
            if (tournNameFromSheet.toLowerCase() === "stats") tournNameFromSheet = ""; // Fallback if just named "Stats"
            
            const statsJson = XLSX.utils.sheet_to_json(wsStats, { header: 1 }) as any[];
            
            // Map column headers dynamically to support various Excel formats
            const headerRow = statsJson[0] || [];
            let idxPts = 1, idxPlayed = 2, idxWon = 3, idxDrawn = 4, idxLost = 5, idxGF = 6, idxGA = 7;
            for (let j = 0; j < headerRow.length; j++) {
              const h = String(headerRow[j]).toLowerCase().trim();
              if (h === 'p' || h === 'pts' || h === 'points') idxPts = j;
              else if (h === 'mp' || h === 'played' || h === 'matches') idxPlayed = j;
              else if (h === 'w' || h === 'won' || h === 'wins') idxWon = j;
              else if (h === 'd' || h === 'drawn' || h === 'draws') idxDrawn = j;
              else if (h === 'l' || h === 'lost' || h === 'losses') idxLost = j;
              else if (h === 'f' || h === 'gf' || h === 'goals for') idxGF = j;
              else if (h === 'a' || h === 'ga' || h === 'goals against') idxGA = j;
            }

            for (let i = 1; i < statsJson.length; i++) {
              const row = statsJson[i];
              if (row.length === 0 || !row[0]) continue;
              if (String(row[0]).startsWith("NOTE:")) continue; // Skip notes
              
              const teamName = String(row[0]).trim();
              if (teamName.toLowerCase() === "team name") continue; // Skip repeated headers
              
              const team = seasonTeams.find(t => t.originalName?.toLowerCase() === teamName.toLowerCase() || t.name.toLowerCase() === teamName.toLowerCase());
              // If sheet name had a tournament, use it. Otherwise assume they only have 1 tournament.
              const tourn = tournNameFromSheet ? tournaments.find(t => t.name.toLowerCase() === tournNameFromSheet.toLowerCase()) : tournaments[0];
              
              if (tourn) {
                let tempIdToUse = team?.tempId;
                
                // If team wasn't found, assign a placeholder
                if (!team) {
                  tempIdToUse = `unmapped_${Date.now()}_${i}`;
                }
                
                if (tempIdToUse) {
                  // ALWAYS track the excel name for UI cross-checking
                  newExcelTeamNames[tempIdToUse] = teamName;
                  
                  if (!importedActiveTournTeams[tourn.id]) importedActiveTournTeams[tourn.id] = [];
                  if (!importedActiveTournTeams[tourn.id].includes(tempIdToUse)) {
                    importedActiveTournTeams[tourn.id].push(tempIdToUse);
                  }
    
                  const statKey = `${tourn.id}_${tempIdToUse}`;
                  importedStats[statKey] = {
                    points: parseInt(row[idxPts]) || 0,
                    played: parseInt(row[idxPlayed]) || 0,
                    won: parseInt(row[idxWon]) || 0,
                    drawn: parseInt(row[idxDrawn]) || 0,
                    lost: parseInt(row[idxLost]) || 0,
                    goalsFor: parseInt(row[idxGF]) || 0,
                    goalsAgainst: parseInt(row[idxGA]) || 0,
                  };
                }
              }
            }
          }
          if (Object.keys(importedActiveTournTeams).length > 0) {
            setActiveTournTeams(importedActiveTournTeams);
            const dirtyObj: Record<string, boolean> = {};
            Object.keys(importedActiveTournTeams).forEach(tid => {
              dirtyObj[tid] = true;
            });
            setDirtyTournaments(prev => ({ ...prev, ...dirtyObj }));
          }
          if (Object.keys(importedStats).length > 0) setStats(importedStats);
          if (Object.keys(newExcelTeamNames).length > 0) {
            setExcelTeamNames(prev => ({ ...prev, ...newExcelTeamNames }));
          }
        }

        // 5. Parse Squads
        if (step === 1 || step === 6) {
          const wsSquads = wb.Sheets["Squads"];
          let importedTeamPlayers: Record<string, { id: string; price: number }[]> = {};
          let missing: string[] = [];
          if (wsSquads) {
            const squadsJson = XLSX.utils.sheet_to_json(wsSquads, { header: 1 }) as any[];
            for (let i = 1; i < squadsJson.length; i++) {
              const row = squadsJson[i];
              if (row.length === 0 || !row[0]) continue;
              if (String(row[0]).toLowerCase() === "team name") continue;
              
              const teamName = String(row[0]).trim();
              const pName = String(row[1]).trim();
              const pPrice = parseInt(row[2]) || 0;
              
              const team = seasonTeams.find(t => t.originalName?.toLowerCase() === teamName.toLowerCase() || t.name.toLowerCase() === teamName.toLowerCase());
              const player = players.find(p => p.name.toLowerCase() === pName.toLowerCase());
              
              if (team && player) {
                if (!importedTeamPlayers[team.tempId]) importedTeamPlayers[team.tempId] = [];
                // Only push if not already added to avoid duplicates from messy excel
                if (!importedTeamPlayers[team.tempId].some(p => p.id === player.id)) {
                  importedTeamPlayers[team.tempId].push({ id: player.id, price: pPrice });
                }
              } else if (team && !player) {
                missing.push(pName);
              }
            }
          }
          if (Object.keys(importedTeamPlayers).length > 0) setTeamPlayers(importedTeamPlayers);
          if (missing.length > 0) setMissingPlayers(Array.from(new Set(missing)));
        }

        // 6. Parse Awards
        if (step === 1 || step === 5) {
          const wsAwards = wb.Sheets["Awards"];
          // Start from existing awards so we don't wipe out data for tournaments not in the Excel
          let newAwards = {
            winnerTeamId: awards.winnerTeamId || "",
            runnerUpTeamId: awards.runnerUpTeamId || "",
            goldenBootTeamId: awards.goldenBootTeamId || "",
            goldenGloveTeamId: awards.goldenGloveTeamId || "",
            goldenBallTeamId: awards.goldenBallTeamId || "",
            ballonDorTeamId: awards.ballonDorTeamId || "",
            teamOfTheSeasonPlayerIds: [...(awards.teamOfTheSeasonPlayerIds || [])],
            tournamentAwards: { ...(awards.tournamentAwards || {}) } as Record<string, { winnerTeamId: string; runnerUpTeamId: string }>
          };
          if (wsAwards) {
            const awardsJson = XLSX.utils.sheet_to_json(wsAwards, { header: 1 }) as any[];
            const findTeam = (n: string) => seasonTeams.find(t => t.originalName?.toLowerCase() === n.toLowerCase() || t.name.toLowerCase() === n.toLowerCase());
            const findTourn = (n: string) => {
              if (!n) return null;
              return tournaments.find(t => t.name.toLowerCase() === n.toLowerCase());
            };
            
            // Track which fields the Excel actually sets so we only overwrite those
            let hasTotsRow = false;
            const importedTots: string[] = [];
            
            for (let i = 1; i < awardsJson.length; i++) {
              const row = awardsJson[i];
              if (row.length === 0 || !row[0]) continue;
              const awardName = String(row[0]).trim().toLowerCase();
              const winnerName = String(row[1] || "").trim();
              const tournamentName = String(row[2] || "").trim();
              
              // Find the team
              const team = findTeam(winnerName);
              
              // Find the tournament from column 3, or fall back to first tournament
              const matchedTourn = findTourn(tournamentName);
              const targetTourn = matchedTourn || tournaments[0];
              
              if (awardName === "winner" || awardName === "league winner") {
                if (team && targetTourn) {
                  if (!newAwards.tournamentAwards[targetTourn.id]) {
                    newAwards.tournamentAwards[targetTourn.id] = { winnerTeamId: "", runnerUpTeamId: "" };
                  }
                  newAwards.tournamentAwards[targetTourn.id].winnerTeamId = team.tempId;
                  if (!newAwards.winnerTeamId) newAwards.winnerTeamId = team.tempId;
                }
              } else if (awardName === "runner up" || awardName === "runner-up") {
                if (team && targetTourn) {
                  if (!newAwards.tournamentAwards[targetTourn.id]) {
                    newAwards.tournamentAwards[targetTourn.id] = { winnerTeamId: "", runnerUpTeamId: "" };
                  }
                  newAwards.tournamentAwards[targetTourn.id].runnerUpTeamId = team.tempId;
                  if (!newAwards.runnerUpTeamId) newAwards.runnerUpTeamId = team.tempId;
                }
              } else if (awardName === "golden boot") {
                if (team) newAwards.goldenBootTeamId = team.tempId;
              } else if (awardName === "golden glove") {
                if (team) newAwards.goldenGloveTeamId = team.tempId;
              } else if (awardName === "golden ball") {
                if (team) newAwards.goldenBallTeamId = team.tempId;
              } else if (awardName === "ballon d'or" || awardName === "ballon dor") {
                if (team) newAwards.ballonDorTeamId = team.tempId;
              } else if (awardName === "team of the season") {
                hasTotsRow = true;
                const names = winnerName.split(",").map(n => n.trim());
                names.forEach(n => {
                  const t = findTeam(n);
                  if (t) importedTots.push(t.tempId);
                });
              }
            }
            
            // Only overwrite TOTS if the Excel had a TOTS row
            if (hasTotsRow) {
              newAwards.teamOfTheSeasonPlayerIds = importedTots;
            }
          }
          setAwards(newAwards);
        }

      } catch (err) {
        console.error("Error parsing file:", err);
        setError("Error parsing the uploaded file. Ensure it follows the template structure.");
      } finally {
        setLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const teamOptions = [
    { value: "new", label: "+ Create New Team" },
    ...initialTeams.map(t => ({ value: t.id, label: t.name }))
  ];
  const managerOptions = [
    { value: "new", label: "+ Create New Manager" },
    ...initialManagers.map(m => {
      const teamNames = (m.teamLinks || [])
        .map((link: any) => {
          const team = initialTeams.find(t => t.id === link.teamId);
          return team?.name || "";
        })
        .filter(Boolean)
        .join(", ");
      return { 
        value: m.name, 
        label: teamNames ? `${m.name} (${teamNames})` : m.name 
      };
    })
  ];
  const seasonOptions = [
    { value: "new", label: "+ Create New Season" },
    ...initialSeasons.map(s => ({ value: s.id, label: `${s.name} (Season ${s.seasonNumber})` }))
  ];

  const renderUploadBtn = (stepName: string) => (
    <button 
      onClick={() => {
        if (!season.id && !season.name) {
          setError("Please enter a New Season Name or select a Season first.");
          return;
        }
        fileInputRef.current?.click();
      }} 
      disabled={!season.id && !season.name}
      title={(!season.id && !season.name) ? "Select or enter a season name first" : `Upload & Extract ${stepName}`}
      className="px-4 py-2 bg-[#E8A800]/20 hover:bg-[#E8A800]/30 text-[#E8A800] rounded-lg transition-colors text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
      </svg>
      Upload {stepName}
    </button>
  );

  return (
    <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 sm:p-8">
      {/* Steps Indicator */}
      <div className="flex items-center justify-between mb-8 pb-8 border-b border-white/10 overflow-x-auto custom-scrollbar">
        {[
          { num: 1, label: "Season" },
          { num: 2, label: "Teams" },
          { num: 3, label: "Tournaments" },
          { num: 4, label: "Stats" },
          { num: 5, label: "Awards" },
          { num: 6, label: "Players" },
        ].map((s, idx) => (
          <div key={s.num} className="flex items-center shrink-0">
            <button 
              onClick={() => {
                if (s.num > 1 && !season.id && !season.name) {
                  setError("Please select or enter a season in Step 1 first.");
                  return;
                }
                setStep(s.num);
              }}
              className="flex flex-col items-center focus:outline-none group"
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg transition-all group-hover:scale-105 ${step >= s.num ? "bg-gradient-to-r from-[#E8A800] to-[#FFB347] text-black shadow-[0_0_10px_rgba(232,168,0,0.5)]" : step === s.num ? "bg-white/20 text-white" : "bg-white/10 text-gray-500 group-hover:bg-white/20"}`}>
                {s.num}
              </div>
              <span className={`text-[10px] sm:text-xs mt-1 font-medium transition-colors ${step >= s.num ? "text-[#E8A800]" : "text-gray-600 group-hover:text-gray-400"}`}>
                {s.label}
              </span>
            </button>
            {idx < 5 && <div className={`h-1 w-6 sm:w-12 mx-1 sm:mx-2 rounded mt-[-12px] ${step > s.num ? "bg-[#E8A800]" : "bg-white/10"}`} />}
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl">
          {error}
        </div>
      )}

      {/* Global Actions & Context Bar */}
      <div className="flex justify-between items-center mb-6 pb-6 border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-sm font-medium">Active Season:</span>
          {season.name ? (
            <span className="px-3 py-1 bg-[#E8A800]/10 text-[#E8A800] rounded-md text-sm font-bold border border-[#E8A800]/20">
              {season.name} {season.id ? "" : "(New)"}
            </span>
          ) : (
            <span className="text-gray-600 text-sm italic px-2">None selected (Go to Step 1)</span>
          )}
        </div>
        <button 
          onClick={handleDownloadTemplate} 
          className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download Template
        </button>
      </div>

      <input 
        type="file" 
        accept=".xlsx, .xls, .csv" 
        className="hidden" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
      />

      {/* STEP 1: Season */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <h2 className="text-2xl font-bold text-white">Step 1: Select Season</h2>
          </div>
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
              {renderUploadBtn("Teams")}
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
                  <SearchableSelect
                    label="Manager Name"
                    value={t.isNewManager ? "new" : (t.managerName || "")}
                    options={managerOptions}
                    onChange={(val) => updateTeam(t.tempId, "managerName", val)}
                    placeholder="Select Manager"
                  />
                  {t.isNewManager ? (
                    <input
                      type="text"
                      placeholder="New Manager Name"
                      className="mt-2 w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-[#E8A800] text-sm"
                      value={t.managerName}
                      onChange={(e) => updateTeam(t.tempId, "managerName", e.target.value)}
                    />
                  ) : null}
                  <div className="mt-2">
                    {t.isNewManager && t.managerName.trim() === "" ? (
                      <span className="text-xs font-mono text-gray-500 bg-gray-500/10 px-2 py-1 rounded">No Manager</span>
                    ) : t.isNewManager ? (
                      <span className="text-xs font-mono text-green-400 bg-green-400/10 px-2 py-1 rounded">🟩 New Manager Profile</span>
                    ) : t.managerName ? (
                      <span className="text-xs font-mono text-blue-400 bg-blue-400/10 px-2 py-1 rounded">🟦 Existing Manager</span>
                    ) : (
                      <span className="text-xs font-mono text-gray-500 bg-gray-500/10 px-2 py-1 rounded">No Manager</span>
                    )}
                  </div>
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
            <div className="flex gap-2">
              {renderUploadBtn("Tournaments")}
              <button onClick={addTournament} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors text-sm font-medium">
                + Add Tournament
              </button>
            </div>
          </div>
          
          {tournaments.map((t, index) => (
            <div key={t.id} className="p-4 bg-black/30 border border-white/10 rounded-xl space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <h3 className="font-bold text-[#E8A800]">Tournament {index + 1}</h3>
                  {t.id && !t.id.startsWith("t_") ? (
                    <span className="text-xs font-mono text-green-400 bg-green-400/10 px-2 py-1 rounded">Existing</span>
                  ) : (
                    <span className="text-xs font-mono text-blue-400 bg-blue-400/10 px-2 py-1 rounded">New</span>
                  )}
                </div>
                <button onClick={() => removeTournament(t.id)} className="text-red-500 hover:text-red-400 text-sm">Remove</button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Name</label>
                  <input type="text" className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-white text-sm" value={t.name} onChange={(e) => updateTournament(t.id, "name", e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Type</label>
                  <select className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-white text-sm" value={t.type} onChange={(e) => updateTournament(t.id, "type", e.target.value)}>
                    <option value="LEAGUE_ONLY">League Only</option>
                    <option value="LEAGUE_PLAYOFF">League + Playoff</option>
                    <option value="GROUP_KNOCKOUT">Group Stage + Knockout</option>
                    <option value="KNOCKOUT_ONLY">Knockout Only</option>
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
          <p className="text-gray-400 text-sm">Enter the final standings/stats for the teams participating in each tournament.</p>
          <div className="mb-6">{renderUploadBtn("Stats")}</div>
          
          {tournaments.filter(t => t.type !== "KNOCKOUT_ONLY").map((tourn, index) => {
            const availableTeams = seasonTeams.filter(t => !getTournTeams(tourn.id).includes(t.tempId));
            return (
              <div key={tourn.id} className="p-4 sm:p-6 bg-black/30 border border-white/10 rounded-xl overflow-x-auto">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4 border-b border-white/5 pb-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="font-bold text-[#E8A800] text-lg">{tourn.name || `Tournament ${index + 1}`}</h3>
                      {dirtyTournaments[tourn.id] && (
                        <span className="px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-400 text-[10px] font-bold uppercase border border-yellow-500/20">
                          Unsaved Changes
                        </span>
                      )}
                      {!dirtyTournaments[tourn.id] && getTournTeams(tourn.id).length > 0 && (
                        <span className="px-2 py-0.5 rounded bg-green-500/10 text-green-400 text-[10px] font-bold uppercase border border-green-500/20">
                          Synced
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 text-xs font-mono text-gray-400">
                      <span className="bg-white/5 px-2 py-0.5 rounded">Season: {season.name || season.id || "Pending"}</span>
                      <span className="bg-white/5 px-2 py-0.5 rounded">Tournament ID: {tourn.id}</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3 w-full sm:w-auto">
                    {/* Individual Sync Button */}
                    <button
                      type="button"
                      onClick={() => handleSaveTournamentStats(tourn.id)}
                      disabled={!season.id || tournSaveStatus[tourn.id]?.status === 'saving' || !dirtyTournaments[tourn.id]}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                        !season.id || !dirtyTournaments[tourn.id]
                          ? "bg-white/5 text-gray-500 border border-white/5 cursor-not-allowed"
                          : tournSaveStatus[tourn.id]?.status === 'saving'
                            ? "bg-[#E8A800]/20 text-[#E8A800] border border-[#E8A800]/30 cursor-wait"
                            : tournSaveStatus[tourn.id]?.status === 'saved'
                              ? "bg-green-500 hover:bg-green-400 text-black shadow-[0_0_10px_rgba(34,197,94,0.3)]"
                              : "bg-[#E8A800] hover:bg-[#FFB347] text-black font-extrabold hover:scale-105"
                      }`}
                    >
                      {tournSaveStatus[tourn.id]?.status === 'saving' ? (
                        <>
                          <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Syncing...
                        </>
                      ) : tournSaveStatus[tourn.id]?.status === 'saved' ? (
                        <>
                          ✓ Synced!
                        </>
                      ) : (
                        <>
                          Sync Standings
                        </>
                      )}
                    </button>

                    {seasonTeams.length > 0 && (
                      <div className="w-full sm:w-56 shrink-0">
                        <SearchableSelect
                          value=""
                          placeholder="+ Add Team to Stats"
                          onChange={(val) => {
                            if (val) handleAddTeamToTourn(tourn.id, val);
                          }}
                          options={seasonTeams.map(t => {
                            const isAlreadyIn = getTournTeams(tourn.id).includes(t.tempId);
                            return {
                              value: t.tempId,
                              label: `${t.name} ${t.managerName ? `(${t.managerName})` : ""} ${isAlreadyIn ? '(Added)' : ''}`,
                              disabled: isAlreadyIn
                            };
                          })}
                        />
                      </div>
                    )}
                  </div>
                </div>
                
                <table className="w-full text-left min-w-[670px]">
                  <thead>
                    <tr className="text-xs text-gray-400 border-b border-white/10">
                      <th className="py-2 px-2 font-medium w-8 text-center">#</th>
                      <th className="py-2 px-2 font-medium">Excel Name</th>
                      <th className="py-2 px-2 font-medium">Linked Team</th>
                      <th className="py-2 px-2 font-medium w-16 text-center">P</th>
                      <th className="py-2 px-2 font-medium w-16 text-center">W</th>
                      <th className="py-2 px-2 font-medium w-16 text-center">D</th>
                      <th className="py-2 px-2 font-medium w-16 text-center">L</th>
                      <th className="py-2 px-2 font-medium w-16 text-center">GF</th>
                      <th className="py-2 px-2 font-medium w-16 text-center">GA</th>
                      <th className="py-2 px-2 font-medium w-20 text-center">Pts</th>
                      <th className="py-2 px-2 font-medium w-16 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {getTournTeams(tourn.id)
                      .map(teamTempId => {
                        const team = seasonTeams.find(t => t.tempId === teamTempId);
                        const excelName = excelTeamNames[teamTempId] || team?.originalName || team?.name || "N/A (Manual)";
                        const key = `${tourn.id}_${teamTempId}`;
                        const currentStats = stats[key] || { played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 };
                        return { teamTempId, team, excelName, currentStats, key };
                      })
                      .sort((a, b) => {
                        if (b.currentStats.points !== a.currentStats.points) return b.currentStats.points - a.currentStats.points;
                        const gdA = (a.currentStats.goalsFor || 0) - (a.currentStats.goalsAgainst || 0);
                        const gdB = (b.currentStats.goalsFor || 0) - (b.currentStats.goalsAgainst || 0);
                        if (gdA !== gdB) return gdB - gdA;
                        return (b.currentStats.goalsFor || 0) - (a.currentStats.goalsFor || 0);
                      })
                      .map(({ teamTempId, team, excelName, currentStats, key }, index) => (
                        <tr key={teamTempId} className={!team ? "bg-red-500/10" : ""}>
                          <td className="py-2 px-2 text-center text-gray-500 font-mono text-xs">{index + 1}</td>
                          <td className="py-2 px-2 text-sm text-gray-400 max-w-[150px] truncate" title={excelName}>
                            {excelName}
                          </td>
                          <td className="py-2 px-2 text-sm font-bold min-w-[200px]">
                            <SearchableSelect
                              className={`w-full ${!team ? '[&>button]:border-red-500/50 [&>button]:text-red-200 [&>button]:bg-red-500/20' : ''}`}
                              value={team ? team.tempId : ""}
                              placeholder={`Link '${excelName}' to...`}
                              onChange={(val) => resolveUnmappedTeam(tourn.id, teamTempId, val)}
                              options={[
                                ...seasonTeams.map(at => {
                                  const isAlreadyIn = getTournTeams(tourn.id).includes(at.tempId);
                                  const isCurrentRowTeam = team?.tempId === at.tempId;
                                  return {
                                    value: at.tempId,
                                    label: `${at.name} ${at.managerName ? `(${at.managerName})` : ""} ${isAlreadyIn && !isCurrentRowTeam ? '(Already in table)' : ''}`,
                                    disabled: isAlreadyIn && !isCurrentRowTeam
                                  };
                                })
                              ]}
                            />
                          </td>
                          {['played', 'won', 'drawn', 'lost', 'goalsFor', 'goalsAgainst', 'points'].map(field => (
                            <td key={field} className="py-2 px-1">
                              <input
                                type="number"
                                className={`w-full bg-black/50 border border-white/10 rounded text-center text-sm p-1 ${field === 'points' ? 'font-bold text-[#E8A800]' : 'text-white'} focus:border-[#E8A800] focus:outline-none ${!team ? 'opacity-50' : ''}`}
                                value={currentStats[field as keyof typeof currentStats]}
                                onChange={(e) => updateStat(tourn.id, teamTempId, field, e.target.value)}
                                disabled={!team}
                              />
                            </td>
                          ))}
                          <td className="py-2 px-2 text-center">
                            <button
                              onClick={() => handleRemoveTeamFromTourn(tourn.id, teamTempId)}
                              className="text-red-500 hover:text-red-400 hover:bg-red-500/10 p-1.5 rounded-lg transition-colors"
                              title="Remove team stats"
                            >
                              <svg className="w-4 h-4 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}

      {/* STEP 6: Assign Players */}
      {step === 6 && (
        <div className="space-y-6 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                Step 6: Assign Players & Squads
              </h2>
              <p className="text-gray-400 text-sm mt-1">
                Manage individual rosters, assign prices, and sync squads directly to the database team-by-team.
              </p>
            </div>
            <div className="shrink-0">
              {renderUploadBtn("Squads Excel")}
            </div>
          </div>

          {missingPlayers.length > 0 && (
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 rounded-xl mb-4 text-sm animate-fadeIn">
              <strong className="block mb-1">Warning: Some players were skipped</strong>
              The following players from your Excel file were not found in the database: 
              <span className="font-mono ml-2 break-words">{missingPlayers.join(", ")}</span>
            </div>
          )}

          {/* Mobile responsive Tab Bar */}
          <div className="flex lg:hidden bg-black/60 border border-white/10 rounded-xl p-1 mb-4 gap-1">
            <button
              onClick={() => setActiveTab('teams')}
              className={`flex-1 py-2.5 text-xs font-bold rounded-lg text-center transition-all ${
                activeTab === 'teams'
                  ? "bg-gradient-to-r from-[#E8A800] to-[#FFB347] text-black shadow-[0_0_10px_rgba(232,168,0,0.3)]"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Teams ({seasonTeams.length})
            </button>
            <button
              onClick={() => {
                if (activePlayerTeamId) setActiveTab('search');
              }}
              disabled={!activePlayerTeamId}
              className={`flex-1 py-2.5 text-xs font-bold rounded-lg text-center transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                activeTab === 'search'
                  ? "bg-gradient-to-r from-[#E8A800] to-[#FFB347] text-black shadow-[0_0_10px_rgba(232,168,0,0.3)]"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Add Players
            </button>
            <button
              onClick={() => {
                if (activePlayerTeamId) setActiveTab('roster');
              }}
              disabled={!activePlayerTeamId}
              className={`flex-1 py-2.5 text-xs font-bold rounded-lg text-center transition-all relative disabled:opacity-30 disabled:cursor-not-allowed ${
                activeTab === 'roster'
                  ? "bg-gradient-to-r from-[#E8A800] to-[#FFB347] text-black shadow-[0_0_10px_rgba(232,168,0,0.3)]"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Roster
              {activePlayerTeamId && (teamPlayers[activePlayerTeamId] || []).length > 0 && (
                <span className="ml-1 bg-black/45 text-[#E8A800] text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-[#E8A800]/25">
                  {(teamPlayers[activePlayerTeamId] || []).length}
                </span>
              )}
            </button>
          </div>
          
          <div className="flex flex-col lg:flex-row gap-6 items-stretch h-auto lg:h-[650px] overflow-visible lg:overflow-hidden">
            {/* COLUMN 1: Teams List */}
            <div className={`w-full lg:w-[28%] bg-black/40 border border-white/10 rounded-2xl flex flex-col h-[500px] lg:h-full overflow-hidden backdrop-blur-md transition-all duration-300 ${activeTab === 'teams' ? 'flex' : 'hidden lg:flex'}`}>
              <div className="p-4 border-b border-white/5 bg-white/[0.01] flex flex-col gap-3">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Participating Teams
                </h3>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search teams..."
                    className="w-full bg-black/50 border border-white/10 rounded-xl py-1.5 pl-9 pr-3 text-white focus:outline-none focus:border-[#E8A800] text-xs placeholder:text-gray-600"
                    value={teamSearch}
                    onChange={(e) => setTeamSearch(e.target.value)}
                  />
                  <svg className="w-3.5 h-3.5 text-gray-600 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                {seasonTeams
                  .filter(t => 
                    t.name.toLowerCase().includes(teamSearch.toLowerCase()) ||
                    (t.managerName || "").toLowerCase().includes(teamSearch.toLowerCase())
                  )
                  .map(t => {
                  const balance = season.startingPurse - (teamPlayers[t.tempId] || []).reduce((sum, p) => sum + p.price, 0);
                  const isSelected = activePlayerTeamId === t.tempId;
                  const isDirty = dirtyTeams[t.tempId];
                  const saveState = teamSaveStatus[t.tempId];
                  const playerCount = (teamPlayers[t.tempId] || []).length;
                  
                  // Squad size feedback colors
                  let sizeBadgeColor = "text-gray-400 bg-white/5";
                  if (playerCount >= 25 && playerCount <= 30) {
                    sizeBadgeColor = "text-green-400 bg-green-400/10 border border-green-500/20";
                  } else if (playerCount > 0) {
                    sizeBadgeColor = "text-amber-400 bg-amber-400/10 border border-amber-500/20";
                  }

                  return (
                    <button
                      key={t.tempId}
                      onClick={() => {
                        setActivePlayerTeamId(t.tempId);
                        setActiveTab('search');
                      }}
                      className={`w-full text-left p-3.5 rounded-xl transition-all flex flex-col gap-2 border border-transparent relative group ${
                        isSelected 
                          ? "bg-gradient-to-br from-[#E8A800]/15 to-[#FFB347]/5 text-white border-l-4 border-l-[#E8A800] border-white/10" 
                          : "text-gray-300 hover:bg-white/[0.03] border-l-4 border-l-transparent"
                      }`}
                    >
                      <div className="flex items-start justify-between w-full gap-2">
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="font-bold text-sm truncate group-hover:text-white transition-colors">
                            {t.name || "Unnamed Team"}
                          </span>
                          <span className="text-[11px] text-gray-500 truncate mt-0.5">
                            Manager: {t.managerName || "Unassigned"}
                          </span>
                        </div>
                        
                        {/* Status/Sync indicator */}
                        <div className="shrink-0 flex items-center gap-1.5">
                          {saveState?.status === 'saving' ? (
                            <svg className="w-3.5 h-3.5 text-[#E8A800] animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                          ) : isDirty ? (
                            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" title="Unsaved changes locally" />
                          ) : t.id && t.id !== "new" ? (
                            <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex items-center justify-between w-full pt-1 border-t border-white/[0.03] mt-0.5 text-xs">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${sizeBadgeColor}`}>
                          {playerCount} Players
                        </span>
                        <span className={`font-mono font-bold ${balance < 0 ? "text-red-400" : "text-[#E8A800]"}`}>
                          ¤ {balance.toLocaleString()}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* COLUMN 2: Available Players Grid */}
            <div className={`w-full lg:w-[38%] bg-black/40 border border-white/10 rounded-2xl flex flex-col h-[500px] lg:h-full overflow-hidden backdrop-blur-md transition-all duration-300 ${activeTab === 'search' ? 'flex' : 'hidden lg:flex'}`}>
              {!activePlayerTeamId ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-6 text-center">
                  <svg className="w-12 h-12 text-gray-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Select a team on the left to start assigning players
                </div>
              ) : (
                <>
                  <div className="p-4 border-b border-white/5 bg-white/[0.01] flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Search & Add Players
                      </h3>
                      <span className="text-[10px] text-gray-500 font-medium">
                        {filteredPlayers.length} matches
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search players by name..."
                        className="w-full bg-black/50 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-[#E8A800] text-sm placeholder:text-gray-600"
                        value={playerSearch}
                        onChange={(e) => setPlayerSearch(e.target.value)}
                      />
                      <svg className="w-4 h-4 text-gray-600 absolute left-3.5 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                  </div>
                  
                  <div className="flex-1 grid grid-cols-2 gap-3 p-4 overflow-y-auto custom-scrollbar content-start">
                    {paginatedPlayers.map((p) => {
                      const assigned = playerAssignments[p.id];
                      const isCurrentTeam = assigned?.teamTempId === activePlayerTeamId;
                      
                      return (
                        <div 
                          key={p.id} 
                          onClick={() => {
                            if (isCurrentTeam) {
                              handleRemovePlayer(p.id);
                            } else {
                              handlePlayerAddOrTransfer(p);
                            }
                          }}
                          className={`bg-white/[0.01] hover:bg-white/[0.03] border rounded-xl p-3 pt-9 pb-3 flex flex-col items-center justify-between text-center transition-all duration-300 relative group min-h-[160px] cursor-pointer hover:scale-[1.02] active:scale-[0.98] select-none ${
                            isCurrentTeam 
                              ? "border-[#E8A800] bg-[#E8A800]/5 shadow-[0_0_10px_rgba(232,168,0,0.05)]" 
                              : assigned 
                                ? "border-white/5 opacity-70 hover:opacity-100 hover:border-amber-500/30" 
                                : "border-white/5 hover:border-[#E8A800]/30 hover:shadow-[0_4px_15px_rgba(232,168,0,0.05)]"
                          }`}
                        >
                          {/* Position & OVR Rating Badges */}
                          {(() => {
                            const { position, rating } = getPlayerDetails(p, season.id);
                            return (
                              <>
                                <span className="absolute top-2.5 left-2.5 text-[9px] bg-white/10 text-gray-300 font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                                  {position}
                                </span>
                                {rating > 0 && (
                                  <span className="absolute top-2.5 right-2.5 text-[9px] bg-[#E8A800]/15 text-[#E8A800] font-black px-1.5 py-0.5 rounded border border-[#E8A800]/20">
                                    {rating}
                                  </span>
                                )}
                              </>
                            );
                          })()}

                          <div className="flex flex-col items-center w-full relative">
                            <div className={`w-11 h-11 rounded-full overflow-hidden bg-gray-800 mb-2 shrink-0 border-2 ${
                              isCurrentTeam ? "border-[#E8A800]" : "border-white/10"
                            }`}>
                              {p.photoUrl ? (
                                <img src={getPhotoUrlFromDb(p.photoUrl)} alt={p.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center font-bold text-xs bg-gradient-to-br from-gray-700 to-gray-800 text-gray-300">
                                  {p.name.substring(0,2).toUpperCase()}
                                </div>
                              )}
                            </div>
                            <span className="text-xs font-semibold text-white line-clamp-2 leading-tight px-1 min-h-[32px] flex items-center justify-center">
                              {p.name}
                            </span>
                          </div>

                          <div className="w-full mt-2 pt-2 border-t border-white/[0.03]">
                            {isCurrentTeam ? (
                              <span
                                className="block w-full py-1.5 px-2 bg-red-500/10 text-red-400 rounded-lg text-[10px] font-bold border border-red-500/20 text-center"
                              >
                                Remove from Squad
                              </span>
                            ) : assigned ? (
                              <span
                                className="block w-full py-1.5 px-1 bg-amber-500/10 text-amber-400 rounded-lg text-[9px] font-bold border border-amber-500/20 text-center truncate"
                                title={`Currently in ${assigned.teamName}. Click card to transfer.`}
                              >
                                Assigned: {assigned.teamName.substring(0, 10)}...
                              </span>
                            ) : (
                              <span
                                className="block w-full py-1.5 px-2 bg-[#E8A800]/10 text-[#E8A800] group-hover:bg-[#E8A800] group-hover:text-black rounded-lg text-[10px] font-bold transition-all border border-[#E8A800]/20 text-center"
                              >
                                + Add to Squad
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {paginatedPlayers.length === 0 && (
                      <div className="col-span-2 py-12 text-center text-gray-500 text-sm">
                        No players found matching your search.
                      </div>
                    )}
                  </div>

                  {totalPlayerPages > 1 && (
                    <div className="p-3 border-t border-white/5 bg-white/[0.01] flex justify-between items-center shrink-0">
                      <button 
                        onClick={() => setPlayerPage(prev => Math.max(1, prev - 1))} 
                        disabled={playerPage === 1} 
                        className="px-3 py-1 bg-white/5 hover:bg-white/10 disabled:hover:bg-white/5 text-white rounded-lg disabled:opacity-30 disabled:cursor-not-allowed text-xs transition-colors"
                      >
                        Prev
                      </button>
                      <span className="text-[11px] text-gray-400 font-medium">
                        Page {playerPage} of {totalPlayerPages}
                      </span>
                      <button 
                        onClick={() => setPlayerPage(prev => Math.min(totalPlayerPages, prev + 1))} 
                        disabled={playerPage === totalPlayerPages} 
                        className="px-3 py-1 bg-white/5 hover:bg-white/10 disabled:hover:bg-white/5 text-white rounded-lg disabled:opacity-30 disabled:cursor-not-allowed text-xs transition-colors"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* COLUMN 3: Active Squad & Prices */}
            <div className={`w-full lg:w-[34%] bg-black/40 border border-white/10 rounded-2xl flex flex-col h-[500px] lg:h-full overflow-hidden backdrop-blur-md transition-all duration-300 ${activeTab === 'roster' ? 'flex' : 'hidden lg:flex'}`}>
              {!activePlayerTeamId ? (
                <div className="flex-1 flex items-center justify-center text-gray-600 p-6">
                  Select a team on the left to manage roster
                </div>
              ) : (
                <>
                  {(() => {
                    const activeTeam = seasonTeams.find(t => t.tempId === activePlayerTeamId)!;
                    const roster = teamPlayers[activePlayerTeamId] || [];
                    const spent = roster.reduce((sum, p) => sum + p.price, 0);
                    const balance = season.startingPurse - spent;
                    const saveState = teamSaveStatus[activePlayerTeamId] || { status: 'idle', message: '' };
                    
                    const rosterPlayers = roster.map(tp => {
                      const meta = players.find(x => x.id === tp.id);
                      return {
                        id: tp.id,
                        price: tp.price,
                        name: meta?.name || "Unknown Player",
                        photoUrl: meta?.photoUrl || "",
                        seasonalPlayerStats: meta?.seasonalPlayerStats || [],
                      };
                    });

                    return (
                      <>
                        <div className="p-4 border-b border-white/5 bg-gradient-to-b from-white/[0.02] to-transparent shrink-0">
                          <h3 className="font-black text-white text-base truncate">
                            {activeTeam.name || "Unnamed Team"}
                          </h3>
                          <p className="text-gray-500 text-xs mt-0.5 truncate">
                            Manager: {activeTeam.managerName || "Unassigned"}
                          </p>

                          <div className="grid grid-cols-2 gap-4 mt-3 bg-black/50 border border-white/5 rounded-xl p-3">
                            <div className="flex flex-col">
                              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                                Squad Size
                              </span>
                              <span className="text-sm font-black text-white mt-1">
                                {rosterPlayers.length} / 25
                              </span>
                            </div>
                            <div className="flex flex-col text-right">
                              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                                Balance Remaining
                              </span>
                              <span className={`text-sm font-black mt-1 font-mono ${balance < 0 ? "text-red-400" : "text-[#E8A800]"}`}>
                                ¤ {balance.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                          {rosterPlayers.map((p) => (
                            <div 
                              key={p.id} 
                              className="flex items-center justify-between bg-white/[0.01] border border-white/5 rounded-xl p-2.5 pl-3 hover:border-white/10 transition-colors"
                            >
                              <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                                <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-800 shrink-0 border border-white/5">
                                  {p.photoUrl ? (
                                    <img src={getPhotoUrlFromDb(p.photoUrl)} alt={p.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center font-bold text-[10px] bg-gray-700 text-gray-400">
                                      {p.name.substring(0,2).toUpperCase()}
                                    </div>
                                  )}
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <span className="text-xs font-semibold text-white truncate">
                                    {p.name}
                                  </span>
                                  {(() => {
                                    const { position, rating } = getPlayerDetails(p, season.id);
                                    return (
                                      <div className="flex items-center gap-1.5 mt-0.5">
                                        <span className="text-[9px] bg-white/10 text-gray-400 font-bold px-1 py-0.2 rounded uppercase">
                                          {position}
                                        </span>
                                        {rating > 0 && (
                                          <span className="text-[9px] text-[#E8A800] font-black">
                                            {rating} OVR
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })()}
                                </div>
                              </div>

                              <div className="flex items-center gap-2.5 shrink-0">
                                <div className="flex items-center gap-1 bg-black/60 border border-white/10 focus-within:border-[#E8A800] rounded-lg px-2 py-1 max-w-[95px] transition-all">
                                  <span className="text-[#E8A800] text-[10px] font-bold font-mono">¤</span>
                                  <input 
                                    type="number" 
                                    value={p.price || 0} 
                                    onChange={(e) => updatePlayerPrice(p.id, e.target.value)}
                                    className="w-full bg-transparent border-0 text-right text-xs font-bold text-white focus:outline-none focus:ring-0 p-0"
                                    min="0"
                                  />
                                </div>

                                <button
                                  onClick={() => handleRemovePlayer(p.id)}
                                  className="text-gray-500 hover:text-red-400 hover:bg-red-500/10 p-1.5 rounded-lg transition-all"
                                  title="Remove from squad"
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          ))}
                          {rosterPlayers.length === 0 && (
                            <div className="py-20 text-center text-gray-500 text-xs italic">
                              Roster is currently empty.<br />Add players from the middle database.
                            </div>
                          )}
                        </div>

                        <div className="p-4 border-t border-white/5 bg-gradient-to-t from-white/[0.01] to-transparent shrink-0">
                          {saveState.message && (
                            <div className={`mb-3 p-2.5 rounded-lg text-xs font-medium border text-center transition-all animate-fadeIn ${
                              saveState.status === 'error' 
                                ? 'bg-red-500/10 border-red-500/20 text-red-400' 
                                : 'bg-green-500/10 border-green-500/20 text-green-400'
                            }`}>
                              {saveState.message}
                            </div>
                          )}

                          <button
                            onClick={() => handleSaveTeamRoster(activePlayerTeamId)}
                            disabled={saveState.status === 'saving' || !activeTeam.id || activeTeam.id === "new"}
                            className={`w-full py-3 px-4 font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 ${
                              !activeTeam.id || activeTeam.id === "new"
                                ? "bg-white/5 text-gray-500 border border-white/5 cursor-not-allowed"
                                : saveState.status === 'saving'
                                  ? "bg-[#E8A800]/20 text-[#E8A800] border border-[#E8A800]/30 cursor-wait"
                                  : saveState.status === 'saved'
                                    ? "bg-green-500 hover:bg-green-400 text-black shadow-[0_0_15px_rgba(34,197,94,0.3)]"
                                    : "bg-gradient-to-r from-[#E8A800] to-[#FFB347] hover:shadow-[0_0_15px_rgba(232,168,0,0.25)] text-black font-extrabold hover:scale-[1.01]"
                            }`}
                          >
                            {saveState.status === 'saving' ? (
                              <>
                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Synced Squad...
                              </>
                            ) : saveState.status === 'saved' ? (
                              <>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                                Synced to Database!
                              </>
                            ) : !activeTeam.id || activeTeam.id === "new" ? (
                              "Unsaved Team (Complete Step 2 First)"
                            ) : (
                              <>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                                </svg>
                                Sync Team to Database
                              </>
                            )}
                          </button>
                        </div>
                      </>
                    );
                  })()}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STEP 5: Awards */}
      {step === 5 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white">Step 5: Season Awards</h2>
            {renderUploadBtn("Awards")}
          </div>
          
          {/* Combined Stats Summary Table */}
          {combinedTeamStats.length > 0 && combinedTeamStats.some(t => t.played > 0) && (
            <div className="p-4 bg-black/30 border border-white/10 rounded-xl">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">📊 Combined Stats Across All Tournaments</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-500 text-xs border-b border-white/10">
                      <th className="text-left py-2 px-2">Team</th>
                      <th className="text-center py-2 px-1">MP</th>
                      <th className="text-center py-2 px-1">W</th>
                      <th className="text-center py-2 px-1">D</th>
                      <th className="text-center py-2 px-1">L</th>
                      <th className="text-center py-2 px-1 text-green-400">F</th>
                      <th className="text-center py-2 px-1 text-red-400">A</th>
                      <th className="text-center py-2 px-1">GD</th>
                      <th className="text-center py-2 px-1 text-[#E8A800]">P</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...combinedTeamStats].sort((a, b) => b.points - a.points).map((t, i) => (
                      <tr key={t.tempId} className={`border-b border-white/5 ${i === 0 ? "text-[#E8A800]" : "text-gray-300"}`}>
                        <td className="py-2 px-2 font-medium">{t.name}</td>
                        <td className="text-center py-2 px-1">{t.played}</td>
                        <td className="text-center py-2 px-1">{t.won}</td>
                        <td className="text-center py-2 px-1">{t.drawn}</td>
                        <td className="text-center py-2 px-1">{t.lost}</td>
                        <td className="text-center py-2 px-1 text-green-400 font-bold">{t.goalsFor}</td>
                        <td className="text-center py-2 px-1 text-red-400">{t.goalsAgainst}</td>
                        <td className="text-center py-2 px-1">{t.goalsFor - t.goalsAgainst}</td>
                        <td className="text-center py-2 px-1 text-[#E8A800] font-bold">{t.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 bg-black/30 border border-white/10 rounded-xl space-y-6">
              <h3 className="text-[#E8A800] font-bold border-b border-white/10 pb-2 mb-2">Team Awards</h3>
              
              {tournaments.map((t) => {
                const tournAwards = awards.tournamentAwards?.[t.id] || { winnerTeamId: "", runnerUpTeamId: "" };
                return (
                  <div key={t.id} className="space-y-4 border-b border-white/5 pb-5 last:border-0 last:pb-0">
                    <h4 className="text-white font-bold text-sm flex items-center gap-2 pl-1">
                      ⚔️ {t.name || "Unnamed Tournament"}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <SearchableSelect
                        label="🏆 Winner"
                        value={tournAwards.winnerTeamId}
                        options={[{value: "", label: "-- Select Winner --"}, ...teamAwardOptions]}
                        onChange={(val) => {
                          const updatedTournAwards = {
                            ...(awards.tournamentAwards || {}),
                            [t.id]: { ...tournAwards, winnerTeamId: val }
                          };
                          const firstTourn = tournaments[0];
                          const isFirst = firstTourn?.id === t.id;
                          setAwards({
                            ...awards,
                            tournamentAwards: updatedTournAwards,
                            ...(isFirst ? { winnerTeamId: val } : {})
                          });
                        }}
                      />

                      <SearchableSelect
                        label="🥈 Runner Up"
                        value={tournAwards.runnerUpTeamId}
                        options={[{value: "", label: "-- Select Runner Up --"}, ...teamAwardOptions]}
                        onChange={(val) => {
                          const updatedTournAwards = {
                            ...(awards.tournamentAwards || {}),
                            [t.id]: { ...tournAwards, runnerUpTeamId: val }
                          };
                          const firstTourn = tournaments[0];
                          const isFirst = firstTourn?.id === t.id;
                          setAwards({
                            ...awards,
                            tournamentAwards: updatedTournAwards,
                            ...(isFirst ? { runnerUpTeamId: val } : {})
                          });
                        }}
                      />
                    </div>
                  </div>
                );
              })}
              {tournaments.length === 0 && (
                <p className="text-xs text-gray-500 italic">No tournaments defined. Go to Step 3 to add tournaments.</p>
              )}
            </div>
            
            <div className="p-6 bg-black/30 border border-white/10 rounded-xl space-y-4">
              <h3 className="text-[#E8A800] font-bold border-b border-white/10 pb-2 mb-4">Individual Awards (Team)</h3>
              
              <div className="space-y-1">
                <SearchableSelect
                  label="⚽ Golden Boot"
                  value={awards.goldenBootTeamId}
                  options={[{value: "", label: "-- Select Golden Boot --"}, ...teamAwardOptions]}
                  onChange={(val) => setAwards({...awards, goldenBootTeamId: val})}
                />
                {goldenBootSuggestions.length > 0 && goldenBootSuggestions[0].goalsFor > 0 && (
                  <p className="text-xs text-green-400 pl-1 font-medium animate-fadeIn">
                    💡 Suggestion: <strong className="text-white font-semibold">{goldenBootSuggestions[0].name}</strong> ({goldenBootSuggestions[0].goalsFor} goals)
                  </p>
                )}
              </div>
              
              <div className="space-y-1">
                <SearchableSelect
                  label="🧤 Golden Glove"
                  value={awards.goldenGloveTeamId}
                  options={[{value: "", label: "-- Select Golden Glove --"}, ...teamAwardOptions]}
                  onChange={(val) => setAwards({...awards, goldenGloveTeamId: val})}
                />
                {goldenGloveSuggestions.length > 0 && goldenGloveSuggestions[0]?.goalsAgainst > 0 && (
                  <p className="text-xs text-blue-400 pl-1 font-medium animate-fadeIn">
                    💡 Suggestion: <strong className="text-white font-semibold">{goldenGloveSuggestions[0].name}</strong> ({goldenGloveSuggestions[0].goalsAgainst} conceded)
                  </p>
                )}
              </div>

              <div>
                <SearchableSelect
                  label="✨ Ballon d'Or"
                  value={awards.ballonDorTeamId}
                  options={[{value: "", label: "-- Select Ballon d'Or --"}, ...teamAwardOptions]}
                  onChange={(val) => setAwards({...awards, ballonDorTeamId: val})}
                />
              </div>
            </div>
            
            <div className="p-6 bg-black/30 border border-white/10 rounded-xl space-y-4 md:col-span-2">
              <h3 className="text-[#E8A800] font-bold border-b border-white/10 pb-2 mb-4">Team of the Season</h3>
              <p className="text-xs text-gray-400 mb-2">Select the teams that made it into the Team of the Season.</p>
              
              <div className="flex flex-wrap gap-2 mb-4">
                {awards.teamOfTheSeasonPlayerIds.map(tid => {
                  const t = seasonTeams.find(x => x.tempId === tid);
                  return (
                    <div key={tid} className="bg-[#E8A800]/20 text-[#E8A800] text-sm px-3 py-1 rounded-full flex items-center gap-2">
                      {t?.name || tid}
                      <button onClick={() => setAwards({...awards, teamOfTheSeasonPlayerIds: awards.teamOfTheSeasonPlayerIds.filter(x => x !== tid)})} className="hover:text-white">&times;</button>
                    </div>
                  );
                })}
              </div>

              <SearchableSelect
                value=""
                options={[{value: "", label: "-- Add Team to TOTS --"}, ...teamAwardOptions.filter(opt => !awards.teamOfTheSeasonPlayerIds.includes(opt.value))]}
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
      <div className="flex flex-col mt-8 pt-6 border-t border-white/10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={handlePrev}
              disabled={step === 1 || loading || isSaving}
              className="px-6 py-3 rounded-xl font-bold text-gray-400 hover:text-white hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Back
            </button>
            
            {saveStatus.status !== 'idle' && (
              <div className={`text-sm font-medium flex items-center gap-2 ${saveStatus.status === 'error' ? 'text-red-400' : saveStatus.status === 'saving' ? 'text-[#E8A800] animate-pulse' : 'text-green-400'}`}>
                {saveStatus.status === 'saving' && (
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                )}
                {saveStatus.message}
              </div>
            )}
          </div>
          
          {step < 6 ? (
            <button
              onClick={handleNext}
              disabled={
                isSaving ||
                (step === 1 && !season.name && !season.id)
              }
              className="px-6 py-3 bg-[#E8A800] hover:bg-[#FFB347] text-black font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving 
                ? "Saving..." 
                : (step === 4 && tournaments.filter(t => t.type !== "KNOCKOUT_ONLY").every(t => !dirtyTournaments[t.id]))
                  ? "Continue" 
                  : "Save & Continue"}
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading || isSaving}
              className="px-6 py-3 bg-green-500 hover:bg-green-400 text-black font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading || isSaving ? "Saving..." : "Complete Setup"}
            </button>
          )}
        </div>

        {/* Detailed Logs Display */}
        {saveStatus.status === 'saved' && saveStatus.logs && saveStatus.logs.length > 0 && (
          <div className="w-full bg-black/40 border border-green-500/20 rounded-xl p-4 mt-2 max-h-60 overflow-y-auto custom-scrollbar">
            <h4 className="text-green-400 font-bold mb-2 text-sm">Save Details:</h4>
            <ul className="space-y-1">
              {saveStatus.logs.map((log, idx) => (
                <li key={idx} className="text-gray-300 text-xs font-mono border-b border-white/5 pb-1 mb-1 last:border-0">{log}</li>
              ))}
            </ul>
          </div>
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
