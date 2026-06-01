'use client'

import { useRef, useState } from 'react'
import { captureTableAsPng, shareOrDownloadPng } from '@/lib/share-table'
import type { StandingRow } from '@/components/tournaments/TournamentTable'

interface ShareableTournamentTableProps {
  standings: StandingRow[]
  tournamentName: string
  seasonName: string
  /** season_teams.id of the current user's team */
  myTeamId?: string | null
}

function TableSnapshot({
  standings,
  tournamentName,
  seasonName,
  myTeamId,
}: {
  standings: StandingRow[]
  tournamentName: string
  seasonName: string
  myTeamId?: string | null
}) {
  // Group by group name
  const byGroup = standings.reduce<Record<string, StandingRow[]>>((acc, s) => {
    const g = s.groupName || 'Overall'
    ;(acc[g] ??= []).push(s)
    return acc
  }, {})

  const posStyle = (pos: number) =>
    pos === 1 ? { background: 'linear-gradient(135deg, #FFD700, #FFA500)', color: '#0a0a0a', boxShadow: '0 2px 8px rgba(255,215,0,0.4)', overflow: 'hidden' } :
    pos === 2 ? { background: 'linear-gradient(135deg, #E0E0E0, #9E9E9E)', color: '#0a0a0a', boxShadow: '0 2px 8px rgba(192,192,192,0.3)', overflow: 'hidden' } :
    pos === 3 ? { background: 'linear-gradient(135deg, #CD7F32, #8B4513)', color: '#0a0a0a', boxShadow: '0 2px 8px rgba(205,127,50,0.3)', overflow: 'hidden' } :
    { background: 'rgba(255,255,255,0.06)', color: '#A0988A', overflow: 'hidden' }

  return (
    <div
      style={{
        background: 'radial-gradient(circle at top left, #181818, #070707)',
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
          <div style={{ color: '#E8A800', fontSize: 13, fontWeight: 900, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 8 }}>
            {seasonName}
          </div>
          <div style={{ color: '#FFFFFF', fontSize: 38, fontWeight: 900, letterSpacing: '-0.5px', marginBottom: 4 }}>
            {tournamentName}
          </div>
          <div style={{ color: '#A0988A', fontSize: 14, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' }}>
            Tournament Standings
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(232,168,0,0.1)', border: '1px solid rgba(232,168,0,0.2)', padding: '6px 14px', borderRadius: '30px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#E8A800' }}></div>
            <span style={{ color: '#E8A800', fontSize: 11, fontWeight: 900, letterSpacing: 1, textTransform: 'uppercase' }}>OFFICIAL STANDINGS</span>
          </div>
        </div>
      </div>

      {Object.entries(byGroup).map(([groupName, rows]) => (
        <div key={groupName} style={{ marginBottom: 36, borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', background: '#111111' }}>
          {Object.keys(byGroup).length > 1 && (
            <div style={{ background: 'linear-gradient(90deg, rgba(232,168,0,0.12), transparent)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '4px', height: '16px', borderRadius: '2px', backgroundColor: '#E8A800' }}></div>
              <span style={{ color: '#F5F0E8', fontWeight: 900, fontSize: 15, letterSpacing: 1.5, textTransform: 'uppercase' }}>{groupName}</span>
            </div>
          )}
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#141414', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                {['#', 'Team', 'P', 'W', 'D', 'L', 'GF', 'GA', 'GD', 'Pts'].map((h, i) => (
                  <th key={h} style={{
                    padding: i === 0 ? '16px 10px 16px 20px' : i === 1 ? '16px 10px' : '16px 14px',
                    textAlign: i <= 1 ? 'left' : 'center',
                    color: i === 9 ? '#E8A800' : '#A0988A',
                    fontSize: 12,
                    fontWeight: 800,
                    letterSpacing: 1.5,
                    textTransform: 'uppercase',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const pos = row.position ?? idx + 1
                const ps = posStyle(pos)
                const isMe = myTeamId && row.teamId === myTeamId
                return (
                  <tr
                    key={row.id}
                    style={{
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      background: isMe ? 'rgba(232,168,0,0.06)' : 'transparent',
                    }}
                  >
                    <td style={{ padding: '16px 10px 16px 20px', width: '40px' }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, ...ps }}>
                        {pos}
                      </div>
                    </td>
                    <td style={{ padding: '16px 10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: 32,
                          height: 32,
                          borderRadius: '4px',
                          overflow: 'hidden',
                          border: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          background: 'rgba(255,255,255,0.05)',
                        }}>
                          {row.seasonTeam.team.logoUrl ? (
                            <img
                              src={row.seasonTeam.team.logoUrl}
                              alt={row.seasonTeam.team.name}
                              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                              crossOrigin="anonymous"
                              loading="eager"
                              decoding="sync"
                            />
                          ) : (
                            <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#A0988A', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {row.seasonTeam.team.name.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <span style={{ fontWeight: 800, color: isMe ? '#E8A800' : '#F5F0E8', fontSize: 15 }}>
                          {row.seasonTeam.team.name}
                          {isMe && <span style={{ marginLeft: '8px', fontSize: '10px', fontWeight: 900, background: 'rgba(232,168,0,0.15)', color: '#E8A800', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>YOU</span>}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '16px 14px', textAlign: 'center', color: '#D4CCBB', fontSize: 15, fontWeight: 600 }}>{row.played}</td>
                    <td style={{ padding: '16px 14px', textAlign: 'center', color: '#4ade80', fontWeight: 700, fontSize: 15 }}>{row.won}</td>
                    <td style={{ padding: '16px 14px', textAlign: 'center', color: '#D4CCBB', fontSize: 15 }}>{row.drawn}</td>
                    <td style={{ padding: '16px 14px', textAlign: 'center', color: '#f87171', fontWeight: 700, fontSize: 15 }}>{row.lost}</td>
                    <td style={{ padding: '16px 14px', textAlign: 'center', color: '#D4CCBB', fontSize: 15 }}>{row.goalsFor}</td>
                    <td style={{ padding: '16px 14px', textAlign: 'center', color: '#D4CCBB', fontSize: 15 }}>{row.goalsAgainst}</td>
                    <td style={{ padding: '16px 14px', textAlign: 'center', fontWeight: 700, fontSize: 15, color: row.goalDiff > 0 ? '#4ade80' : row.goalDiff < 0 ? '#f87171' : '#7A7367' }}>
                      {row.goalDiff > 0 ? '+' : ''}{row.goalDiff}
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'center', fontWeight: 900, fontSize: 17, color: '#E8A800' }}>
                      {row.points}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ))}

      {/* Footer watermark */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#5A5347', fontSize: 12, fontWeight: 700, marginTop: 16 }}>
        <div>turfcats.vercel.app</div>
        <div>Generated on {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
      </div>
    </div>
  )
}

export default function ShareableTournamentTable({
  standings,
  tournamentName,
  seasonName,
  myTeamId,
}: ShareableTournamentTableProps) {
  const snapshotRef = useRef<HTMLDivElement>(null!)
  const [sharing, setSharing] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [shareDone, setShareDone] = useState(false)
  const [downloadDone, setDownloadDone] = useState(false)

  const getDataUrl = async () => captureTableAsPng(snapshotRef.current)

  const handleShare = async () => {
    if (!snapshotRef.current || sharing) return
    setSharing(true)
    try {
      // Show loading state while waiting for images
      const dataUrl = await getDataUrl()
      const blob = await (await fetch(dataUrl)).blob()
      const file = new File([blob], `${tournamentName.replace(/\s+/g, '-').toLowerCase()}-table.png`, { type: 'image/png' })
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: `${tournamentName} — League Table` })
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
      // Show loading state while waiting for images
      const dataUrl = await getDataUrl()
      const blob = await (await fetch(dataUrl)).blob()
      const blobUrl = URL.createObjectURL(blob)
      
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = `${tournamentName.replace(/\s+/g, '-').toLowerCase()}-table.png`
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
        {/* Share */}
        <button
          onClick={handleShare}
          disabled={sharing || downloading}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm border transition-all hover:scale-[1.02] disabled:opacity-60 ${
            shareDone
              ? 'bg-emerald-400/10 border-emerald-400/30 text-emerald-400'
              : 'bg-[#E8A800]/10 hover:bg-[#E8A800]/20 border-[#E8A800]/30 text-[#E8A800]'
          }`}
        >
          {sharing ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Loading…
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
              Loading…
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
        style={{ 
          position: 'fixed', 
          left: '-9999px', 
          top: '-9999px',
          width: '1200px',
          pointerEvents: 'none',
          visibility: 'hidden',
          zIndex: -1
        }}
        aria-hidden="true"
      >
        <div ref={snapshotRef}>
          <TableSnapshot
            standings={standings}
            tournamentName={tournamentName}
            seasonName={seasonName}
            myTeamId={myTeamId}
          />
        </div>
      </div>
    </>
  )
}
