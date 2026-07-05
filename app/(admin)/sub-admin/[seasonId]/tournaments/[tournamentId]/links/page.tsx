'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import CreateLinkDialog from '@/components/admin/CreateLinkDialog'
import EditLinkDialog from '@/components/admin/EditLinkDialog'
import PreviewQualifiedDialog from '@/components/admin/PreviewQualifiedDialog'

interface LinksPageProps {
  params: Promise<{
    seasonId: string
    tournamentId: string
  }>
}

export default function LinksPage({ params }: LinksPageProps) {
  const { seasonId, tournamentId } = use(params)
  
  const [tournament, setTournament] = useState<any>(null)
  const [links, setLinks] = useState<{ incoming: any[]; outgoing: any[] }>({ incoming: [], outgoing: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingLink, setEditingLink] = useState<any>(null)
  const [previewingLink, setPreviewingLink] = useState<any>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      // Fetch tournament details
      const tournRes = await fetch(`/api/seasons/${seasonId}/tournaments`)
      const tournData = await tournRes.json()
      const currentTourn = tournData.find((t: any) => t.id === tournamentId)
      setTournament(currentTourn)

      // Fetch links
      const linksRes = await fetch(`/api/admin/tournaments/${tournamentId}/links`)
      const linksData = await linksRes.json()
      setLinks(linksData)
      setLoading(false)
    } catch (err: any) {
      console.error('Error fetching data:', err)
      setError('Failed to load page data')
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [seasonId, tournamentId])

  const handleDelete = async (linkId: string) => {
    if (!confirm('Are you sure you want to delete this link? This will also remove any team qualification records for this link.')) {
      return
    }

    try {
      const res = await fetch(`/api/admin/tournaments/links/${linkId}`, {
        method: 'DELETE'
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete link')
      }
      fetchData()
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    }
  }

  const getLinkTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      TOP_N: 'Top N Standings',
      BOTTOM_N: 'Bottom N Standings',
      POSITION_RANGE: 'Specific Standings Positions',
      WINNER: 'Winner Only',
      RUNNER_UP: 'Runner-up Only',
      GROUP_POSITION: 'Position Per Group',
      MULTIPLE_POSITIONS_PER_GROUP: 'Multiple Positions Per Group'
    }
    return labels[type] || type
  }

  const renderConfigDetails = (link: any) => {
    const config = link.qualificationConfig || {}
    if (link.linkType === 'TOP_N' || link.linkType === 'BOTTOM_N') {
      return (
        <span className="text-gray-400">
          Count: <strong className="text-white">{config.count}</strong>
          {config.groupBy && ' (Per Group)'}
        </span>
      )
    }
    if (link.linkType === 'POSITION_RANGE') {
      return (
        <span className="text-gray-400">
          Positions: <strong className="text-white">{config.startPosition}-{config.endPosition}</strong>
          {config.groupBy && ' (Per Group)'}
        </span>
      )
    }
    if (link.linkType === 'WINNER' || link.linkType === 'RUNNER_UP') {
      return (
        <span className="text-gray-400">
          Target Seed Slot: <strong className="text-white">{config.slotNumber}</strong>
        </span>
      )
    }
    if (link.linkType === 'GROUP_POSITION') {
      return (
        <span className="text-gray-400 font-semibold">
          Pos <strong className="text-white">{config.position}</strong> from groups: <span className="text-[#E8A800]">{config.groupNames?.join(', ')}</span>
        </span>
      )
    }
    if (link.linkType === 'MULTIPLE_POSITIONS_PER_GROUP') {
      return (
        <span className="text-gray-400 font-semibold">
          Pos <strong className="text-white">{config.positionsPerGroup?.join(', ')}</strong> from groups: <span className="text-[#E8A800]">{config.groupNames?.join(', ')}</span>
        </span>
      )
    }
    return null
  }

  const getLinkStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      ACTIVE: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      COMPLETED: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      FAILED: 'bg-red-500/10 text-red-400 border-red-500/20'
    }
    return colors[status] || colors.PENDING
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/50 backdrop-blur-xl mb-6 sm:mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4 pt-6">
          <Link
            href={`/sub-admin/${seasonId}/tournaments/${tournamentId}`}
            className="text-[#E8A800] hover:text-[#FFB347] text-sm mb-4 inline-block transition-colors"
          >
            ← Back to Tournament Management
          </Link>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-2">
                <span className="bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent">
                  Tournament Links
                </span>
              </h1>
              <p className="text-[#D4CCBB] text-sm sm:text-base">
                {tournament?.name || 'Tournament'} - Configure team qualifications and sequential flows
              </p>
            </div>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-[#E8A800] to-[#FFB347] hover:from-[#FFC93A] hover:to-[#FFB347] text-black rounded-xl font-bold transition-all text-sm whitespace-nowrap self-start sm:self-auto shadow-lg"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Add Qualification Link
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 space-y-8">
        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-bold">
            ⚠️ {error}
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center text-gray-500 font-bold">Loading linking details...</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Outgoing Links */}
            <div className="space-y-4">
              <h2 className="text-xl font-black text-white flex items-center gap-2 border-b border-white/5 pb-2">
                <svg className="w-5 h-5 text-[#E8A800]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
                <span>Outgoing Links</span>
                <span className="text-xs font-normal text-[#7A7367] ml-1">
                  (Where teams in this tournament advance to)
                </span>
              </h2>

              {links.outgoing.length === 0 ? (
                <div className="rounded-xl border border-white/5 bg-white/5 p-6 text-center text-gray-500">
                  No outgoing links. Teams from this tournament do not feed into any other tournament.
                </div>
              ) : (
                <div className="space-y-4">
                  {links.outgoing.map(link => (
                    <div
                      key={link.id}
                      className="rounded-xl border border-white/10 bg-white/5 hover:border-[#E8A800]/20 transition-all p-4 sm:p-5 flex flex-col gap-3"
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <div className="text-base font-bold text-white flex items-center gap-2 flex-wrap">
                            <span>→ {link.targetTournament?.name}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${getLinkStatusColor(link.status)}`}>
                              {link.status}
                            </span>
                          </div>
                          <div className="text-xs text-[#E8A800] font-black mt-1 uppercase tracking-wider">
                            {getLinkTypeLabel(link.linkType)}
                          </div>
                        </div>
                      </div>

                      <div className="text-sm bg-black/30 border border-white/5 p-3 rounded-lg flex items-center justify-between">
                        {renderConfigDetails(link)}
                        {link.teamsPopulated && (
                          <span className="text-[10px] text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded font-black">
                            ✓ Populated
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5 justify-end">
                        <button
                          onClick={() => setPreviewingLink(link)}
                          className="px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 text-xs font-bold transition-all"
                        >
                          Preview Standings
                        </button>
                        <button
                          onClick={() => setEditingLink(link)}
                          className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-bold text-white transition-all"
                        >
                          Edit Config
                        </button>
                        <button
                          onClick={() => handleDelete(link.id)}
                          className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-xs font-bold text-red-400 border border-red-500/20 transition-all"
                        >
                          Delete Link
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Incoming Links */}
            <div className="space-y-4">
              <h2 className="text-xl font-black text-white flex items-center gap-2 border-b border-white/5 pb-2">
                <svg className="w-5 h-5 text-[#FFB347]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Incoming Links</span>
                <span className="text-xs font-normal text-[#7A7367] ml-1">
                  (Source tournaments feeding teams in)
                </span>
              </h2>

              {links.incoming.length === 0 ? (
                <div className="rounded-xl border border-white/5 bg-white/5 p-6 text-center text-gray-500">
                  No incoming links. Teams are added manually or from default season teams list.
                </div>
              ) : (
                <div className="space-y-4">
                  {links.incoming.map(link => (
                    <div
                      key={link.id}
                      className="rounded-xl border border-white/10 bg-white/5 p-4 sm:p-5 flex flex-col gap-3"
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <div className="text-base font-bold text-white flex items-center gap-2 flex-wrap">
                            <span>← {link.sourceTournament?.name}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${getLinkStatusColor(link.status)}`}>
                              {link.status}
                            </span>
                          </div>
                          <div className="text-xs text-[#FFB347] font-black mt-1 uppercase tracking-wider">
                            {getLinkTypeLabel(link.linkType)}
                          </div>
                        </div>
                      </div>

                      <div className="text-sm bg-black/30 border border-white/5 p-3 rounded-lg flex items-center justify-between">
                        {renderConfigDetails(link)}
                        {link.teamsPopulated && (
                          <span className="text-[10px] text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded font-black">
                            ✓ Populated
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5 justify-end">
                        <button
                          onClick={() => setPreviewingLink(link)}
                          className="px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 text-xs font-bold transition-all"
                        >
                          Preview Standings
                        </button>
                        <button
                          onClick={() => handleDelete(link.id)}
                          className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-xs font-bold text-red-400 border border-red-500/20 transition-all"
                        >
                          Delete Link
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}
      </div>

      {/* Dialogs */}
      <CreateLinkDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        sourceTournamentId={tournamentId}
        seasonId={seasonId}
        onCreated={fetchData}
      />

      <EditLinkDialog
        isOpen={!!editingLink}
        onClose={() => setEditingLink(null)}
        link={editingLink}
        onUpdated={fetchData}
      />

      <PreviewQualifiedDialog
        isOpen={!!previewingLink}
        onClose={() => setPreviewingLink(null)}
        link={previewingLink}
        onPopulated={fetchData}
      />
    </div>
  )
}
