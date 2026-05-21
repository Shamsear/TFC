'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'

interface Auction {
  id: string
  auctionDate: Date | string
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
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={previousMonth}
            className="p-2 bg-white/5 border border-white/10 hover:bg-white/10 rounded-lg transition-all"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={today}
            className="px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 rounded-lg font-bold text-sm transition-all"
          >
            Today
          </button>
          <button
            onClick={nextMonth}
            className="p-2 bg-white/5 border border-white/10 hover:bg-white/10 rounded-lg transition-all"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <div className="text-xl font-black text-white ml-2">
            {formatDate(currentDate, 'MMMM yyyy')}
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2">
          <button
            onClick={() => setView('month')}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
              view === 'month'
                ? 'bg-[#E8A800] text-[#0a0a0a]'
                : 'bg-white/5 border border-white/10 text-[#7A7367] hover:bg-white/10'
            }`}
          >
            Month
          </button>
          <button
            onClick={() => setView('list')}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
              view === 'list'
                ? 'bg-[#E8A800] text-[#0a0a0a]'
                : 'bg-white/5 border border-white/10 text-[#7A7367] hover:bg-white/10'
            }`}
          >
            List
          </button>
        </div>
      </div>

      {/* Legend - Desktop Only */}
      <div className="hidden sm:flex flex-wrap items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#E8A800]"></div>
          <span className="text-sm text-[#D4CCBB]">Auctions ({auctions.length})</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#FFB347]"></div>
          <span className="text-sm text-[#D4CCBB]">Matches ({matches.length})</span>
        </div>
      </div>

      {/* Mobile: Vertical Calendar List */}
      <div className="sm:hidden space-y-2">
        {mobileCalendarDays.map((day, index) => (
          <div
            key={day.date.toISOString()}
            className={`rounded-lg border overflow-hidden ${
              day.isToday 
                ? 'bg-[#E8A800]/5 border-[#E8A800]/30' 
                : day.isCurrentMonth 
                  ? 'bg-white/[0.02] border-white/10' 
                  : 'bg-white/[0.01] border-white/5'
            }`}
          >
            <div className="flex gap-3 p-3">
              {/* Left: Day Number */}
              <div className="flex-shrink-0 text-center w-12">
                <div className={`text-2xl font-black leading-none ${
                  day.isToday 
                    ? 'text-[#E8A800]' 
                    : day.isCurrentMonth 
                      ? 'text-[#F5F0E8]' 
                      : 'text-[#7A7367]'
                }`}>
                  {formatDate(day.date, 'd')}
                </div>
                <div className={`text-[10px] uppercase mt-0.5 font-bold ${
                  day.isCurrentMonth ? 'text-[#7A7367]' : 'text-[#3A342E]'
                }`}>
                  {formatDate(day.date, 'MMM')}
                </div>
              </div>

              {/* Right: Event Details or Empty State */}
              <div className="flex-1 min-w-0">
                {day.hasEvents ? (
                  <div className="space-y-2">
                    {/* Auctions */}
                    {day.auctions.map(auction => (
                      <Link
                        key={auction.id}
                        href={`${basePath}/auctions?auctionId=${auction.id}&from=calendar`}
                        className="block p-2 rounded bg-[#E8A800]/10 border border-[#E8A800]/20 hover:bg-[#E8A800]/20 transition-all"
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#E8A800]"></div>
                          <span className="text-[10px] font-bold text-[#E8A800] uppercase">Auction</span>
                        </div>
                        <div className="text-[#F5F0E8] font-bold text-sm mb-1">
                          {auction.description || 'Auction Round'}
                        </div>
                        <div className="text-xs text-[#D4CCBB] mb-1.5">
                          {formatDate(new Date(auction.auctionDate), 'h:mm a')}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {auction.auctionSlots.map((slot, idx) => {
                            const isBulk = slot.roundType === 'bulk';
                            const displayPosition = slot.positionHidden ? '???' : slot.position;
                            const displayGroup = slot.positionHidden ? '' : (slot.position_group && slot.position_group !== 'ALL' ? `-${slot.position_group}` : '');
                            return (
                              <span key={idx} className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-all ${
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
                        className="block p-2 rounded bg-[#FFB347]/10 border border-[#FFB347]/20 hover:bg-[#FFB347]/20 transition-all"
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#FFB347]"></div>
                          <span className="text-[10px] font-bold text-[#FFB347] uppercase">Matches</span>
                        </div>
                        <div className="text-[#F5F0E8] font-bold text-sm mb-0.5">
                          {group.tournament}
                        </div>
                        <div className="text-xs text-[#D4CCBB] mb-1.5">
                          {group.round} • {group.matches.length} {group.matches.length === 1 ? 'match' : 'matches'}
                        </div>
                        <div className="text-xs text-[#F5F0E8] space-y-0.5">
                          {group.matches.slice(0, 2).map((m, mIdx) => (
                            <div key={mIdx} className="flex items-center gap-1.5">
                              <span className="text-[#7A7367]">•</span>
                              <span className="truncate">{m.homeTeam.team.name} vs {m.awayTeam.team.name}</span>
                              {m.homeScore !== null && m.awayScore !== null && (
                                <span className="text-[#FFB347] font-bold whitespace-nowrap text-[10px]">
                                  {m.homeScore}-{m.awayScore}
                                </span>
                              )}
                            </div>
                          ))}
                          {group.matches.length > 2 && (
                            <div className="text-[#7A7367] text-[10px]">
                              +{group.matches.length - 2} more
                            </div>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center h-full">
                    <span className="text-xs text-[#3A342E]">No events</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>


      {/* Desktop: Month/List View Toggle */}
      <div className="hidden sm:block">
        {view === 'month' ? (
          /* Month View */
          <div className="rounded-xl bg-white/[0.02] border border-white/10 overflow-hidden">
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 border-b border-white/10">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="p-3 text-center text-sm font-bold text-gray-500 border-r border-white/10 last:border-r-0">
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
                    className={`min-h-32 border-r border-b border-white/10 ${
                      index % 7 === 6 ? '' : 'border-r'
                    } ${
                      !isCurrentMonth ? 'bg-white/[0.01]' : ''
                    } ${isToday ? 'bg-[#E8A800]/5' : ''}`}
                  >
                    <div className="p-2">
                      <div className={`text-sm font-bold mb-1 ${
                        isToday ? 'text-[#E8A800]' : isCurrentMonth ? 'text-[#F5F0E8]' : 'text-[#7A7367]'
                      }`}>
                        {formatDate(day, 'd')}
                      </div>

                      {hasEvents && (
                        <div className="space-y-1">
                          {events.auctions.map(auction => (
                            <Link
                              key={auction.id}
                              href={`${basePath}/auctions?auctionId=${auction.id}&from=calendar`}
                              className="block p-1.5 rounded bg-[#E8A800]/10 border border-[#E8A800]/20 text-[#E8A800] hover:bg-[#E8A800]/20 transition-all"
                              title={`Auction: ${auction.description || 'Auction Round'} - ${auction.auctionSlots.length} positions`}
                            >
                              <div className="font-bold truncate text-xs leading-tight">{auction.description || 'Auction'}</div>
                              <div className="text-[10px] opacity-70 truncate">
                                {formatDate(new Date(auction.auctionDate), 'h:mm a')}
                              </div>
                              <div className="text-[10px] opacity-70 truncate">
                                {auction.auctionSlots.map(s => {
                                  const displayPosition = s.positionHidden ? '???' : s.position;
                                  const groupPart = s.positionHidden ? '' : (s.position_group && s.position_group !== 'ALL' ? `-${s.position_group}` : '');
                                  const typePart = s.roundType === 'bulk' ? ' (Bulk)' : '';
                                  const hiddenPart = s.positionHidden ? ' (Hidden)' : '';
                                  return `${displayPosition}${groupPart}${typePart}${hiddenPart}`;
                                }).join(', ')}
                              </div>
                            </Link>
                          ))}
                          {events.matchGroups.map((group, idx) => (
                            <Link
                              key={`${group.tournamentId}-${group.round}-${idx}`}
                              href={`${basePath}/tournaments/${group.tournamentId}?round=${encodeURIComponent(group.round)}`}
                              className="block p-1.5 rounded bg-[#FFB347]/10 border border-[#FFB347]/20 text-[#FFB347] cursor-pointer hover:bg-[#FFB347]/20 transition-all"
                              title={`${group.tournament} - ${group.round} (${group.matches.length} matches)`}
                            >
                              <div className="font-bold truncate text-xs leading-tight">{group.tournament}</div>
                              <div className="text-[10px] opacity-70 truncate">{group.round}</div>
                            </Link>
                          ))}
                        </div>
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
              <div className="rounded-xl bg-white/[0.02] border border-white/10 p-12 text-center">
                <div className="text-gray-400">No events scheduled</div>
              </div>
            ) : (
              allEvents.map((event, index) => (
                event.type === 'auction' ? (
                  <Link
                    key={`${event.type}-${index}`}
                    href={`${basePath}/auctions?auctionId=${event.data.id}&from=calendar`}
                    className="block rounded-xl bg-white/[0.02] border border-white/10 p-6 hover:border-white/20 hover:bg-white/[0.04] transition-all"
                  >
                    <div className="flex items-center gap-4">
                      {/* Date */}
                      <div className="flex-shrink-0">
                        <div className="text-center p-3 rounded-lg bg-white/5 border border-white/10">
                          <div className="text-2xl font-black text-white">{formatDate(event.date, 'd')}</div>
                          <div className="text-xs text-gray-500 uppercase">{formatDate(event.date, 'MMM')}</div>
                        </div>
                      </div>

                      {/* Event Details */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 rounded-full bg-[#E8A800]"></div>
                          <span className="text-sm font-bold text-[#E8A800]">AUCTION</span>
                        </div>
                        <div className="text-[#F5F0E8] font-bold mb-1">
                          {event.data.description || 'Auction Round'}
                        </div>
                        <div className="text-sm text-[#D4CCBB] mb-2">
                          {formatDate(event.date, 'h:mm a')}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {event.data.auctionSlots.map((slot: any, idx: number) => {
                            const isBulk = slot.roundType === 'bulk';
                            const displayPosition = slot.positionHidden ? '???' : slot.position;
                            const displayGroup = slot.positionHidden ? '' : (slot.position_group && slot.position_group !== 'ALL' ? `-${slot.position_group}` : '');
                            return (
                              <span key={idx} className={`px-2 py-1 rounded border text-xs font-bold transition-all ${
                                isBulk
                                  ? 'bg-[#A855F7]/10 border-[#A855F7]/20 text-[#A855F7]'
                                  : 'bg-[#E8A800]/10 border-[#E8A800]/20 text-[#E8A800]'
                              } ${slot.positionHidden ? 'opacity-75' : ''}`}>
                                {displayPosition}{displayGroup}
                                {isBulk && <span className="text-[10px] font-normal ml-1 opacity-80">(Bulk)</span>}
                                {slot.positionHidden && <span className="text-[10px] font-normal ml-1 opacity-80">(Hidden)</span>}
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
                    className="block rounded-xl bg-white/[0.02] border border-white/10 p-6 hover:border-white/20 hover:bg-white/[0.04] transition-all"
                  >
                    <div className="flex items-center gap-4">
                      {/* Date */}
                      <div className="flex-shrink-0">
                        <div className="text-center p-3 rounded-lg bg-white/5 border border-white/10">
                          <div className="text-2xl font-black text-white">{formatDate(event.date, 'd')}</div>
                          <div className="text-xs text-gray-500 uppercase">{formatDate(event.date, 'MMM')}</div>
                        </div>
                      </div>

                      {/* Event Details */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 rounded-full bg-[#FFB347]"></div>
                          <span className="text-sm font-bold text-[#FFB347]">MATCHES</span>
                        </div>
                        <div className="text-[#F5F0E8] font-bold mb-1">
                          {event.data.tournament}
                        </div>
                        <div className="text-sm text-[#D4CCBB] mb-2">
                          {event.data.round} • {formatDate(event.date, 'h:mm a')} • {event.data.matches.length} {event.data.matches.length === 1 ? 'match' : 'matches'}
                        </div>
                        <div className="text-sm text-[#F5F0E8] space-y-1">
                          {event.data.matches.slice(0, 3).map((m: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-2">
                              <span className="text-[#7A7367]">•</span>
                              <span>{m.homeTeam.team.name} vs {m.awayTeam.team.name}</span>
                              {m.homeScore !== null && m.awayScore !== null && (
                                <span className="text-[#E8A800] font-bold">({m.homeScore}-{m.awayScore})</span>
                              )}
                            </div>
                          ))}
                          {event.data.matches.length > 3 && (
                            <div className="text-[#7A7367] text-xs">
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
