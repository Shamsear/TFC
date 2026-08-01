'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import * as XLSX from 'xlsx'

interface TournamentBreakdown {
  tournamentName: string
  tournamentType: string
  status: string
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDiff: number
  points: number
}

interface TeamStats {
  teamId: string
  name: string
  logoUrl: string | null
  managerName: string
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDiff: number
  points: number
  trophiesWon: number
  breakdown: TournamentBreakdown[]
}

interface Season {
  id: string
  name: string
  startingPurse: number
}

interface SeasonStatsClientProps {
  season: Season
  seasonTeams: any[]
}

type SortKey = 'rank' | 'name' | 'played' | 'won' | 'drawn' | 'lost' | 'goalsFor' | 'goalsAgainst' | 'goalDiff' | 'points' | 'winRate' | 'gfPerGame' | 'gaPerGame'

export default function SeasonStatsClient({ season, seasonTeams }: SeasonStatsClientProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('points')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  // Compute aggregated stats for each team
  const aggregatedStats: TeamStats[] = seasonTeams.map((st) => {
    const standings = st.standings || []
    
    const played = standings.reduce((sum: number, s: any) => sum + s.played, 0)
    const won = standings.reduce((sum: number, s: any) => sum + s.won, 0)
    const drawn = standings.reduce((sum: number, s: any) => sum + s.drawn, 0)
    const lost = standings.reduce((sum: number, s: any) => sum + s.lost, 0)
    const goalsFor = standings.reduce((sum: number, s: any) => sum + s.goalsFor, 0)
    const goalsAgainst = standings.reduce((sum: number, s: any) => sum + s.goalsAgainst, 0)
    const goalDiff = standings.reduce((sum: number, s: any) => sum + s.goalDiff, 0)
    const points = standings.reduce((sum: number, s: any) => sum + s.points, 0)

    const breakdown: TournamentBreakdown[] = standings.map((s: any) => ({
      tournamentName: s.tournament.name,
      tournamentType: s.tournament.tournamentType,
      status: s.tournament.status,
      played: s.played,
      won: s.won,
      drawn: s.drawn,
      lost: s.lost,
      goalsFor: s.goalsFor,
      goalsAgainst: s.goalsAgainst,
      goalDiff: s.goalDiff,
      points: s.points,
    }))

    return {
      teamId: st.team.id,
      name: st.team.name,
      logoUrl: st.team.logoUrl,
      managerName: st.managerName || st.team.managerName || 'N/A',
      played,
      won,
      drawn,
      lost,
      goalsFor,
      goalsAgainst,
      goalDiff,
      points,
      trophiesWon: st.trophiesWon || 0,
      breakdown,
    }
  })

  // Get default standings order (official rank index)
  const defaultRankedStats = [...aggregatedStats].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor
    return a.name.localeCompare(b.name)
  })

  // Map teamId to default rank index
  const rankMap = new Map(defaultRankedStats.map((team, idx) => [team.teamId, idx + 1]))

  // Custom sort logic
  const sortedStats = [...aggregatedStats].sort((a, b) => {
    let valA: any
    let valB: any

    switch (sortKey) {
      case 'name':
        valA = a.name.toLowerCase()
        valB = b.name.toLowerCase()
        break
      case 'rank':
        valA = rankMap.get(a.teamId) || 999
        valB = rankMap.get(b.teamId) || 999
        break
      case 'winRate':
        valA = a.played > 0 ? a.won / a.played : 0
        valB = b.played > 0 ? b.won / b.played : 0
        break
      case 'gfPerGame':
        valA = a.played > 0 ? a.goalsFor / a.played : 0
        valB = b.played > 0 ? b.goalsFor / b.played : 0
        break
      case 'gaPerGame':
        valA = a.played > 0 ? a.goalsAgainst / a.played : 0
        valB = b.played > 0 ? b.goalsAgainst / b.played : 0
        break
      default:
        valA = a[sortKey as keyof TeamStats] ?? 0
        valB = b[sortKey as keyof TeamStats] ?? 0
    }

    if (sortKey === 'name') {
      return sortDirection === 'asc'
        ? valA.localeCompare(valB)
        : valB.localeCompare(valA)
    }

    if (valA !== valB) {
      return sortDirection === 'asc' ? valA - valB : valB - valA
    }

    // Default tiebreaker if sorted values are equal
    if (b.points !== a.points) return b.points - a.points
    if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor
    return a.name.localeCompare(b.name)
  })

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDirection(key === 'name' || key === 'rank' ? 'asc' : 'desc')
    }
  }

  // Filter based on search term
  const filteredStats = sortedStats.filter(
    (team) =>
      team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      team.managerName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const toggleExpand = (teamId: string) => {
    setExpandedTeamId(expandedTeamId === teamId ? null : teamId)
  }

  // Handle Export to Excel
  const handleExport = () => {
    setIsExporting(true)
    try {
      // Prepare Sheet 1: Main Season Summary
      const summaryData = sortedStats.map((team, index) => ({
        Rank: index + 1,
        'Team Name': team.name,
        Manager: team.managerName,
        Played: team.played,
        Won: team.won,
        Drawn: team.drawn,
        Lost: team.lost,
        'Goals For (GF)': team.goalsFor,
        'Goals Against (GA)': team.goalsAgainst,
        'Goal Difference (GD)': team.goalDiff,
        Points: team.points,
        'Win Rate': team.played > 0 ? ((team.won / team.played) * 100).toFixed(1) + '%' : '0.0%',
        'GF/Match': team.played > 0 ? (team.goalsFor / team.played).toFixed(2) : '0.00',
        'GA/Match': team.played > 0 ? (team.goalsAgainst / team.played).toFixed(2) : '0.00',
        'Trophies Won': team.trophiesWon,
      }))

      // Prepare Sheet 2: Detailed Tournaments Breakdown
      const detailedData: any[] = []
      sortedStats.forEach((team) => {
        team.breakdown.forEach((t) => {
          detailedData.push({
            'Team Name': team.name,
            Manager: team.managerName,
            Tournament: t.tournamentName,
            Type: t.tournamentType,
            Status: t.status,
            Played: t.played,
            Won: t.won,
            Drawn: t.drawn,
            Lost: t.lost,
            'Goals For (GF)': t.goalsFor,
            'Goals Against (GA)': t.goalsAgainst,
            'Goal Difference (GD)': t.goalDiff,
            Points: t.points,
          })
        })
      })

      // Create Workbook
      const workbook = XLSX.utils.book_new()

      // Add Summary Sheet
      const summarySheet = XLSX.utils.json_to_sheet(summaryData)
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Season Summary')

      // Add Detailed Sheet
      const detailedSheet = XLSX.utils.json_to_sheet(detailedData)
      XLSX.utils.book_append_sheet(workbook, detailedSheet, 'Tournament Breakdown')

      // Format Summary Columns
      summarySheet['!cols'] = [
        { wch: 6 }, // Rank
        { wch: 25 }, // Team Name
        { wch: 20 }, // Manager
        { wch: 8 }, // Played
        { wch: 6 }, // Won
        { wch: 6 }, // Drawn
        { wch: 6 }, // Lost
        { wch: 10 }, // GF
        { wch: 10 }, // GA
        { wch: 10 }, // GD
        { wch: 8 }, // Points
        { wch: 10 }, // Win Rate
        { wch: 12 }, // GF/Match
        { wch: 12 }, // GA/Match
        { wch: 14 }, // Trophies Won
      ]

      // Format Detailed Columns
      detailedSheet['!cols'] = [
        { wch: 25 }, // Team Name
        { wch: 20 }, // Manager
        { wch: 25 }, // Tournament
        { wch: 18 }, // Type
        { wch: 12 }, // Status
        { wch: 8 }, // Played
        { wch: 6 }, // Won
        { wch: 6 }, // Drawn
        { wch: 6 }, // Lost
        { wch: 10 }, // GF
        { wch: 10 }, // GA
        { wch: 10 }, // GD
        { wch: 8 }, // Points
      ]

      // Save file
      const filename = `${season.name.replace(/\s+/g, '_')}_Full_Stats.xlsx`
      XLSX.writeFile(workbook, filename)
    } catch (error) {
      console.error('Failed to export stats to excel:', error)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 pt-6">
      {/* Back Link */}
      <div className="mb-6">
        <Link
          href={`/sub-admin/${season.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#E8A800] hover:text-[#FFC93A] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </Link>
      </div>

      {/* Header & Export Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl sm:text-5xl font-black text-white mb-2 bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent uppercase tracking-wider leading-none">
            Season Cumulative Stats
          </h1>
          <p className="text-[10px] sm:text-xs font-black text-gray-500 uppercase tracking-widest font-mono">
            {season.name} • Combined Tournament Standings & Performance Metrics
          </p>
        </div>

        <button
          onClick={handleExport}
          disabled={isExporting || filteredStats.length === 0}
          className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-[#E8A800] to-[#FFB347] hover:from-[#FFC93A] hover:to-[#FFB347] disabled:from-gray-700 disabled:to-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed text-black rounded-xl font-extrabold uppercase tracking-wider text-xs font-mono transition-all duration-300 shadow-[0_0_25px_rgba(232,168,0,0.15)] cursor-pointer transform active:scale-95 flex-shrink-0"
        >
          {isExporting ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-black" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Exporting...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export to Excel
            </>
          )}
        </button>
      </div>

      {/* Search Input */}
      <div className="relative rounded-3xl bg-[#0D0D0D]/90 border border-white/5 p-4 mb-6 shadow-2xl backdrop-blur-xl">
        <div className="relative">
          <input
            type="text"
            placeholder="Search by franchise name or manager..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-black/40 border border-white/5 focus:border-[#E8A800]/50 rounded-xl text-white placeholder-gray-500 font-mono text-xs uppercase tracking-wide focus:outline-none transition-all"
          />
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Main Cumulative Leaderboard */}
      {filteredStats.length === 0 ? (
        <div className="rounded-3xl bg-[#0D0D0D]/90 border border-white/5 p-12 text-center backdrop-blur-xl shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-center text-[#E8A800] mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-1 uppercase font-mono tracking-wider">No Standings Recorded</h2>
          <p className="text-gray-500 text-xs font-bold uppercase tracking-wider font-mono max-w-sm mx-auto leading-relaxed">
            {searchTerm ? "No teams match your search filter." : "No team matches or tournament standings are registered for this season."}
          </p>
        </div>
      ) : (
        <div className="rounded-3xl bg-[#0D0D0D]/90 border border-white/5 overflow-hidden shadow-2xl backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left font-mono">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.01] text-[10px] text-gray-500 font-extrabold uppercase tracking-widest select-none">
                  <th 
                    onClick={() => handleSort('rank')} 
                    className={`py-4 px-4 text-center w-12 cursor-pointer hover:text-white transition-colors ${sortKey === 'rank' ? 'text-white' : ''}`}
                  >
                    <div className="flex items-center justify-center gap-1">
                      Pos {sortKey === 'rank' ? (sortDirection === 'asc' ? '▲' : '▼') : '⇅'}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('name')} 
                    className={`py-4 px-4 cursor-pointer hover:text-white transition-colors ${sortKey === 'name' ? 'text-white' : ''}`}
                  >
                    <div className="flex items-center gap-1">
                      Franchise {sortKey === 'name' ? (sortDirection === 'asc' ? '▲' : '▼') : '⇅'}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('played')} 
                    className={`py-4 px-4 text-center cursor-pointer hover:text-white transition-colors ${sortKey === 'played' ? 'text-white' : ''}`}
                  >
                    <div className="flex items-center justify-center gap-1">
                      P {sortKey === 'played' ? (sortDirection === 'asc' ? '▲' : '▼') : '⇅'}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('won')} 
                    className={`py-4 px-4 text-center cursor-pointer hover:text-white transition-colors ${sortKey === 'won' ? 'text-white' : ''}`}
                  >
                    <div className="flex items-center justify-center gap-1">
                      W {sortKey === 'won' ? (sortDirection === 'asc' ? '▲' : '▼') : '⇅'}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('drawn')} 
                    className={`py-4 px-4 text-center cursor-pointer hover:text-white transition-colors ${sortKey === 'drawn' ? 'text-white' : ''}`}
                  >
                    <div className="flex items-center justify-center gap-1">
                      D {sortKey === 'drawn' ? (sortDirection === 'asc' ? '▲' : '▼') : '⇅'}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('lost')} 
                    className={`py-4 px-4 text-center cursor-pointer hover:text-white transition-colors ${sortKey === 'lost' ? 'text-white' : ''}`}
                  >
                    <div className="flex items-center justify-center gap-1">
                      L {sortKey === 'lost' ? (sortDirection === 'asc' ? '▲' : '▼') : '⇅'}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('goalsFor')} 
                    className={`py-4 px-4 text-center hidden md:table-cell cursor-pointer hover:text-white transition-colors ${sortKey === 'goalsFor' ? 'text-white' : ''}`}
                  >
                    <div className="flex items-center justify-center gap-1">
                      GF {sortKey === 'goalsFor' ? (sortDirection === 'asc' ? '▲' : '▼') : '⇅'}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('goalsAgainst')} 
                    className={`py-4 px-4 text-center hidden md:table-cell cursor-pointer hover:text-white transition-colors ${sortKey === 'goalsAgainst' ? 'text-white' : ''}`}
                  >
                    <div className="flex items-center justify-center gap-1">
                      GA {sortKey === 'goalsAgainst' ? (sortDirection === 'asc' ? '▲' : '▼') : '⇅'}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('goalDiff')} 
                    className={`py-4 px-4 text-center cursor-pointer hover:text-white transition-colors ${sortKey === 'goalDiff' ? 'text-white' : ''}`}
                  >
                    <div className="flex items-center justify-center gap-1">
                      GD {sortKey === 'goalDiff' ? (sortDirection === 'asc' ? '▲' : '▼') : '⇅'}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('points')} 
                    className={`py-4 px-4 text-center cursor-pointer hover:text-[#FFC93A] transition-colors ${sortKey === 'points' ? 'text-[#E8A800]' : 'text-gray-500'}`}
                  >
                    <div className="flex items-center justify-center gap-1">
                      PTS {sortKey === 'points' ? (sortDirection === 'asc' ? '▲' : '▼') : '⇅'}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('winRate')} 
                    className={`py-4 px-4 text-center hidden lg:table-cell cursor-pointer hover:text-white transition-colors ${sortKey === 'winRate' ? 'text-white' : ''}`}
                  >
                    <div className="flex items-center justify-center gap-1">
                      Win % {sortKey === 'winRate' ? (sortDirection === 'asc' ? '▲' : '▼') : '⇅'}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('gfPerGame')} 
                    className={`py-4 px-4 text-center hidden lg:table-cell cursor-pointer hover:text-white transition-colors ${sortKey === 'gfPerGame' ? 'text-white' : ''}`}
                  >
                    <div className="flex items-center justify-center gap-1">
                      GF/G {sortKey === 'gfPerGame' ? (sortDirection === 'asc' ? '▲' : '▼') : '⇅'}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('gaPerGame')} 
                    className={`py-4 px-4 text-center hidden lg:table-cell cursor-pointer hover:text-white transition-colors ${sortKey === 'gaPerGame' ? 'text-white' : ''}`}
                  >
                    <div className="flex items-center justify-center gap-1">
                      GA/G {sortKey === 'gaPerGame' ? (sortDirection === 'asc' ? '▲' : '▼') : '⇅'}
                    </div>
                  </th>
                  <th className="py-4 px-4 text-center w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs">
                {filteredStats.map((team, index) => {
                  const isExpanded = expandedTeamId === team.teamId
                  const winRate = team.played > 0 ? ((team.won / team.played) * 100).toFixed(1) + '%' : '0.0%'
                  const gfPerGame = team.played > 0 ? (team.goalsFor / team.played).toFixed(2) : '0.00'
                  const gaPerGame = team.played > 0 ? (team.goalsAgainst / team.played).toFixed(2) : '0.00'

                  return (
                    <React.Fragment key={team.teamId}>
                      <tr
                        onClick={() => toggleExpand(team.teamId)}
                        className={`hover:bg-white/[0.02] cursor-pointer transition-colors ${
                          isExpanded ? 'bg-white/[0.01]' : ''
                        }`}
                      >
                        {/* Position */}
                        <td className="py-4 px-4 text-center font-black">
                          <span
                            className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-[10px] ${
                              rankMap.get(team.teamId) === 1
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : rankMap.get(team.teamId) === 2
                                ? 'bg-gray-400/20 text-gray-300 border border-gray-400/30'
                                : rankMap.get(team.teamId) === 3
                                ? 'bg-amber-700/20 text-amber-600 border border-amber-700/30'
                                : 'bg-white/5 text-gray-400'
                            }`}
                          >
                            {rankMap.get(team.teamId)}
                          </span>
                        </td>

                        {/* Franchise name & details */}
                        <td className="py-4 px-4 font-bold text-white">
                          <div className="flex items-center gap-3">
                            <div className="relative w-8 h-8 rounded-lg bg-black/40 p-1 flex-shrink-0 flex items-center justify-center border border-white/5">
                              {team.logoUrl ? (
                                <Image
                                  src={team.logoUrl}
                                  alt={team.name}
                                  fill
                                  className="object-contain p-1 rounded-md"
                                  unoptimized
                                />
                              ) : (
                                <span className="text-xs">⚽</span>
                              )}
                            </div>
                            <div>
                              <div className="text-white hover:text-[#E8A800] transition-colors leading-tight">
                                {team.name}
                              </div>
                              <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">
                                Mgr: {team.managerName}
                              </div>
                            </div>
                            {team.trophiesWon > 0 && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/25 text-amber-400 flex items-center gap-0.5">
                                🏆 {team.trophiesWon}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* W / D / L Stats */}
                        <td className="py-4 px-4 text-center font-bold text-gray-300">{team.played}</td>
                        <td className="py-4 px-4 text-center text-emerald-400">{team.won}</td>
                        <td className="py-4 px-4 text-center text-gray-400">{team.drawn}</td>
                        <td className="py-4 px-4 text-center text-red-400">{team.lost}</td>

                        {/* GF / GA / GD */}
                        <td className="py-4 px-4 text-center text-gray-400 hidden md:table-cell">{team.goalsFor}</td>
                        <td className="py-4 px-4 text-center text-gray-400 hidden md:table-cell">{team.goalsAgainst}</td>
                        <td
                          className={`py-4 px-4 text-center font-bold ${
                            team.goalDiff > 0
                              ? 'text-emerald-400'
                              : team.goalDiff < 0
                              ? 'text-red-400'
                              : 'text-gray-400'
                          }`}
                        >
                          {team.goalDiff > 0 ? `+${team.goalDiff}` : team.goalDiff}
                        </td>

                        {/* Points */}
                        <td className="py-4 px-4 text-center font-black text-[#E8A800] text-sm">{team.points}</td>

                        {/* Expanded statistics columns */}
                        <td className="py-4 px-4 text-center text-gray-500 hidden lg:table-cell">{winRate}</td>
                        <td className="py-4 px-4 text-center text-gray-500 hidden lg:table-cell">{gfPerGame}</td>
                        <td className="py-4 px-4 text-center text-gray-500 hidden lg:table-cell">{gaPerGame}</td>

                        {/* Actions */}
                        <td className="py-4 px-4 text-center">
                          <button
                            className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] font-bold text-gray-300 uppercase transition-all flex items-center justify-center gap-1 mx-auto"
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleExpand(team.teamId)
                            }}
                          >
                            Breakdown
                            <svg
                              className={`w-3.5 h-3.5 transition-transform duration-300 ${
                                isExpanded ? 'rotate-180' : ''
                              }`}
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2.5}
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        </td>
                      </tr>

                      {/* Expandable Breakdown Drawer */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={14} className="p-0 bg-black/40 border-b border-white/5">
                            <div className="p-6 space-y-4 animate-[slideDown_0.2s_ease-out]">
                              <h4 className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest font-mono">
                                Tournament Performance Detail for {team.name}
                              </h4>
                              {team.breakdown.length === 0 ? (
                                <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold py-4">
                                  No standings from tournaments registered.
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {team.breakdown.map((t, idx) => (
                                    <div
                                      key={idx}
                                      className="rounded-2xl border border-white/5 bg-white/[0.01] p-4 flex flex-col justify-between space-y-3"
                                    >
                                      <div className="flex justify-between items-start">
                                        <div>
                                          <div className="font-extrabold text-white text-xs uppercase">
                                            {t.tournamentName}
                                          </div>
                                          <div className="text-[9px] text-gray-500 font-semibold uppercase tracking-wider font-mono mt-0.5">
                                            {t.tournamentType.replace('_', ' ')} • {t.status}
                                          </div>
                                        </div>
                                        <div className="px-2 py-0.5 rounded bg-[#E8A800]/10 border border-[#E8A800]/25 text-[#E8A800] text-[10px] font-black uppercase font-mono">
                                          {t.points} PTS
                                        </div>
                                      </div>

                                      <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
                                        <div className="bg-white/5 rounded-lg p-2">
                                          <div className="text-gray-500 uppercase font-bold mb-0.5">P</div>
                                          <div className="font-black text-white">{t.played}</div>
                                        </div>
                                        <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-2">
                                          <div className="text-emerald-500/60 uppercase font-bold mb-0.5">W</div>
                                          <div className="font-black text-emerald-400">{t.won}</div>
                                        </div>
                                        <div className="bg-white/5 rounded-lg p-2">
                                          <div className="text-gray-500 uppercase font-bold mb-0.5">D</div>
                                          <div className="font-black text-white">{t.drawn}</div>
                                        </div>
                                        <div className="bg-red-500/5 border border-red-500/10 rounded-lg p-2">
                                          <div className="text-red-500/60 uppercase font-bold mb-0.5">L</div>
                                          <div className="font-black text-red-400">{t.lost}</div>
                                        </div>
                                      </div>

                                      <div className="flex items-center justify-between text-[9px] border-t border-white/5 pt-2 text-gray-500 uppercase font-bold">
                                        <div className="flex gap-3">
                                          <span>GF: <span className="text-white">{t.goalsFor}</span></span>
                                          <span>GA: <span className="text-white">{t.goalsAgainst}</span></span>
                                        </div>
                                        <div>
                                          GD:{' '}
                                          <span
                                            className={
                                              t.goalDiff > 0
                                                ? 'text-emerald-400 font-bold'
                                                : t.goalDiff < 0
                                                ? 'text-red-400 font-bold'
                                                : 'text-white'
                                            }
                                          >
                                            {t.goalDiff > 0 ? `+${t.goalDiff}` : t.goalDiff}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
