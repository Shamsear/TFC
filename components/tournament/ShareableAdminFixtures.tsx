'use client'

import { useRef, useState } from 'react'
import { captureTableAsPng } from '@/lib/share-table'

interface ShareableAdminFixturesProps {
  matches: any[]
  tournamentName: string
  seasonName: string
  activeRound: string
}

type MatchFilter = 'all' | 'pending' | 'completed'

function AdminFixturesSnapshot({
  matches,
  tournamentName,
  seasonName,
  activeRound,
  matchFilter,
}: ShareableAdminFixturesProps & { matchFilter: MatchFilter }) {
  
  const formatDate = (date: Date | string) => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date))
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      SCHEDULED: '#60a5fa', // blue-400
      LIVE: '#34d399', // emerald-400
      COMPLETED: '#7A7367',
      POSTPONED: '#facc15', // yellow-400
      CANCELLED: '#f87171', // red-400
      WALKOVER: '#c084fc', // purple-400
      VOID: '#94a3b8' // slate-400
    }
    return colors[status] || colors.SCHEDULED
  }

  // Filter matches based on matchFilter
  const filteredMatches = matches.filter(match => {
    if (matchFilter === 'all') return true
    if (matchFilter === 'completed') return match.status === 'COMPLETED' || match.status === 'WALKOVER'
    if (matchFilter === 'pending') return match.status !== 'COMPLETED' && match.status !== 'WALKOVER'
    return true
  })

  const getFilterLabel = () => {
    if (matchFilter === 'completed') return 'Completed Matches'
    if (matchFilter === 'pending') return 'Pending Matches'
    return 'All Matches'
  }

  return (
    <div
      style={{
        background: 'radial-gradient(circle at top left, #121e1a, #070707)',
        padding: '48px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        width: '1200px',
        boxSizing: 'border-box',
        border: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 36, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '24px' }}>
        <div>
          <div style={{ color: '#10b981', fontSize: 13, fontWeight: 900, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 8 }}>
            {seasonName}
          </div>
          <div style={{ color: '#FFFFFF', fontSize: 38, fontWeight: 900, letterSpacing: '-0.5px', marginBottom: 4 }}>
            {tournamentName}
          </div>
          <div style={{ color: '#A0988A', fontSize: 14, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' }}>
            Fixtures - {activeRound} • {getFilterLabel()}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', padding: '6px 14px', borderRadius: '30px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }}></div>
            <span style={{ color: '#10b981', fontSize: 11, fontWeight: 900, letterSpacing: 1, textTransform: 'uppercase' }}>ADMIN FIXTURES</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {filteredMatches.map((match) => {
          const hasScore = match.homeScore !== null && match.awayScore !== null && match.status !== 'VOID'
          const homeWin = hasScore && match.homeScore! > match.awayScore!
          const awayWin = hasScore && match.awayScore! > match.homeScore!

          return (
            <div key={match.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 32px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              {/* Date & Status */}
              <div style={{ width: '200px' }}>
                <div style={{ color: '#7A7367', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>
                  {formatDate(match.matchDate)}
                </div>
                {match.venue && (
                  <div style={{ color: '#A0988A', fontSize: '13px', marginBottom: '8px' }}>
                    {match.venue}
                  </div>
                )}
                {(match.group?.name || match.groupName) && (
                  <div style={{ color: '#c084fc', fontSize: '12px', fontWeight: 800, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: '8px' }}>
                    {match.group?.name || match.groupName}
                  </div>
                )}
                <div style={{ display: 'inline-block', padding: '4px 12px', borderRadius: '20px', border: `1px solid ${getStatusColor(match.status)}`, color: getStatusColor(match.status), fontSize: '11px', fontWeight: 800, textTransform: 'uppercase' }}>
                  {match.status}
                </div>
              </div>

              {/* Match Area */}
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '32px' }}>
                {/* Home Team */}
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '16px', opacity: awayWin ? 0.6 : 1 }}>
                  <span style={{ color: homeWin ? '#34d399' : '#FFFFFF', fontSize: '20px', fontWeight: 800 }}>
                    {match.homeTeam.team.name}
                  </span>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px' }}>
                    {match.homeTeam.team.logoUrl ? (
                      <img src={match.homeTeam.team.logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} crossOrigin="anonymous" />
                    ) : (
                      <span style={{ fontSize: '24px' }}>⚽</span>
                    )}
                  </div>
                </div>

                {/* Score */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '120px' }}>
                  {match.status === 'WALKOVER' ? (
                     <div style={{ padding: '4px 12px', borderRadius: '6px', background: 'rgba(192,132,252,0.1)', border: '1px solid rgba(192,132,252,0.2)', color: '#c084fc', fontSize: '14px', fontWeight: 900 }}>W/O</div>
                  ) : match.status === 'VOID' ? (
                     <div style={{ padding: '4px 12px', borderRadius: '6px', background: 'rgba(148,163,184,0.1)', border: '1px solid rgba(148,163,184,0.2)', color: '#94a3b8', fontSize: '14px', fontWeight: 900 }}>VOID</div>
                  ) : hasScore ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ color: homeWin ? '#34d399' : '#FFFFFF', fontSize: '32px', fontWeight: 900 }}>{match.homeScore}</span>
                      <span style={{ color: '#7A7367', fontSize: '24px', fontWeight: 800 }}>-</span>
                      <span style={{ color: awayWin ? '#34d399' : '#FFFFFF', fontSize: '32px', fontWeight: 900 }}>{match.awayScore}</span>
                    </div>
                  ) : (
                    <span style={{ color: '#7A7367', fontSize: '20px', fontWeight: 800 }}>vs</span>
                  )}
                </div>

                {/* Away Team */}
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '16px', opacity: homeWin ? 0.6 : 1 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px' }}>
                    {match.awayTeam.team.logoUrl ? (
                      <img src={match.awayTeam.team.logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} crossOrigin="anonymous" />
                    ) : (
                      <span style={{ fontSize: '24px' }}>⚽</span>
                    )}
                  </div>
                  <span style={{ color: awayWin ? '#34d399' : '#FFFFFF', fontSize: '20px', fontWeight: 800 }}>
                    {match.awayTeam.team.name}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer watermark */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#41574e', fontSize: 12, fontWeight: 700, marginTop: 24 }}>
        <div>turfcats.vercel.app</div>
        <div>Generated on {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
      </div>
    </div>
  )
}

