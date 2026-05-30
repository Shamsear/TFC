"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import SearchableSelect from "@/components/ui/SearchableSelect";
import * as XLSX from "xlsx";

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
  initialManagers?: any[];
}

const STORAGE_KEY = "tfc_historical_wizard_bulk";

export default function HistoricalDataWizard({
  initialSeasons,
  initialTeams,
  players,
  initialManagers = [],
}: HistoricalDataWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isInitialized, setIsInitialized] = useState(false);

  // Form State
  const [season, setSeason] = useState({ id: "", name: "" });
  const [seasonTeams, setSeasonTeams] = useState<{ id: string; name: string; managerName: string; tempId: string; isNewManager: boolean }[]>([]);
  const [tournaments, setTournaments] = useState<{ id: string; name: string; type: string; startDate: string; groupName: string }[]>([
    { id: "t_1", name: "League", type: "LEAGUE_ONLY", startDate: new Date().toISOString().split("T")[0], groupName: "" }
  ]);
  const [stats, setStats] = useState<Record<string, { played: number, won: number, drawn: number, lost: number, goalsFor: number, goalsAgainst: number, points: number }>>({});
  const [teamPlayers, setTeamPlayers] = useState<Record<string, string[]>>({});
  const [activeTournTeams, setActiveTournTeams] = useState<Record<string, string[]>>({});
  const [rawUploadedStats, setRawUploadedStats] = useState<{ tournamentName: string; teamName: string; stats: any }[]>([]);
  
  // Helpers for Step 4: Stats Add/Remove teams per tournament
  const getTournTeams = (tournId: string) => {
    return activeTournTeams[tournId] || seasonTeams.map(t => t.tempId);
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
    }
  };

  const handleMapRawStats = (tournId: string, tournName: string, teamTempId: string, excelTeamName: string) => {
    const matched = rawUploadedStats.find(
      r => r.tournamentName.toLowerCase() === tournName.toLowerCase() &&
           r.teamName.toLowerCase() === excelTeamName.toLowerCase()
    );
    if (matched) {
      setStats(prev => ({
        ...prev,
        [`${tournId}_${teamTempId}`]: { ...matched.stats }
      }));
    }
  };
  
  // Awards State
  const [awards, setAwards] = useState<{
    winnerTeamId: string;
    runnerUpTeamId: string;
    goldenBootTeamId: string;
    goldenGloveTeamId: string;
    goldenBallTeamId: string;
    ballonDorTeamId: string;
    teamOfTheSeasonPlayerIds: string[];
  }>({
    winnerTeamId: "",
    runnerUpTeamId: "",
    goldenBootTeamId: "",
    goldenGloveTeamId: "",
    goldenBallTeamId: "",
    ballonDorTeamId: "",
    teamOfTheSeasonPlayerIds: [],
  });
  
  // UI State
  const [activePlayerTeamId, setActivePlayerTeamId] = useState<string>("");
  const [playerSearch, setPlayerSearch] = useState("");
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [teamModalSearch, setTeamModalSearch] = useState("");
  const [selectedModalTeamIds, setSelectedModalTeamIds] = useState<string[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        if (parsed.activeTournTeams) setActiveTournTeams(parsed.activeTournTeams);
        if (parsed.rawUploadedStats) setRawUploadedStats(parsed.rawUploadedStats);
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ step, season, seasonTeams, tournaments, stats, teamPlayers, awards, activeTournTeams, rawUploadedStats }));
    } catch (err) {
      console.error(err);
    }
  }, [step, season, seasonTeams, tournaments, stats, teamPlayers, awards, activeTournTeams, rawUploadedStats, isInitialized]);

  const clearDraft = () => {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    setActiveTournTeams({});
    setRawUploadedStats([]);
  };

  const handleNext = () => setStep((s) => s + 1);
  const handlePrev = () => setStep((s) => s - 1);

  // --- Fetch Existing Season Data ---
  const handleSeasonSelect = async (val: string) => {
    if (val === "new") {
      setSeason({ id: "", name: "" });
      // Reset everything else
      setSeasonTeams([]);
      setTournaments([{ id: "t_1", name: "League", type: "LEAGUE_ONLY", startDate: new Date().toISOString().split("T")[0], groupName: "" }]);
      setStats({});
      setTeamPlayers({});
      setActiveTournTeams({});
      setAwards({ winnerTeamId: "", runnerUpTeamId: "", goldenBootTeamId: "", goldenGloveTeamId: "", goldenBallTeamId: "", ballonDorTeamId: "", teamOfTheSeasonPlayerIds: [] });
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
            if (data.stats) {
              setStats(data.stats);
              // Pre-populate activeTournTeams based on keys in stats: "tournId_teamTempId"
              const prePopulated: Record<string, string[]> = {};
              Object.keys(data.stats).forEach(key => {
                const parts = key.split("_");
                const teamTempId = parts[parts.length - 1];
                const tournId = key.replace(`_${teamTempId}`, "");
                if (!prePopulated[tournId]) prePopulated[tournId] = [];
                if (!prePopulated[tournId].includes(teamTempId)) {
                  prePopulated[tournId].push(teamTempId);
                }
              });
              setActiveTournTeams(prePopulated);
            }
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
    setTournaments([...tournaments, { id: `t_${Date.now()}`, name: "", type: "KNOCKOUT_ONLY", startDate: new Date().toISOString().split("T")[0], groupName: "" }]);
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
      const teamTempId = key.split("_").pop() || "";
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

    // 4. Awards Sheet
    const awardsData = [
      ["Award Name", "Winner Name", "Tournament Name (Optional)"],
      ["League Winner", "Red Devils", "Premier League"],
      ["Runner Up", "Blue Eagles", ""],
      ["Golden Boot", "Marcus Rashford", ""],
      ["Golden Glove", "David De Gea", ""],
      ["Golden Ball", "Kevin De Bruyne", ""],
      ["Ballon d'Or", "Lionel Messi", ""],
      ["Team of the Season", "Marcus Rashford, Kevin De Bruyne", ""]
    ];
    const wsAwards = XLSX.utils.aoa_to_sheet(awardsData);
    XLSX.utils.book_append_sheet(wb, wsAwards, "Awards");

    XLSX.writeFile(wb, "historical_data_template.xlsx");
  };

  // --- Excel / CSV Upload ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const ab = evt.target?.result as ArrayBuffer;
        const wb = XLSX.read(ab, { type: "array" });

        // Parse Teams
        const wsTeams = wb.Sheets["Teams"];
        let importedSeasonTeams: any[] = [];
        if (wsTeams) {
          const teamsJson = XLSX.utils.sheet_to_json(wsTeams, { header: 1 }) as any[];
          for (let i = 1; i < teamsJson.length; i++) {
            const row = teamsJson[i];
            if (row.length === 0 || !row[0]) continue;
            const teamName = String(row[0]).trim();
            let managerName = row[1] ? String(row[1]).trim() : "";
            
            // Smart auto-fill for managerName if missing but teamName is given
            if (!managerName) {
               // Try to find the team in existing database
               const possibleTeam = initialTeams.find(t => t.name.toLowerCase() === teamName.toLowerCase());
               if (possibleTeam) {
                 // Check if this team is linked to a manager in initialManagers
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
              
              if (dbName === inputName) return true;
              if (inputManager && dbManager === inputManager) return true;
              if (dbName.includes(inputName) || inputName.includes(dbName)) return true;
              return false;
            });

            // If we found a team by managerName fallback but the team names don't match, 
            // we should probably just use the name they provided.
            const resolvedTeamName = existing ? existing.name : teamName;
            const resolvedManagerName = managerName || existing?.managerName || "";
            
            // Check if this manager is new
            const isManagerNew = !initialManagers.some(m => m.name.toLowerCase() === resolvedManagerName.toLowerCase());

            importedSeasonTeams.push({
              id: existing ? existing.id : "new",
              name: resolvedTeamName,
              originalName: teamName, // Store original input name to match subsequent sheets
              managerName: resolvedManagerName,
              tempId: `tm_${Date.now()}_${i}`,
              isNewManager: isManagerNew
            });
          }
        }
        
        // Parse Tournaments
        const wsTournaments = wb.Sheets["Tournaments"];
        let importedTournaments: any[] = [];
        if (wsTournaments) {
          const tournJson = XLSX.utils.sheet_to_json(wsTournaments, { header: 1 }) as any[];
          for (let i = 1; i < tournJson.length; i++) {
            const row = tournJson[i];
            if (row.length === 0 || !row[0]) continue;
            const tournName = String(row[0]).trim();
            const type = String(row[1] || "CUP").toUpperCase().trim();
            let startDate = row[2] ? String(row[2]).trim() : new Date().toISOString().split("T")[0];
            const groupName = row[3] ? String(row[3]).trim() : "";
            
            importedTournaments.push({
              id: `t_${Date.now()}_${i}`,
              name: tournName,
              type: ["LEAGUE", "CUP"].includes(type) ? type : "CUP",
              startDate,
              groupName
            });
          }
        }

        // Parse Stats
        let importedStats: any = {};
        const rawStatsList: any[] = [];
        for (const sheetName of wb.SheetNames) {
          if (sheetName.startsWith("Stats - ")) {
            const tournName = sheetName.replace("Stats - ", "").trim();
            const tourn = importedTournaments.find(t => t.name.toLowerCase() === tournName.toLowerCase());

            const wsStats = wb.Sheets[sheetName];
            const statsJson = XLSX.utils.sheet_to_json(wsStats, { header: 1 }) as any[];
            
            for (let i = 1; i < statsJson.length; i++) {
              const row = statsJson[i];
              if (row.length === 0 || !row[0]) continue;
              const teamName = String(row[0]).trim();
              const statsObj = {
                points: Number(row[1] || 0),
                played: Number(row[2] || 0),
                won: Number(row[3] || 0),
                drawn: Number(row[4] || 0),
                lost: Number(row[5] || 0),
                goalsFor: Number(row[6] || 0),
                goalsAgainst: Number(row[7] || 0),
              };

              rawStatsList.push({
                tournamentName: tournName,
                teamName,
                stats: statsObj
              });

              if (tourn) {
                const team = importedSeasonTeams.find(t => 
                  t.originalName.toLowerCase() === teamName.toLowerCase() ||
                  t.name.toLowerCase() === teamName.toLowerCase()
                );
                if (team) {
                  const key = `${tourn.id}_${team.tempId}`;
                  importedStats[key] = statsObj;
                }
              }
            }
          }
        }

        // Parse Awards
        const wsAwards = wb.Sheets["Awards"];
        let newAwards = { ...awards };

        if (wsAwards) {
          const awardsJson = XLSX.utils.sheet_to_json(wsAwards, { header: 1 }) as any[];
          for (let i = 1; i < awardsJson.length; i++) {
            const row = awardsJson[i];
            if (row.length === 0 || !row[0] || !row[1]) continue;
            const awardName = String(row[0]).trim().toLowerCase();
            const winnerName = String(row[1]).trim();
            
            const findTeam = (name: string) => importedSeasonTeams.find(t => 
              t.originalName.toLowerCase() === name.toLowerCase() ||
              t.name.toLowerCase() === name.toLowerCase()
            );

            if (awardName === "league winner" || awardName === "winner") {
              const team = findTeam(winnerName);
              if (team) newAwards.winnerTeamId = team.tempId;
            } else if (awardName === "runner up" || awardName === "runner-up") {
              const team = findTeam(winnerName);
              if (team) newAwards.runnerUpTeamId = team.tempId;
            } else if (awardName === "golden boot") {
              const team = findTeam(winnerName);
              if (team) newAwards.goldenBootTeamId = team.tempId;
            } else if (awardName === "golden glove") {
              const team = findTeam(winnerName);
              if (team) newAwards.goldenGloveTeamId = team.tempId;
            } else if (awardName === "golden ball") {
              const team = findTeam(winnerName);
              if (team) newAwards.goldenBallTeamId = team.tempId;
            } else if (awardName === "ballon d'or" || awardName === "ballon dor") {
              const team = findTeam(winnerName);
              if (team) newAwards.ballonDorTeamId = team.tempId;
            } else if (awardName === "team of the season") {
              const names = winnerName.split(",").map(n => n.trim());
              const tids: string[] = [];
              names.forEach(n => {
                const team = findTeam(n);
                if (team) tids.push(team.tempId);
              });
              newAwards.teamOfTheSeasonPlayerIds = tids;
            }
          }
        }

        if (importedSeasonTeams.length > 0) setSeasonTeams(importedSeasonTeams);
        if (importedTournaments.length > 0) setTournaments(importedTournaments);
        if (Object.keys(importedStats).length > 0) setStats(importedStats);
        if (rawStatsList.length > 0) setRawUploadedStats(rawStatsList);
        setAwards(newAwards);

        setStep(2);
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

  return (
    <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 sm:p-8">
      {/* Steps Indicator */}
      <div className="flex items-center justify-between mb-8 pb-8 border-b border-white/10 overflow-x-auto custom-scrollbar">
        {[
          { num: 1, label: "Season" },
          { num: 2, label: "Teams" },
          { num: 3, label: "Tournaments" },
          { num: 4, label: "Stats" },
          { num: 5, label: "Players" },
          { num: 6, label: "Awards" },
        ].map((s, idx) => (
          <div key={s.num} className="flex items-center shrink-0">
            <div className="flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg transition-colors ${step >= s.num ? "bg-gradient-to-r from-[#E8A800] to-[#FFB347] text-black" : "bg-white/10 text-gray-500"}`}>
                {s.num}
              </div>
              <span className={`text-[10px] sm:text-xs mt-1 font-medium transition-colors ${step >= s.num ? "text-[#E8A800]" : "text-gray-600"}`}>
                {s.label}
              </span>
            </div>
            {idx < 5 && <div className={`h-1 w-6 sm:w-12 mx-1 sm:mx-2 rounded mt-[-12px] ${step > s.num ? "bg-[#E8A800]" : "bg-white/10"}`} />}
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <h2 className="text-2xl font-bold text-white">Step 1: Select Season & Import</h2>
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={handleDownloadTemplate} 
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Template
              </button>
              <input 
                type="file" 
                accept=".xlsx, .xls, .csv" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
              />
              <button 
                onClick={() => fileInputRef.current?.click()} 
                className="px-4 py-2 bg-[#E8A800]/20 hover:bg-[#E8A800]/30 text-[#E8A800] rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Upload Excel
              </button>
            </div>
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
          
          {tournaments.map((tourn, index) => {
            const availableTeams = seasonTeams.filter(t => !getTournTeams(tourn.id).includes(t.tempId));
            return (
              <div key={tourn.id} className="p-4 sm:p-6 bg-black/30 border border-white/10 rounded-xl overflow-x-auto">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                  <h3 className="font-bold text-[#E8A800] text-lg">{tourn.name || `Tournament ${index + 1}`}</h3>
                  
                  {availableTeams.length > 0 && (
                    <div className="flex items-center gap-2">
                      <select
                        className="bg-black/50 border border-white/10 rounded-lg p-2 text-white text-xs focus:outline-none focus:border-[#E8A800] cursor-pointer"
                        value=""
                        onChange={(e) => {
                          if (e.target.value) {
                            handleAddTeamToTourn(tourn.id, e.target.value);
                          }
                        }}
                      >
                        <option value="">+ Add Team to Stats</option>
                        {availableTeams.map(t => (
                          <option key={t.tempId} value={t.tempId}>
                            {t.name || "Unnamed Team"}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                
                <table className="w-full text-left min-w-[670px]">
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
                      <th className="py-2 px-2 font-medium w-16 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {getTournTeams(tourn.id).map(teamTempId => {
                      const team = seasonTeams.find(t => t.tempId === teamTempId);
                      if (!team) return null;
                      
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
                          <td className="py-2 px-2 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {rawUploadedStats.filter(r => r.tournamentName.toLowerCase() === (tourn.name || "").toLowerCase()).length > 0 && (
                                <select
                                  className="bg-black/50 border border-white/10 rounded-lg p-1 text-white text-xs focus:outline-none focus:border-[#E8A800] max-w-[120px] cursor-pointer"
                                  value=""
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      handleMapRawStats(tourn.id, tourn.name, team.tempId, e.target.value);
                                    }
                                  }}
                                  title="Map/link stats from Excel"
                                >
                                  <option value="">Map Excel Stats</option>
                                  {rawUploadedStats
                                    .filter(r => r.tournamentName.toLowerCase() === (tourn.name || "").toLowerCase())
                                    .map(r => (
                                      <option key={r.teamName} value={r.teamName}>
                                        {r.teamName}
                                      </option>
                                    ))}
                                </select>
                              )}
                              <button
                                onClick={() => handleRemoveTeamFromTourn(tourn.id, team.tempId)}
                                className="text-red-500 hover:text-red-400 hover:bg-red-500/10 p-1.5 rounded-lg transition-colors shrink-0"
                                title="Remove team stats"
                              >
                                <svg className="w-4 h-4 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
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

          {/* Suggestions */}
          {goldenBootSuggestions.length > 0 && goldenBootSuggestions[0].goalsFor > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3 bg-green-500/5 border border-green-500/20 rounded-xl">
                <p className="text-xs text-green-400 font-bold uppercase tracking-wider mb-1">⚽ Golden Boot Suggestion (Most Goals)</p>
                <p className="text-white font-bold">{goldenBootSuggestions[0].name} <span className="text-green-400">({goldenBootSuggestions[0].goalsFor} goals)</span></p>
              </div>
              <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl">
                <p className="text-xs text-blue-400 font-bold uppercase tracking-wider mb-1">🧤 Golden Glove Suggestion (Fewest Conceded)</p>
                <p className="text-white font-bold">{goldenGloveSuggestions[0]?.name} <span className="text-blue-400">({goldenGloveSuggestions[0]?.goalsAgainst} conceded)</span></p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 bg-black/30 border border-white/10 rounded-xl space-y-4">
              <h3 className="text-[#E8A800] font-bold border-b border-white/10 pb-2 mb-4">Team Awards</h3>
              
              <SearchableSelect
                label="🏆 League Winner"
                value={awards.winnerTeamId}
                options={[{value: "", label: "-- Select Winner --"}, ...teamAwardOptions]}
                onChange={(val) => setAwards({...awards, winnerTeamId: val})}
              />

              <SearchableSelect
                label="🥈 Runner Up"
                value={awards.runnerUpTeamId}
                options={[{value: "", label: "-- Select Runner Up --"}, ...teamAwardOptions]}
                onChange={(val) => setAwards({...awards, runnerUpTeamId: val})}
              />
            </div>
            
            <div className="p-6 bg-black/30 border border-white/10 rounded-xl space-y-4">
              <h3 className="text-[#E8A800] font-bold border-b border-white/10 pb-2 mb-4">Individual Awards (Team)</h3>
              
              <SearchableSelect
                label="⚽ Golden Boot"
                value={awards.goldenBootTeamId}
                options={[{value: "", label: "-- Select Golden Boot --"}, ...teamAwardOptions]}
                onChange={(val) => setAwards({...awards, goldenBootTeamId: val})}
              />
              
              <SearchableSelect
                label="🧤 Golden Glove"
                value={awards.goldenGloveTeamId}
                options={[{value: "", label: "-- Select Golden Glove --"}, ...teamAwardOptions]}
                onChange={(val) => setAwards({...awards, goldenGloveTeamId: val})}
              />

              <SearchableSelect
                label="🌟 Golden Ball"
                value={awards.goldenBallTeamId}
                options={[{value: "", label: "-- Select Golden Ball --"}, ...teamAwardOptions]}
                onChange={(val) => setAwards({...awards, goldenBallTeamId: val})}
              />

              <SearchableSelect
                label="✨ Ballon d'Or"
                value={awards.ballonDorTeamId}
                options={[{value: "", label: "-- Select Ballon d'Or --"}, ...teamAwardOptions]}
                onChange={(val) => setAwards({...awards, ballonDorTeamId: val})}
              />
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
