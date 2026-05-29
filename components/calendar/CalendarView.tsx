'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'

interface Auction {
  id: string
  auctionDate: Date | string
  endDate?: Date | string | null
  description: string | null
  auctionSlots: Array<{
    position: string
    position_group?: string | null
    roundType?: string | null
    positionHidden?: boolean | null
  }>
}

interface Match {
  id: string
  matchDate: Date | string
  round: string | null
  homeTeam: {
    team: {
      name: string
    }
  }
  awayTeam: {
    team: {
      name: string
    }
  }
  tournament: {
    id: string
    name: string
  }
  status: string
  homeScore: number | null
  awayScore: number | null
}

interface CalendarViewProps {
  auctions: Auction[]
  matches: Match[]
  basePath?: string // Base path for links (e.g., '/team' or '')
}

export default function CalendarView({ auctions, matches, basePath = '' }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<'month' | 'list'>('month')

  const formatICSDate = (dateString: string | Date) => {
    const d = new Date(dateString)
    return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  }

  const handleExportICal = () => {
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Turf Cats//League Calendar//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH'
    ]

    // Export auctions
    auctions.forEach((auction) => {
      const start = formatICSDate(auction.auctionDate)
      // Assume 2 hour duration if no end date
      const end = auction.endDate ? formatICSDate(auction.endDate) : formatICSDate(new Date(new Date(auction.auctionDate).getTime() + 2 * 60 * 60 * 1000))
      
      const slots = auction.auctionSlots.map(s => {
        const displayPosition = s.positionHidden ? '???' : s.position;
        const displayGroup = s.positionHidden ? '' : (s.position_group && s.position_group !== 'ALL' ? `-${s.position_group}` : '');
        return `${displayPosition}${displayGroup}${s.roundType === 'bulk' ? ' (Bulk)' : ''}`;
      }).join(', ')

      icsContent.push(
        'BEGIN:VEVENT',
        `UID:auction-${auction.id}@turfcats.app`,
        `DTSTART:${start}`,
        `DTEND:${end}`,
        `SUMMARY:Turf Cats Auction - ${auction.description || 'Round'}`,
        `DESCRIPTION:Auction slots: ${slots}`,
        'END:VEVENT'
      )
    })

    // Export matches
    matches.forEach((match) => {
      const matchDateStr = match.matchDate
      const start = formatICSDate(matchDateStr)
      // Assume 1 hour duration
      const end = formatICSDate(new Date(new Date(matchDateStr).getTime() + 1 * 60 * 60 * 1000))

      let summary = `${match.homeTeam.team.name} vs ${match.awayTeam.team.name} (${match.tournament.name})`
      if (match.status === 'WALKOVER') {
        const winner = match.homeScore! > match.awayScore! ? match.homeTeam.team.name : match.awayTeam.team.name
        summary = `[W/O] ${match.homeTeam.team.name} vs ${match.awayTeam.team.name} - Winner: ${winner}`
      } else if (match.status === 'VOID') {
        summary = `[VOID] ${match.homeTeam.team.name} vs ${match.awayTeam.team.name}`
      } else if (match.status === 'COMPLETED' && match.homeScore !== null && match.awayScore !== null) {
        summary = `${match.homeTeam.team.name} ${match.homeScore}-${match.awayScore} ${match.awayTeam.team.name}`
      }

      icsContent.push(
        'BEGIN:VEVENT',
        `UID:match-${match.id}@turfcats.app`,
        `DTSTART:${start}`,
        `DTEND:${end}`,
        `SUMMARY:${summary}`,
        `DESCRIPTION:Tournament: ${match.tournament.name}\\nRound: ${match.round || 'N/A'}\\nStatus: ${match.status}`,
        'END:VEVENT'
      )
    })

    icsContent.push('END:VCALENDAR')

    const blob = new Blob([icsContent.join('\r\n')], { type: 'text/calendar;charset=utf-8' })
    const link = document.createElement('a')
    link.href = window.URL.createObjectURL(blob)
    link.setAttribute('download', 'turfcats-calendar.ics')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Helper functions for date manipulation
  const getMonthStart = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1)
  }

  const getMonthEnd = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0)
  }

  const getWeekStart = (date: Date) => {
    const day = date.getDay()
    const diff = date.getDate() - day
    return new Date(date.getFullYear(), date.getMonth(), diff)
  }

  const getWeekEnd = (date: Date) => {
    const day = date.getDay()
    const diff = date.getDate() + (6 - day)
    return new Date(date.getFullYear(), date.getMonth(), diff)
  }

  const getDaysInRange = (start: Date, end: Date) => {
    const days = []
    const current = new Date(start)
    while (current <= end) {
      days.push(new Date(current))
      current.setDate(current.getDate() + 1)
    }
    return days
  }

  const isSameDay = (date1: Date, date2: Date) => {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate()
  }

  const isSameMonth = (date1: Date, date2: Date) => {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth()
  }

  const formatDate = (date: Date, format: string) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const monthsFull = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    
    if (format === 'd') return date.getDate().toString()
    if (format === 'MMM') return months[date.getMonth()]
    if (format === 'MMMM yyyy') return `${monthsFull[date.getMonth()]} ${date.getFullYear()}`
    if (format === 'h:mm a') {
      const hours = date.getHours()
      const minutes = date.getMinutes()
      const ampm = hours >= 12 ? 'PM' : 'AM'
      const displayHours = hours % 12 || 12
      return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`
    }
    return date.toLocaleDateString()
  }

  // Get calendar days
  const monthStart = getMonthStart(currentDate)
  const monthEnd = getMonthEnd(currentDate)
  const calendarStart = getWeekStart(monthStart)
  const calendarEnd = getWeekEnd(monthEnd)
  const calendarDays = getDaysInRange(calendarStart, calendarEnd)

  // Group matches by tournament and round for a specific day
  const getEventsForDay = (day: Date) => {
    const dayAuctions = auctions.filter(a => {
      const auctionDate = new Date(a.auctionDate)
      return isSameDay(auctionDate, day)
    })
    
    const dayMatches = matches.filter(m => {
      const matchDate = new Date(m.matchDate)
      return isSameDay(matchDate, day)
    })

    // Group matches by tournament and round
    const groupedMatches = new Map<string, { tournament: string, tournamentId: string, round: string, matches: Match[] }>()
    dayMatches.forEach(m => {
      const key = `${m.tournament.id}-${m.round || 'Matchday'}`
      if (!groupedMatches.has(key)) {
        groupedMatches.set(key, {
          tournament: m.tournament.name,
          tournamentId: m.tournament.id,
          round: m.round || 'Matchday',
          matches: []
        })
      }
      groupedMatches.get(key)!.matches.push(m)
    })

    return { auctions: dayAuctions, matchGroups: Array.from(groupedMatches.values()) }
  }

  // Get all events sorted by date (grouped)
  const allEvents = useMemo(() => {
    const events: Array<{ type: 'auction' | 'matchGroup', date: Date, data: any }> = []
    
    auctions.forEach(a => {
      events.push({ type: 'auction', date: new Date(a.auctionDate), data: a })
    })
    
    // Group matches by date, tournament, and round
    const matchesByDate = new Map<string, Map<string, { tournament: string, tournamentId: string, round: string, matches: Match[] }>>()
    
    matches.forEach(m => {
      const matchDate = new Date(m.matchDate)
      const dateKey = matchDate.toDateString()
      
      if (!matchesByDate.has(dateKey)) {
        matchesByDate.set(dateKey, new Map())
      }
      
      const dayGroups = matchesByDate.get(dateKey)!
      const groupKey = `${m.tournament.id}-${m.round || 'Matchday'}`
      
      if (!dayGroups.has(groupKey)) {
        dayGroups.set(groupKey, {
          tournament: m.tournament.name,
          tournamentId: m.tournament.id,
          round: m.round || 'Matchday',
          matches: []
        })
      }
      
      dayGroups.get(groupKey)!.matches.push(m)
    })
    
    // Convert to events array
    matchesByDate.forEach((dayGroups, dateKey) => {
      const date = new Date(dateKey)
      dayGroups.forEach(group => {
        events.push({ type: 'matchGroup', date, data: group })
      })
    })
    
    return events.sort((a, b) => a.date.getTime() - b.date.getTime())
  }, [auctions, matches])

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const today = () => setCurrentDate(new Date())

  // Get all calendar days with their events for mobile list view
  const mobileCalendarDays = useMemo(() => {
    return calendarDays.map(day => {
      const events = getEventsForDay(day)
      return {
        date: day,
        auctions: events.auctions,
        matchGroups: events.matchGroups,
        isCurrentMonth: isSameMonth(day, currentDate),
        isToday: isSameDay(day, new Date()),
        hasEvents: events.auctions.length > 0 || events.matchGroups.length > 0
      }
    })
  }, [calendarDays, auctions, matches, currentDate])

  return (
    <div className="space-y-6 relative z-10">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={previousMonth}
            className="p-2.5 bg-white/[0.02] border border-white/10 hover:bg-white/10 hover:border-white/20 active:scale-95 rounded-xl transition-all cursor-pointer shadow-md"
          >
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={today}
            className="px-4 py-2 bg-white/[0.02] border border-white/10 hover:bg-white/10 hover:border-white/20 active:scale-95 rounded-xl font-extrabold uppercase tracking-wider text-xs transition-all cursor-pointer shadow-md"
          >
            Today
          </button>
          <button
            onClick={nextMonth}
            className="p-2.5 bg-white/[0.02] border border-white/10 hover:bg-white/10 hover:border-white/20 active:scale-95 rounded-xl transition-all cursor-pointer shadow-md"
          >
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <div className="text-xl font-black text-white ml-2 tracking-tight">
            {formatDate(currentDate, 'MMMM yyyy')}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportICal}
            className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 hover:border-emerald-500/50 hover:bg-emerald-500/25 text-emerald-400 rounded-xl font-extrabold uppercase tracking-wider text-xs active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-950/10"
            title="Download iCal calendar feed (.ics) for Google/Apple Calendar"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export (.ics)
          </button>

          <div className="hidden sm:flex items-center gap-1.5 p-1 bg-white/[0.02] border border-white/5 rounded-xl backdrop-blur-md shadow-inner">
            <button
              onClick={() => setView('month')}
              className={`px-4 py-2 rounded-lg font-extrabold uppercase tracking-wider text-xs transition-all cursor-pointer ${
                view === 'month'
                  ? 'bg-[#E8A800] text-[#0a0a0a] shadow-md shadow-[#E8A800]/25'
                  : 'bg-transparent text-gray-500 hover:text-white'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setView('list')}
              className={`px-4 py-2 rounded-lg font-extrabold uppercase tracking-wider text-xs transition-all cursor-pointer ${
                view === 'list'
                  ? 'bg-[#E8A800] text-[#0a0a0a] shadow-md shadow-[#E8A800]/25'
                  : 'bg-transparent text-gray-500 hover:text-white'
              }`}
            >
              List
            </button>
          </div>
        </div>
      </div>

      {/* Legend - Desktop Only */}
      <div className="hidden sm:flex flex-wrap items-center gap-4 p-4 rounded-xl bg-white/[0.01] border border-white/5 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#E8A800] shadow-[0_0_8px_rgba(232,168,0,0.5)]"></div>
          <span className="text-xs font-bold text-[#D4CCBB] uppercase tracking-wider">Auctions ({auctions.length})</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
          <span className="text-xs font-bold text-[#D4CCBB] uppercase tracking-wider">Matches ({matches.length})</span>
        </div>
      </div>

      {/* Mobile: Vertical Calendar List */}
      <div className="sm:hidden space-y-3 relative z-10">
        {mobileCalendarDays.map((day, index) => (
          <div
            key={day.date.toISOString()}
            className={`rounded-2xl border backdrop-blur-md overflow-hidden transition-all duration-200 ${
              day.isToday 
                ? 'bg-emerald-500/[0.03] border-emerald-500/30 shadow-lg shadow-emerald-950/10' 
                : day.isCurrentMonth 
                  ? 'bg-white/[0.02] border-white/5 hover:border-white/15' 
                  : 'bg-white/[0.005] border-white/5 opacity-55'
            }`}
          >
            <div className="flex gap-3 p-4">
              {/* Left: Day Number */}
              <div className="flex-shrink-0 text-center w-12 flex flex-col justify-center">
                <div className={`text-2xl font-black leading-none font-mono tracking-tight ${
                  day.isToday 
                    ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]' 
                    : day.isCurrentMonth 
                      ? 'text-[#F5F0E8]' 
                      : 'text-[#7A7367]'
                }`}>
                  {formatDate(day.date, 'd')}
                </div>
                <div className={`text-[9px] font-extrabold uppercase mt-1 tracking-wider ${
                  day.isCurrentMonth ? 'text-[#7A7367]' : 'text-[#3A342E]'
                }`}>
                  {formatDate(day.date, 'MMM')}
                </div>
              </div>

              {/* Right: Event Details or Empty State */}
              <div className="flex-1 min-w-0">
                {day.hasEvents ? (
                  <div className="space-y-3">
                    {/* Auctions */}
                    {day.auctions.map(auction => (
                      <Link
                        key={auction.id}
                        href={`${basePath}/auctions?auctionId=${auction.id}&from=calendar`}
                        className="block p-3 rounded-xl bg-[#E8A800]/5 border border-[#E8A800]/20 hover:border-[#E8A800]/40 transition-all"
                      >
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#E8A800] animate-pulse" />
                          <span className="text-[9px] font-extrabold text-[#E8A800] uppercase tracking-wider">Auction</span>
                        </div>
                        <div className="text-[#F5F0E8] font-extrabold text-sm mb-1">
                          {auction.description || 'Auction Round'}
                        </div>
                        <div className="text-xs text-[#D4CCBB] font-semibold mb-1 font-mono">
                          {formatDate(new Date(auction.auctionDate), 'h:mm a')}
                        </div>
                        {auction.endDate && (
                          <div className="text-[10px] text-red-400 mb-2 flex items-center gap-1 font-semibold">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Deadline: {formatDate(new Date(auction.endDate), 'h:mm a')}</span>
                          </div>
                        )}
                        <div className="flex flex-wrap gap-1.5">
                          {auction.auctionSlots.map((slot, idx) => {
                            const isBulk = slot.roundType === 'bulk';
                            const displayPosition = slot.positionHidden ? '???' : slot.position;
                            const displayGroup = slot.positionHidden ? '' : (slot.position_group && slot.position_group !== 'ALL' ? `-${slot.position_group}` : '');
                            return (
                              <span key={idx} className={`px-2 py-0.5 rounded-lg text-[9px] font-extrabold border transition-all ${
                                isBulk 
                                  ? 'bg-[#A855F7]/10 border-[#A855F7]/20 text-[#A855F7]' 
                                  : 'bg-[#E8A800]/10 border-[#E8A800]/20 text-[#E8A800]'
                              } ${slot.positionHidden ? 'opacity-75' : ''}`}>
                                {displayPosition}{displayGroup}
                                {isBulk && <span className="text-[8px] font-normal ml-0.5 opacity-80">(Bulk)</span>}
                                {slot.positionHidden && <span className="text-[8px] font-normal ml-0.5 opacity-80">(Hidden)</span>}
                              </span>
                            );
                          })}
                        </div>
                      </Link>
                    ))}

                    {/* Match Groups */}
                    {day.matchGroups.map((group, idx) => (
                      <Link
                        key={`${group.tournamentId}-${group.round}-${idx}`}
                        href={`${basePath}/tournaments/${group.tournamentId}?round=${encodeURIComponent(group.round)}`}
                        className="block p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 hover:border-emerald-500/40 transition-all"
                      >
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span className="text-[9px] font-extrabold text-[#34D399] uppercase tracking-wider">Matches</span>
                        </div>
                        <div className="text-[#F5F0E8] font-extrabold text-sm mb-0.5">
                          {group.tournament}
                        </div>
                        <div className="text-xs text-[#D4CCBB] font-semibold mb-2">
                          {group.round} • {group.matches.length} {group.matches.length === 1 ? 'match' : 'matches'}
                        </div>
                        <div className="text-xs text-[#F5F0E8] space-y-1">
                          {group.matches.slice(0, 2).map((m, mIdx) => (
                            <div key={mIdx} className="flex items-center gap-1.5">
                              <span className="text-[#7A7367]">•</span>
                              <span className="truncate">{m.homeTeam.team.name} vs {m.awayTeam.team.name}</span>
                              {m.status === 'WALKOVER' ? (
                                <span className="text-purple-400 font-bold whitespace-nowrap text-[10px]">
                                  (W/O)
                                </span>
                              ) : m.status === 'VOID' ? (
                                <span className="text-slate-400 font-bold whitespace-nowrap text-[10px]">
                                  (VOID)
                                </span>
                              ) : m.homeScore !== null && m.awayScore !== null && (
                                <span className="text-emerald-400 font-extrabold whitespace-nowrap text-[10px] font-mono bg-emerald-500/10 border border-emerald-500/20 px-1 rounded">
                                  {m.homeScore}–{m.awayScore}
                                </span>
                              )}
                            </div>
                          ))}
                          {group.matches.length > 2 && (
                            <div className="text-[#7A7367] text-[10px] font-bold uppercase tracking-wider mt-1">
                              +{group.matches.length - 2} more
                            </div>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center h-full">
                    <span className="text-xs text-[#3A342E] font-medium italic">No events scheduled</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: Month/List View Switcher */}
      <div className="hidden sm:block relative z-10">
        {view === 'month' ? (
          /* Month View */
          <div className="rounded-2xl bg-white/[0.01] border border-white/5 overflow-hidden backdrop-blur-xl shadow-xl">
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 border-b border-white/5 bg-white/[0.01]">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="p-3 text-center text-xs font-extrabold text-[#7A7367] border-r border-white/5 last:border-r-0 uppercase tracking-widest">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7">
              {calendarDays.map((day, index) => {
                const events = getEventsForDay(day)
                const isCurrentMonth = isSameMonth(day, currentDate)
                const isToday = isSameDay(day, new Date())
                const hasEvents = events.auctions.length > 0 || events.matchGroups.length > 0

                return (
                  <div
                    key={day.toISOString()}
                    className={`min-h-[140px] border-r border-b border-white/5 p-2 transition-all duration-300 relative group/cell hover:bg-white/[0.02] ${
                      index % 7 === 6 ? '' : 'border-r'
                    } ${
                      !isCurrentMonth ? 'bg-white/[0.005] opacity-50' : 'bg-transparent'
                    } ${isToday ? 'bg-emerald-500/[0.03] shadow-[inset_0_0_15px_rgba(16,185,129,0.05)]' : ''}`}
                  >
                    <div className="h-full flex flex-col justify-between">
                      <div className={`text-sm font-black mb-1.5 flex items-center justify-between font-mono ${
                        isToday ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]' : isCurrentMonth ? 'text-white' : 'text-[#7A7367]'
                      }`}>
                        <span>{formatDate(day, 'd')}</span>
                        {isToday && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />}
                      </div>

                      {hasEvents ? (
                        <div className="space-y-1.5 mt-auto">
                          {events.auctions.map(auction => (
                            <Link
                              key={auction.id}
                              href={`${basePath}/auctions?auctionId=${auction.id}&from=calendar`}
                              className="block p-2 rounded-xl bg-[#E8A800]/10 border border-[#E8A800]/20 hover:border-[#E8A800]/50 text-[#E8A800] hover:bg-[#E8A800]/20 transition-all shadow-sm"
                              title={`Auction: ${auction.description || 'Auction Round'} - ${auction.auctionSlots.length} positions${auction.endDate ? ` - Deadline: ${formatDate(new Date(auction.endDate), 'h:mm a')}` : ''}`}
                            >
                              <div className="font-extrabold truncate text-[11px] leading-tight tracking-wide">{auction.description || 'Auction'}</div>
                              <div className="text-[9px] opacity-70 truncate font-semibold font-mono mt-0.5">
                                {formatDate(new Date(auction.auctionDate), 'h:mm a')}
                              </div>
                            </Link>
                          ))}
                          {events.matchGroups.map((group, idx) => (
                            <Link
                              key={`${group.tournamentId}-${group.round}-${idx}`}
                              href={`${basePath}/tournaments/${group.tournamentId}?round=${encodeURIComponent(group.round)}`}
                              className="block p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:border-emerald-500/50 text-emerald-400 cursor-pointer hover:bg-emerald-500/20 transition-all shadow-sm"
                              title={`${group.tournament} - ${group.round} (${group.matches.length} matches)`}
                            >
                              <div className="font-extrabold truncate text-[11px] leading-tight tracking-wide">{group.tournament}</div>
                              <div className="text-[9px] opacity-70 truncate font-semibold font-mono mt-0.5">{group.round}</div>
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <div className="flex-1" />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          /* List View */
          <div className="space-y-3">
            {allEvents.length === 0 ? (
              <div className="rounded-2xl bg-white/[0.01] border border-white/5 p-12 text-center backdrop-blur-xl">
                <div className="text-gray-500 font-bold uppercase tracking-wider text-sm">No events scheduled</div>
              </div>
            ) : (
              allEvents.map((event, index) => (
                event.type === 'auction' ? (
                  <Link
                    key={`${event.type}-${index}`}
                    href={`${basePath}/auctions?auctionId=${event.data.id}&from=calendar`}
                    className="block rounded-2xl bg-white/[0.01] border border-white/5 hover:border-white/15 p-5 hover:bg-white/[0.03] transition-all backdrop-blur-md shadow-lg"
                  >
                    <div className="flex items-center gap-4">
                      {/* Date */}
                      <div className="flex-shrink-0">
                        <div className="text-center p-3 rounded-xl bg-white/[0.02] border border-white/10 w-16">
                          <div className="text-2xl font-black text-white font-mono">{formatDate(event.date, 'd')}</div>
                          <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">{formatDate(event.date, 'MMM')}</div>
                        </div>
                      </div>

                      {/* Event Details */}
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5 mb-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#E8A800] animate-pulse" />
                          <span className="text-[10px] font-extrabold text-[#E8A800] tracking-wider uppercase">AUCTION</span>
                        </div>
                        <div className="text-white font-extrabold text-base mb-1 tracking-wide">
                          {event.data.description || 'Auction Round'}
                        </div>
                        <div className="text-xs text-[#D4CCBB] font-semibold mb-2 font-mono">
                          {formatDate(event.date, 'h:mm a')}
                        </div>
                        {event.data.endDate && (
                          <div className="text-xs text-red-400 mb-3 flex items-center gap-1.5 font-semibold">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Deadline: {formatDate(new Date(event.data.endDate), 'h:mm a')}</span>
                          </div>
                        )}
                        <div className="flex flex-wrap gap-1.5">
                          {event.data.auctionSlots.map((slot: any, idx: number) => {
                            const isBulk = slot.roundType === 'bulk';
                            const displayPosition = slot.positionHidden ? '???' : slot.position;
                            const displayGroup = slot.positionHidden ? '' : (slot.position_group && slot.position_group !== 'ALL' ? `-${slot.position_group}` : '');
                            return (
                              <span key={idx} className={`px-2.5 py-0.5 rounded-lg border text-[10px] font-extrabold transition-all ${
                                isBulk
                                  ? 'bg-[#A855F7]/10 border-[#A855F7]/20 text-[#A855F7]'
                                  : 'bg-[#E8A800]/10 border-[#E8A800]/20 text-[#E8A800]'
                              } ${slot.positionHidden ? 'opacity-75' : ''}`}>
                                {displayPosition}{displayGroup}
                                {isBulk && <span className="text-[9px] font-normal ml-1 opacity-80">(Bulk)</span>}
                                {slot.positionHidden && <span className="text-[9px] font-normal ml-1 opacity-80">(Hidden)</span>}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </Link>
                ) : (
                  <Link
                    key={`${event.type}-${index}`}
                    href={`${basePath}/tournaments/${event.data.tournamentId}?round=${encodeURIComponent(event.data.round)}`}
                    className="block rounded-2xl bg-white/[0.01] border border-white/5 hover:border-white/15 p-5 hover:bg-white/[0.03] transition-all backdrop-blur-md shadow-lg"
                  >
                    <div className="flex items-center gap-4">
                      {/* Date */}
                      <div className="flex-shrink-0">
                        <div className="text-center p-3 rounded-xl bg-white/[0.02] border border-white/10 w-16">
                          <div className="text-2xl font-black text-white font-mono">{formatDate(event.date, 'd')}</div>
                          <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">{formatDate(event.date, 'MMM')}</div>
                        </div>
                      </div>

                      {/* Event Details */}
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5 mb-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span className="text-[10px] font-extrabold text-[#34D399] tracking-wider uppercase">MATCHES</span>
                        </div>
                        <div className="text-white font-extrabold text-base mb-1 tracking-wide">
                          {event.data.tournament}
                        </div>
                        <div className="text-xs text-[#D4CCBB] font-semibold mb-3">
                          {event.data.round} <span className="text-white/20">•</span> <span className="font-mono">{formatDate(event.date, 'h:mm a')}</span> <span className="text-white/20">•</span> {event.data.matches.length} {event.data.matches.length === 1 ? 'match' : 'matches'}
                        </div>
                        <div className="text-xs text-[#F5F0E8] space-y-1.5 max-w-xl">
                          {event.data.matches.slice(0, 3).map((m: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-2">
                              <span className="text-[#7A7367]">•</span>
                              <span className="font-medium text-white/90">{m.homeTeam.team.name} vs {m.awayTeam.team.name}</span>
                              {m.status === 'WALKOVER' ? (
                                <span className="text-purple-400 font-extrabold text-[10px] uppercase bg-purple-500/10 px-1 rounded">(W/O)</span>
                              ) : m.status === 'VOID' ? (
                                <span className="text-slate-400 font-extrabold text-[10px] uppercase bg-slate-500/10 px-1 rounded">(VOID)</span>
                              ) : m.homeScore !== null && m.awayScore !== null && (
                                <span className="text-emerald-400 font-extrabold text-[10px] font-mono bg-emerald-500/10 border border-emerald-500/20 px-1.5 rounded">
                                  {m.homeScore}–{m.awayScore}
                                </span>
                              )}
                            </div>
                          ))}
                          {event.data.matches.length > 3 && (
                            <div className="text-[#7A7367] text-[10px] font-bold uppercase tracking-wider mt-2">
                              +{event.data.matches.length - 3} more matches
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