export default function ShareableAdminFixtures({
  matches,
  tournamentName,
  seasonName,
  activeRound,
}: ShareableAdminFixturesProps) {
  const snapshotRef = useRef<HTMLDivElement>(null!)
  const [sharing, setSharing] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [shareDone, setShareDone] = useState(false)
  const [downloadDone, setDownloadDone] = useState(false)
  const [matchFilter, setMatchFilter] = useState<MatchFilter>('all')
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  const getDataUrl = async () => captureTableAsPng(snapshotRef.current)

  const handleShare = async () => {
    if (!snapshotRef.current || sharing) return
    setSharing(true)
    try {
      const dataUrl = await getDataUrl()
      const blob = await (await fetch(dataUrl)).blob()
      const file = new File([blob], `${tournamentName.replace(/\s+/g, '-').toLowerCase()}-fixtures.png`, { type: 'image/png' })
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: `${tournamentName} — Fixtures` })
      } else {
        handleDownload()
        return
      }
      setShareDone(true)
      setTimeout(() => setShareDone(false), 2500)
    } catch (err) {
      console.error('Share error:', err)
    } finally {
      setSharing(false)
    }
  }

  const handleDownload = async () => {
    if (!snapshotRef.current || downloading) return
    setDownloading(true)
    try {
      const dataUrl = await getDataUrl()
      const blob = await (await fetch(dataUrl)).blob()
      const blobUrl = URL.createObjectURL(blob)
      
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = `${tournamentName.replace(/\s+/g, '-').toLowerCase()}-fixtures.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100)
      setDownloadDone(true)
      setTimeout(() => setDownloadDone(false), 2500)
    } catch (err) {
      console.error('Download error:', err)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Filter Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm border bg-white/5 hover:bg-white/10 border-white/10 text-[#D4CCBB] hover:text-[#F5F0E8] transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            {matchFilter === 'all' ? 'All Matches' : matchFilter === 'pending' ? 'Pending' : 'Completed'}
            <svg className={`w-3.5 h-3.5 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {isFilterOpen && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setIsFilterOpen(false)}
              />
              <div className="absolute z-50 mt-2 right-0 w-48 rounded-xl bg-[#121212]/95 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgb(0,0,0,0.5)] py-1">
                {[
                  { value: 'all', label: 'All Matches', icon: '📋' },
                  { value: 'pending', label: 'Pending Matches', icon: '⏳' },
                  { value: 'completed', label: 'Completed Matches', icon: '✅' }
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setMatchFilter(option.value as MatchFilter)
                      setIsFilterOpen(false)
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-[#E8A800]/10 hover:text-[#E8A800] ${
                      matchFilter === option.value ? 'text-[#E8A800] bg-[#E8A800]/5 font-bold' : 'text-gray-300'
                    }`}
                  >
                    <span>{option.icon}</span>
                    <span>{option.label}</span>
                    {matchFilter === option.value && (
                      <svg className="w-4 h-4 ml-auto text-[#E8A800]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Share */}
        <button
          onClick={handleShare}
          disabled={sharing || downloading}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm border transition-all hover:scale-[1.02] disabled:opacity-60 ${
            shareDone
              ? 'bg-emerald-400/10 border-emerald-400/30 text-emerald-400'
              : 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
          }`}
        >
          {sharing ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Sharing…
            </>
          ) : shareDone ? (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              Shared!
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Share
            </>
          )}
        </button>

        {/* Download */}
        <button
          onClick={handleDownload}
          disabled={sharing || downloading}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm border transition-all hover:scale-[1.02] disabled:opacity-60 ${
            downloadDone
              ? 'bg-emerald-400/10 border-emerald-400/30 text-emerald-400'
              : 'bg-white/5 hover:bg-white/10 border-white/10 text-[#D4CCBB] hover:text-[#F5F0E8]'
          }`}
        >
          {downloading ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Saving…
            </>
          ) : downloadDone ? (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              Saved!
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download
            </>
          )}
        </button>
      </div>

      {/* Off-screen snapshot */}
      <div
        style={{ position: 'absolute', left: '-9999px', top: 0, pointerEvents: 'none' }}
        aria-hidden="true"
      >
        <div ref={snapshotRef}>
          <AdminFixturesSnapshot
            matches={matches}
            tournamentName={tournamentName}
            seasonName={seasonName}
            activeRound={activeRound}
            matchFilter={matchFilter}
          />
        </div>
      </div>
    </>
  )
}
