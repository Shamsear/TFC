'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import LoadingSpinner from "@/components/ui/LoadingSpinner"
import SearchableSelect from '@/components/ui/SearchableSelect'

interface Team {
  id: string
  teamId: string
  name: string
  logoUrl: string
}

interface TournamentFormAdvancedProps {
  seasonId: string
  teams: Team[]
  initialTournament?: any
}

const tournamentTypes = [
  { value: 'LEAGUE_ONLY', label: 'League Only' },
  { value: 'LEAGUE_PLAYOFF', label: 'League + Playoff' },
  { value: 'GROUP_KNOCKOUT', label: 'Group Stage + Knockout' },
  { value: 'KNOCKOUT_ONLY', label: 'Knockout Only' },
  { value: 'CUSTOM_KNOCKOUT', label: 'Custom Knockout' }
]

const knockoutRoundOptions = [
  { value: 'ROUND_OF_32', label: 'Round of 32', teams: 32 },
  { value: 'ROUND_OF_16', label: 'Round of 16', teams: 16 },
  { value: 'QUARTER_FINAL', label: 'Quarter Final', teams: 8 },
  { value: 'SEMI_FINAL', label: 'Semi Final', teams: 4 },
  { value: 'FINAL', label: 'Final', teams: 2 },
]

export default function TournamentFormAdvanced({ seasonId, teams, initialTournament }: TournamentFormAdvancedProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    name: '',
    tournamentType: 'LEAGUE_ONLY',
    startDate: '',
    endDate: '',
    description: '',
    status: 'UPCOMING',
    selectedTeams: [] as string[],
    
    // League settings
    leagueLegs: 2, // 1 or 2
    playoffFormat: 'TOP_4_SEMI', // TOP_2_SEMI, TOP_4_SEMI, TOP_8_QUARTER, TOP_3_6_PLAYOFF
    
    // Group settings
    numGroups: 2,
    groupLegs: 2, // 1 or 2
    groupQualifiers: 2, // Top 2 or Top 3 qualify
    
    // Knockout settings
    knockoutLegs: 2, // 1 or 2 per round (can be customized per round later)
 
    // Custom Knockout settings
    qualifyingTeams: 4,    // how many teams enter the knockout
    qualifyingRound: 'SEMI_FINAL', // which round they start from
 
    // Linking settings
    isLinkedTournament: false,
    linkSourceTournamentId: '',
    linkType: 'TOP_N'
  })
 
  const [seasonTournaments, setSeasonTournaments] = useState<any[]>([])
  
  // Linking configuration sub-states
  const [linkCount, setLinkCount] = useState(8)
  const [linkStartPosition, setLinkStartPosition] = useState(2)
  const [linkEndPosition, setLinkEndPosition] = useState(5)
  const [linkGroupBy, setLinkGroupBy] = useState<string | null>(null)
  const [linkSeedMappingText, setLinkSeedMappingText] = useState('')
  const [linkSlotNumber, setLinkSlotNumber] = useState(1)
  const [linkPosition, setLinkPosition] = useState(1)
  const [linkGroupNamesText, setLinkGroupNamesText] = useState('Group A, Group B, Group C, Group D')
  const [linkGroupSeedMappingText, setLinkGroupSeedMappingText] = useState('')
  const [linkPositionsPerGroupText, setLinkPositionsPerGroupText] = useState('1, 2')
  const [linkMultipleGroupsText, setLinkMultipleGroupsText] = useState('Group A, Group B')
  const [linkMultipleSeedMappingText, setLinkMultipleSeedMappingText] = useState('')
 
  useEffect(() => {
    if (initialTournament) {
      const tourn = initialTournament
      const isLinked = tourn.requiresQualification && tourn.incomingLinks && tourn.incomingLinks.length > 0
      const link = isLinked ? tourn.incomingLinks[0] : null
      const config = link?.qualificationConfig as any || {}
      
      const formatDateForInput = (date: any) => {
        if (!date) return ''
        const d = new Date(date)
        const year = d.getFullYear()
        const month = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      }
 
      let kConfig: any = {}
      try {
        kConfig = tourn.knockoutConfig ? JSON.parse(tourn.knockoutConfig) : {}
      } catch (e) {
        console.error('Error parsing knockout config:', e)
      }
 
      setFormData({
        name: tourn.name || '',
        tournamentType: tourn.tournamentType || 'LEAGUE_ONLY',
        startDate: formatDateForInput(tourn.startDate),
        endDate: formatDateForInput(tourn.endDate),
        description: tourn.description || '',
        status: tourn.status || 'UPCOMING',
        selectedTeams: tourn.standings?.map((s: any) => s.teamId) || [],
        leagueLegs: tourn.leagueLegs || 2,
        playoffFormat: tourn.playoffFormat || 'TOP_4_SEMI',
        numGroups: tourn.groups?.length || 2,
        groupLegs: tourn.groupLegs || 2,
        groupQualifiers: tourn.groupQualifiers || 2,
        knockoutLegs: kConfig.defaultLegs || 2,
        qualifyingTeams: kConfig.qualifyingTeams || 4,
        qualifyingRound: kConfig.qualifyingRound || 'SEMI_FINAL',
        isLinkedTournament: isLinked,
        linkSourceTournamentId: link?.sourceTournamentId || '',
        linkType: link?.linkType || 'TOP_N'
      })
 
      if (link) {
        const type = link.linkType
        if (type === 'TOP_N' || type === 'BOTTOM_N') {
          setLinkCount(config.count || 8)
          setLinkGroupBy(config.groupBy || null)
          setLinkSeedMappingText(config.seedMapping ? config.seedMapping.join(', ') : '')
        } else if (type === 'POSITION_RANGE') {
          setLinkStartPosition(config.startPosition || 2)
          setLinkEndPosition(config.endPosition || 5)
          setLinkGroupBy(config.groupBy || null)
        } else if (type === 'WINNER' || type === 'RUNNER_UP') {
          setLinkSlotNumber(config.slotNumber || 1)
        } else if (type === 'GROUP_POSITION') {
          setLinkPosition(config.position || 1)
          setLinkGroupNamesText(config.groupNames ? config.groupNames.join(', ') : '')
          setLinkGroupSeedMappingText(config.seedMapping ? Object.entries(config.seedMapping).map(([k, v]) => `${k}:${v}`).join(', ') : '')
        } else if (type === 'MULTIPLE_POSITIONS_PER_GROUP') {
          setLinkPositionsPerGroupText(config.positionsPerGroup ? config.positionsPerGroup.join(', ') : '')
          setLinkMultipleGroupsText(config.groupNames ? config.groupNames.join(', ') : '')
          setLinkMultipleSeedMappingText(config.seedMapping ? config.seedMapping.join(', ') : '')
        }
      }
    }
  }, [initialTournament])
 
  useEffect(() => {
    fetch(`/api/seasons/${seasonId}/tournaments`)
      .then(res => res.json())
      .then(data => {
        setSeasonTournaments(data)
        if (data.length > 0) {
          setFormData(prev => ({
            ...prev,
            linkSourceTournamentId: data[0].id
          }))
        }
      })
      .catch(err => console.error('Error fetching season tournaments:', err))
  }, [seasonId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    let qualificationConfig: any = null

    if (formData.isLinkedTournament) {
      const type = formData.linkType
      if (type === 'TOP_N' || type === 'BOTTOM_N') {
        qualificationConfig = {
          count: Number(linkCount),
          groupBy: linkGroupBy || null,
          seedMapping: linkSeedMappingText
            ? linkSeedMappingText.split(',').map(s => Number(s.trim()))
            : null
        }
      } else if (type === 'POSITION_RANGE') {
        qualificationConfig = {
          startPosition: Number(linkStartPosition),
          endPosition: Number(linkEndPosition),
          groupBy: linkGroupBy || null
        }
      } else if (type === 'WINNER' || type === 'RUNNER_UP') {
        qualificationConfig = {
          slotNumber: Number(linkSlotNumber)
        }
      } else if (type === 'GROUP_POSITION') {
        const groups = linkGroupNamesText.split(',').map(g => g.trim())
        const seedMap: Record<string, number> = {}
        if (linkGroupSeedMappingText) {
          linkGroupSeedMappingText.split(',').forEach(item => {
            const parts = item.split(':')
            if (parts.length === 2) {
              seedMap[parts[0].trim()] = Number(parts[1].trim())
            }
          })
        }
        qualificationConfig = {
          position: Number(linkPosition),
          groupNames: groups,
          seedMapping: Object.keys(seedMap).length > 0 ? seedMap : null
        }
      } else if (type === 'MULTIPLE_POSITIONS_PER_GROUP') {
        const positions = linkPositionsPerGroupText.split(',').map(p => Number(p.trim()))
        const groups = linkMultipleGroupsText.split(',').map(g => g.trim())
        const seeds = linkMultipleSeedMappingText
          ? linkMultipleSeedMappingText.split(',').map(s => Number(s.trim()))
          : null
        qualificationConfig = {
          positionsPerGroup: positions,
          groupNames: groups,
          seedMapping: seeds
        }
      }
    }

    try {
      const isEdit = !!initialTournament
      const url = isEdit
        ? `/api/seasons/${seasonId}/tournaments/${initialTournament.id}`
        : `/api/seasons/${seasonId}/tournaments`
      const method = isEdit ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          linkQualificationConfig: qualificationConfig
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || `Failed to ${isEdit ? 'update' : 'create'} tournament`)
      }

      const tournament = await response.json()
      router.push(`/sub-admin/${seasonId}/tournaments/${tournament.id}`)
      router.refresh()
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  const toggleTeam = (teamId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedTeams: prev.selectedTeams.includes(teamId)
        ? prev.selectedTeams.filter(id => id !== teamId)
        : [...prev.selectedTeams, teamId]
    }))
  }

  const selectAllTeams = () => {
    setFormData(prev => ({ ...prev, selectedTeams: teams.map(t => t.id) }))
  }

  const clearTeams = () => {
    setFormData(prev => ({ ...prev, selectedTeams: [] }))
  }

  const showLeagueSettings = formData.tournamentType === 'LEAGUE_ONLY' || formData.tournamentType === 'LEAGUE_PLAYOFF'
  const showPlayoffSettings = formData.tournamentType === 'LEAGUE_PLAYOFF'
  const showGroupSettings = formData.tournamentType === 'GROUP_KNOCKOUT'
  const showKnockoutSettings = formData.tournamentType === 'KNOCKOUT_ONLY' || formData.tournamentType === 'GROUP_KNOCKOUT' || formData.tournamentType === 'LEAGUE_PLAYOFF'
  const showCustomKnockoutSettings = formData.tournamentType === 'CUSTOM_KNOCKOUT'

  // Derive which round options are valid for the chosen qualifying team count
  const validCustomRounds = knockoutRoundOptions.filter(r => r.teams >= formData.qualifyingTeams && (formData.qualifyingTeams % 2 === 0 || r.teams === formData.qualifyingTeams))

  return (
    <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Basic Info */}
      <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6">
        <h2 className="text-xl sm:text-2xl font-black text-white mb-4 sm:mb-6">Basic Information</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#D4CCBB] mb-2">
              Tournament Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-black/30 border border-white/10 rounded-lg sm:rounded-xl text-white placeholder-[#7A7367] focus:outline-none focus:ring-2 focus:ring-[#E8A800] focus:border-transparent text-sm sm:text-base"
              placeholder="e.g., Premier League, Champions Cup"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#D4CCBB] mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-black/30 border border-white/10 rounded-lg sm:rounded-xl text-white placeholder-[#7A7367] focus:outline-none focus:ring-2 focus:ring-[#E8A800] focus:border-transparent text-sm sm:text-base resize-none"
              placeholder="Optional tournament description"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#D4CCBB] mb-2">
                Start Date *
              </label>
              <input
                type="date"
                required
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-black/30 border border-white/10 rounded-lg sm:rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#E8A800] focus:border-transparent text-sm sm:text-base"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#D4CCBB] mb-2">
                End Date
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-black/30 border border-white/10 rounded-lg sm:rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#E8A800] focus:border-transparent text-sm sm:text-base"
              />
            </div>
          </div>

          {/* Only show status selector when editing */}
          {!!initialTournament && (
            <div>
              <label className="block text-sm font-medium text-[#D4CCBB] mb-2">
                Tournament Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-black/30 border border-white/10 rounded-lg sm:rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#E8A800] focus:border-transparent text-sm sm:text-base font-bold cursor-pointer"
              >
                <option value="UPCOMING">UPCOMING</option>
                <option value="IN_PROGRESS">IN PROGRESS</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Tournament Type */}
      <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6">
        <h2 className="text-xl sm:text-2xl font-black text-white mb-4 sm:mb-6">Tournament Format</h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {tournamentTypes.map((type) => (
            <label
              key={type.value}
              className={`relative cursor-pointer rounded-lg sm:rounded-xl border-2 p-3 sm:p-4 transition-all ${
                formData.tournamentType === type.value
                  ? 'border-[#E8A800] bg-[#E8A800]/10'
                  : 'border-white/10 bg-black/30 hover:border-white/20'
              }`}
            >
              <input
                type="radio"
                name="tournamentType"
                value={type.value}
                checked={formData.tournamentType === type.value}
                onChange={(e) => setFormData({ ...formData, tournamentType: e.target.value })}
                className="sr-only"
              />
              <div className="font-bold text-white text-sm sm:text-base">{type.label}</div>
            </label>
          ))}
        </div>
      </div>

      {/* League Settings */}
      {showLeagueSettings && (
        <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6">
          <h2 className="text-xl sm:text-2xl font-black text-white mb-4 sm:mb-6">League Settings</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#D4CCBB] mb-3">
                League Format
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <label className={`cursor-pointer rounded-lg sm:rounded-xl border-2 p-3 sm:p-4 transition-all ${
                  formData.leagueLegs === 1
                    ? 'border-[#E8A800] bg-[#E8A800]/10'
                    : 'border-white/10 bg-black/30 hover:border-white/20'
                }`}>
                  <input
                    type="radio"
                    name="leagueLegs"
                    checked={formData.leagueLegs === 1}
                    onChange={() => setFormData({ ...formData, leagueLegs: 1 })}
                    className="sr-only"
                  />
                  <div className="font-bold text-white text-sm sm:text-base">Single Round-Robin</div>
                  <div className="text-xs sm:text-sm text-[#7A7367] mt-1">Each team plays once</div>
                </label>
                <label className={`cursor-pointer rounded-lg sm:rounded-xl border-2 p-3 sm:p-4 transition-all ${
                  formData.leagueLegs === 2
                    ? 'border-[#E8A800] bg-[#E8A800]/10'
                    : 'border-white/10 bg-black/30 hover:border-white/20'
                }`}>
                  <input
                    type="radio"
                    name="leagueLegs"
                    checked={formData.leagueLegs === 2}
                    onChange={() => setFormData({ ...formData, leagueLegs: 2 })}
                    className="sr-only"
                  />
                  <div className="font-bold text-white text-sm sm:text-base">Double Round-Robin</div>
                  <div className="text-xs sm:text-sm text-[#7A7367] mt-1">Home & away matches</div>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Playoff Settings */}
      {showPlayoffSettings && (
        <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6">
          <h2 className="text-xl sm:text-2xl font-black text-white mb-4 sm:mb-6">Playoff Settings</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#D4CCBB] mb-3">
                Playoff Format
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <label className={`cursor-pointer rounded-lg sm:rounded-xl border-2 p-3 sm:p-4 transition-all ${
                  formData.playoffFormat === 'TOP_2_SEMI'
                    ? 'border-[#E8A800] bg-[#E8A800]/10'
                    : 'border-white/10 bg-black/30 hover:border-white/20'
                }`}>
                  <input
                    type="radio"
                    name="playoffFormat"
                    value="TOP_2_SEMI"
                    checked={formData.playoffFormat === 'TOP_2_SEMI'}
                    onChange={(e) => setFormData({ ...formData, playoffFormat: e.target.value })}
                    className="sr-only"
                  />
                  <div className="font-bold text-white text-sm sm:text-base">Top 2 → Semi Final</div>
                  <div className="text-xs sm:text-sm text-[#7A7367] mt-1">Direct to semi finals</div>
                </label>
                
                <label className={`cursor-pointer rounded-lg sm:rounded-xl border-2 p-3 sm:p-4 transition-all ${
                  formData.playoffFormat === 'TOP_4_SEMI'
                    ? 'border-[#E8A800] bg-[#E8A800]/10'
                    : 'border-white/10 bg-black/30 hover:border-white/20'
                }`}>
                  <input
                    type="radio"
                    name="playoffFormat"
                    value="TOP_4_SEMI"
                    checked={formData.playoffFormat === 'TOP_4_SEMI'}
                    onChange={(e) => setFormData({ ...formData, playoffFormat: e.target.value })}
                    className="sr-only"
                  />
                  <div className="font-bold text-white text-sm sm:text-base">Top 4 → Semi Final</div>
                  <div className="text-xs sm:text-sm text-[#7A7367] mt-1">1v4, 2v3 in semis</div>
                </label>
                
                <label className={`cursor-pointer rounded-lg sm:rounded-xl border-2 p-3 sm:p-4 transition-all ${
                  formData.playoffFormat === 'TOP_8_QUARTER'
                    ? 'border-[#E8A800] bg-[#E8A800]/10'
                    : 'border-white/10 bg-black/30 hover:border-white/20'
                }`}>
                  <input
                    type="radio"
                    name="playoffFormat"
                    value="TOP_8_QUARTER"
                    checked={formData.playoffFormat === 'TOP_8_QUARTER'}
                    onChange={(e) => setFormData({ ...formData, playoffFormat: e.target.value })}
                    className="sr-only"
                  />
                  <div className="font-bold text-white text-sm sm:text-base">Top 8 → Quarter Final</div>
                  <div className="text-xs sm:text-sm text-[#7A7367] mt-1">Full playoff bracket</div>
                </label>
                
                <label className={`cursor-pointer rounded-lg sm:rounded-xl border-2 p-3 sm:p-4 transition-all ${
                  formData.playoffFormat === 'TOP_3_6_PLAYOFF'
                    ? 'border-[#E8A800] bg-[#E8A800]/10'
                    : 'border-white/10 bg-black/30 hover:border-white/20'
                }`}>
                  <input
                    type="radio"
                    name="playoffFormat"
                    value="TOP_3_6_PLAYOFF"
                    checked={formData.playoffFormat === 'TOP_3_6_PLAYOFF'}
                    onChange={(e) => setFormData({ ...formData, playoffFormat: e.target.value })}
                    className="sr-only"
                  />
                  <div className="font-bold text-white text-sm sm:text-base">Top 2 Direct + 3-6 Playoff</div>
                  <div className="text-xs sm:text-sm text-[#7A7367] mt-1">3v6, 4v5 → winners to semis</div>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Group Settings */}
      {showGroupSettings && (
        <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6">
          <h2 className="text-xl sm:text-2xl font-black text-white mb-4 sm:mb-6">Group Stage Settings</h2>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#D4CCBB] mb-2">
                  Number of Groups
                </label>
                <input
                  type="number"
                  min="2"
                  max="8"
                  value={formData.numGroups}
                  onChange={(e) => setFormData({ ...formData, numGroups: parseInt(e.target.value) })}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-black/30 border border-white/10 rounded-lg sm:rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#E8A800] focus:border-transparent text-sm sm:text-base"
                />
              </div>
              
              <div>
                <SearchableSelect
                  label="Teams Qualify Per Group"
                  value={formData.groupQualifiers.toString()}
                  options={[
                    { value: '2', label: 'Top 2' },
                    { value: '3', label: 'Top 3' },
                    { value: '4', label: 'Top 4' }
                  ]}
                  onChange={(val) => setFormData({ ...formData, groupQualifiers: parseInt(val) })}
                  enableSearch={false}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#D4CCBB] mb-3">
                Group Stage Format
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <label className={`cursor-pointer rounded-lg sm:rounded-xl border-2 p-3 sm:p-4 transition-all ${
                  formData.groupLegs === 1
                    ? 'border-[#E8A800] bg-[#E8A800]/10'
                    : 'border-white/10 bg-black/30 hover:border-white/20'
                }`}>
                  <input
                    type="radio"
                    name="groupLegs"
                    checked={formData.groupLegs === 1}
                    onChange={() => setFormData({ ...formData, groupLegs: 1 })}
                    className="sr-only"
                  />
                  <div className="font-bold text-white text-sm sm:text-base">Single Round-Robin</div>
                  <div className="text-xs sm:text-sm text-[#7A7367] mt-1">Each team plays once</div>
                </label>
                <label className={`cursor-pointer rounded-lg sm:rounded-xl border-2 p-3 sm:p-4 transition-all ${
                  formData.groupLegs === 2
                    ? 'border-[#E8A800] bg-[#E8A800]/10'
                    : 'border-white/10 bg-black/30 hover:border-white/20'
                }`}>
                  <input
                    type="radio"
                    name="groupLegs"
                    checked={formData.groupLegs === 2}
                    onChange={() => setFormData({ ...formData, groupLegs: 2 })}
                    className="sr-only"
                  />
                  <div className="font-bold text-white text-sm sm:text-base">Double Round-Robin</div>
                  <div className="text-xs sm:text-sm text-[#7A7367] mt-1">Home & away matches</div>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Knockout Settings */}
      {showKnockoutSettings && (
        <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6">
          <h2 className="text-xl sm:text-2xl font-black text-white mb-4 sm:mb-6">Knockout Settings</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#D4CCBB] mb-3">
                Default Knockout Format
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <label className={`cursor-pointer rounded-lg sm:rounded-xl border-2 p-3 sm:p-4 transition-all ${
                  formData.knockoutLegs === 1
                    ? 'border-[#E8A800] bg-[#E8A800]/10'
                    : 'border-white/10 bg-black/30 hover:border-white/20'
                }`}>
                  <input
                    type="radio"
                    name="knockoutLegs"
                    checked={formData.knockoutLegs === 1}
                    onChange={() => setFormData({ ...formData, knockoutLegs: 1 })}
                    className="sr-only"
                  />
                  <div className="font-bold text-white text-sm sm:text-base">Single Leg</div>
                  <div className="text-xs sm:text-sm text-[#7A7367] mt-1">One match per round</div>
                </label>
                <label className={`cursor-pointer rounded-lg sm:rounded-xl border-2 p-3 sm:p-4 transition-all ${
                  formData.knockoutLegs === 2
                    ? 'border-[#E8A800] bg-[#E8A800]/10'
                    : 'border-white/10 bg-black/30 hover:border-white/20'
                }`}>
                  <input
                    type="radio"
                    name="knockoutLegs"
                    checked={formData.knockoutLegs === 2}
                    onChange={() => setFormData({ ...formData, knockoutLegs: 2 })}
                    className="sr-only"
                  />
                  <div className="font-bold text-white text-sm sm:text-base">Two Legs</div>
                  <div className="text-xs sm:text-sm text-[#7A7367] mt-1">Home & away (aggregate)</div>
                </label>
              </div>
              <p className="text-xs text-[#7A7367] mt-2">
                * Can be customized per round when generating knockout fixtures
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Custom Knockout Settings */}
      {showCustomKnockoutSettings && (
        <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6">
          <h2 className="text-xl sm:text-2xl font-black text-white mb-1">Custom Knockout Settings</h2>
          <p className="text-sm text-[#7A7367] mb-5">Define how many teams qualify and which knockout stage they enter.</p>

          <div className="space-y-6">
            {/* Qualifying Teams */}
            <div>
              <label className="block text-sm font-medium text-[#D4CCBB] mb-2">
                Number of Qualifying Teams
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="2"
                  max="64"
                  value={formData.qualifyingTeams}
                  onChange={(e) => {
                    const val = Math.max(2, parseInt(e.target.value) || 2)
                    setFormData({ ...formData, qualifyingTeams: val })
                  }}
                  className="w-28 px-3 py-2.5 bg-black/30 border border-white/10 rounded-lg sm:rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#E8A800] focus:border-transparent text-sm sm:text-base text-center font-bold"
                />
                <span className="text-sm text-[#7A7367]">teams enter the knockout stage</span>
              </div>
              {/* Quick-select pills */}
              <div className="flex flex-wrap gap-2 mt-3">
                {[2, 4, 8, 16, 32].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setFormData({ ...formData, qualifyingTeams: n })}
                    className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${
                      formData.qualifyingTeams === n
                        ? 'bg-[#E8A800] text-black border-[#E8A800]'
                        : 'bg-white/5 text-[#7A7367] border-white/10 hover:border-[#E8A800]/50 hover:text-white'
                    }`}
                  >
                    Top {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Qualifying Round */}
            <div>
              <label className="block text-sm font-medium text-[#D4CCBB] mb-3">
                They Enter At
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {knockoutRoundOptions.map((option) => {
                  const isActive = formData.qualifyingRound === option.value
                  return (
                    <label
                      key={option.value}
                      className={`cursor-pointer rounded-lg sm:rounded-xl border-2 p-3 sm:p-4 transition-all ${
                        isActive
                          ? 'border-[#E8A800] bg-[#E8A800]/10'
                          : 'border-white/10 bg-black/30 hover:border-white/20'
                      }`}
                    >
                      <input
                        type="radio"
                        name="qualifyingRound"
                        value={option.value}
                        checked={isActive}
                        onChange={(e) => setFormData({ ...formData, qualifyingRound: e.target.value })}
                        className="sr-only"
                      />
                      <div className="font-bold text-white text-sm sm:text-base">{option.label}</div>
                      <div className="text-xs text-[#7A7367] mt-1">{option.teams} team bracket</div>
                    </label>
                  )
                })}
              </div>
            </div>

            {/* Knockout Legs */}
            <div>
              <label className="block text-sm font-medium text-[#D4CCBB] mb-3">
                Match Format
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <label className={`cursor-pointer rounded-lg sm:rounded-xl border-2 p-3 sm:p-4 transition-all ${
                  formData.knockoutLegs === 1
                    ? 'border-[#E8A800] bg-[#E8A800]/10'
                    : 'border-white/10 bg-black/30 hover:border-white/20'
                }`}>
                  <input type="radio" name="customKnockoutLegs" checked={formData.knockoutLegs === 1} onChange={() => setFormData({ ...formData, knockoutLegs: 1 })} className="sr-only" />
                  <div className="font-bold text-white text-sm sm:text-base">Single Leg</div>
                  <div className="text-xs sm:text-sm text-[#7A7367] mt-1">One match per round</div>
                </label>
                <label className={`cursor-pointer rounded-lg sm:rounded-xl border-2 p-3 sm:p-4 transition-all ${
                  formData.knockoutLegs === 2
                    ? 'border-[#E8A800] bg-[#E8A800]/10'
                    : 'border-white/10 bg-black/30 hover:border-white/20'
                }`}>
                  <input type="radio" name="customKnockoutLegs" checked={formData.knockoutLegs === 2} onChange={() => setFormData({ ...formData, knockoutLegs: 2 })} className="sr-only" />
                  <div className="font-bold text-white text-sm sm:text-base">Two Legs</div>
                  <div className="text-xs sm:text-sm text-[#7A7367] mt-1">Home & away (aggregate)</div>
                </label>
              </div>
            </div>

            {/* Summary preview */}
            <div className="rounded-xl bg-[#E8A800]/5 border border-[#E8A800]/20 p-4 flex items-start gap-3">
              <svg className="w-5 h-5 text-[#E8A800] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-[#D4CCBB]">
                <span className="font-bold text-[#E8A800]">{formData.qualifyingTeams} teams</span> will qualify and enter at the{' '}
                <span className="font-bold text-white">{knockoutRoundOptions.find(r => r.value === formData.qualifyingRound)?.label}</span>{' '}
                stage ({formData.knockoutLegs === 1 ? 'single leg' : 'two-legged'} ties).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Team Population Mode */}
      <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6">
        <h2 className="text-xl sm:text-2xl font-black text-white mb-2">Team Population Mode</h2>
        <p className="text-sm text-[#7A7367] mb-6">Choose how teams are added to this tournament.</p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6">
          <label className={`cursor-pointer rounded-lg sm:rounded-xl border-2 p-4 transition-all ${
            !formData.isLinkedTournament
              ? 'border-[#E8A800] bg-[#E8A800]/10'
              : 'border-white/10 bg-black/30 hover:border-white/20'
          }`}>
            <input
              type="radio"
              name="isLinkedTournament"
              checked={!formData.isLinkedTournament}
              onChange={() => setFormData({ ...formData, isLinkedTournament: false })}
              className="sr-only"
            />
            <div className="font-bold text-white text-sm sm:text-base">Manual Selection</div>
            <div className="text-xs sm:text-sm text-[#7A7367] mt-1">Select teams manually from the list below</div>
          </label>
          
          <label className={`cursor-pointer rounded-lg sm:rounded-xl border-2 p-4 transition-all ${
            formData.isLinkedTournament
              ? 'border-[#E8A800] bg-[#E8A800]/10'
              : 'border-white/10 bg-black/30 hover:border-white/20'
          }`}>
            <input
              type="radio"
              name="isLinkedTournament"
              checked={formData.isLinkedTournament}
              onChange={() => setFormData({ ...formData, isLinkedTournament: true })}
              className="sr-only"
            />
            <div className="font-bold text-white text-sm sm:text-base">Automatic Linking</div>
            <div className="text-xs sm:text-sm text-[#7A7367] mt-1">Automatically populate teams based on positions in another tournament</div>
          </label>
        </div>

        {/* Linking Config Form */}
        {formData.isLinkedTournament && (
          <div className="space-y-4 border-t border-white/5 pt-6">
            <h3 className="text-xs font-black uppercase text-[#E8A800] tracking-wider mb-2">Configure Link Criteria</h3>
            
            {/* Source Tournament Dropdown */}
            <div>
              <label className="block text-sm font-medium text-[#D4CCBB] mb-2">
                Source Tournament (Feed from)
              </label>
              {seasonTournaments.length === 0 ? (
                <p className="text-sm text-yellow-500 font-bold">No other tournaments found in this season to feed from. Please create a manual tournament first.</p>
              ) : (
                <select
                  value={formData.linkSourceTournamentId}
                  onChange={(e) => setFormData({ ...formData, linkSourceTournamentId: e.target.value })}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white focus:outline-none focus:ring-1 focus:ring-[#E8A800] cursor-pointer"
                >
                  {seasonTournaments.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.tournamentType.replace(/_/g, ' ')})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Link Type Dropdown */}
            <div>
              <label className="block text-sm font-medium text-[#D4CCBB] mb-2">
                Qualification Rule
              </label>
              <select
                value={formData.linkType}
                onChange={(e) => setFormData({ ...formData, linkType: e.target.value })}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white focus:outline-none focus:ring-1 focus:ring-[#E8A800] cursor-pointer"
              >
                <option value="TOP_N">Top N Teams</option>
                <option value="BOTTOM_N">Bottom N Teams</option>
                <option value="POSITION_RANGE">Position Range</option>
                <option value="WINNER">Winner Only</option>
                <option value="RUNNER_UP">Runner-up Only</option>
                <option value="GROUP_POSITION">Position from each Group</option>
                <option value="MULTIPLE_POSITIONS_PER_GROUP">Multiple positions from Groups</option>
              </select>
            </div>

            {/* Link Config Fields */}
            <div className="bg-black/30 border border-white/5 rounded-xl p-4 space-y-4">
              {/* TOP_N / BOTTOM_N */}
              {(formData.linkType === 'TOP_N' || formData.linkType === 'BOTTOM_N') && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1.5">Number of Teams</label>
                      <input
                        type="number"
                        min={1}
                        value={linkCount}
                        onChange={e => setLinkCount(Number(e.target.value))}
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1.5">Standings Grouping</label>
                      <select
                        value={linkGroupBy || ''}
                        onChange={e => setLinkGroupBy(e.target.value || null)}
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-white focus:outline-none"
                      >
                        <option value="">Overall Standings</option>
                        <option value="group">Per Group</option>
                      </select>
                    </div>
                  </div>
                  {formData.linkType === 'TOP_N' && (
                    <div>
                      <label className="block text-xs text-gray-400 mb-1.5">
                        Seed Mapping (Optional, comma-separated e.g. 1, 3, 2, 4)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 1, 2, 3, 4"
                        value={linkSeedMappingText}
                        onChange={e => setLinkSeedMappingText(e.target.value)}
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-white focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* POSITION_RANGE */}
              {formData.linkType === 'POSITION_RANGE' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1.5">Start Position</label>
                      <input
                        type="number"
                        min={1}
                        value={linkStartPosition}
                        onChange={e => setLinkStartPosition(Number(e.target.value))}
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1.5">End Position</label>
                      <input
                        type="number"
                        min={1}
                        value={linkEndPosition}
                        onChange={e => setLinkEndPosition(Number(e.target.value))}
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-white focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">Standings Grouping</label>
                    <select
                      value={linkGroupBy || ''}
                      onChange={e => setLinkGroupBy(e.target.value || null)}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-white focus:outline-none"
                    >
                      <option value="">Overall Standings</option>
                      <option value="group">Per Group</option>
                    </select>
                  </div>
                </div>
              )}

              {/* WINNER / RUNNER_UP */}
              {(formData.linkType === 'WINNER' || formData.linkType === 'RUNNER_UP') && (
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">
                    Target Seeding Slot (e.g. 1 for Seed 1)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={linkSlotNumber}
                    onChange={e => setLinkSlotNumber(Number(e.target.value))}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-white focus:outline-none"
                  />
                </div>
              )}

              {/* GROUP_POSITION */}
              {formData.linkType === 'GROUP_POSITION' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-1">
                      <label className="block text-xs text-gray-400 mb-1.5">Group Position</label>
                      <input
                        type="number"
                        min={1}
                        value={linkPosition}
                        onChange={e => setLinkPosition(Number(e.target.value))}
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-white focus:outline-none"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs text-gray-400 mb-1.5">Groups (comma-separated)</label>
                      <input
                        type="text"
                        value={linkGroupNamesText}
                        onChange={e => setLinkGroupNamesText(e.target.value)}
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-white focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">Group Seed Mapping (e.g. Group A: 1, Group B: 2)</label>
                    <input
                      type="text"
                      value={linkGroupSeedMappingText}
                      onChange={e => setLinkGroupSeedMappingText(e.target.value)}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-white focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* MULTIPLE_POSITIONS_PER_GROUP */}
              {formData.linkType === 'MULTIPLE_POSITIONS_PER_GROUP' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1.5">Positions (comma-separated)</label>
                      <input
                        type="text"
                        placeholder="e.g. 1, 2"
                        value={linkPositionsPerGroupText}
                        onChange={e => setLinkPositionsPerGroupText(e.target.value)}
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1.5">Groups (comma-separated)</label>
                      <input
                        type="text"
                        placeholder="e.g. Group A, Group B"
                        value={linkMultipleGroupsText}
                        onChange={e => setLinkMultipleGroupsText(e.target.value)}
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-white focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">Seed Mapping Order (comma-separated)</label>
                    <input
                      type="text"
                      placeholder="e.g. 1, 3, 2, 4"
                      value={linkMultipleSeedMappingText}
                      onChange={e => setLinkMultipleSeedMappingText(e.target.value)}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-white focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Team Selection */}
      {!formData.isLinkedTournament && (
        <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-black text-white">
            Select Teams ({formData.selectedTeams.length} selected)
          </h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={selectAllTeams}
              className="px-3 sm:px-4 py-2 bg-[#E8A800]/20 text-[#E8A800] rounded-lg text-xs sm:text-sm font-medium hover:bg-[#E8A800]/30 transition-all"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={clearTeams}
              className="px-3 sm:px-4 py-2 bg-white/5 text-[#7A7367] rounded-lg text-xs sm:text-sm font-medium hover:bg-white/10 transition-all"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {teams.map((team) => (
            <label
              key={team.id}
              className={`cursor-pointer rounded-lg sm:rounded-xl border-2 p-3 sm:p-4 transition-all ${
                formData.selectedTeams.includes(team.id)
                  ? 'border-[#E8A800] bg-[#E8A800]/10'
                  : 'border-white/10 bg-black/30 hover:border-white/20'
              }`}
            >
              <input
                type="checkbox"
                checked={formData.selectedTeams.includes(team.id)}
                onChange={() => toggleTeam(team.id)}
                className="sr-only"
              />
              <div className="text-center">
                <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 rounded-lg bg-white/5 flex items-center justify-center overflow-hidden">
                  {team.logoUrl ? (
                    <img src={team.logoUrl} alt={team.name} className="w-full h-full object-contain p-1" />
                  ) : (
                    <span className="text-lg sm:text-2xl">⚽</span>
                  )}
                </div>
                <div className="text-xs sm:text-sm font-medium text-white truncate">{team.name}</div>
              </div>
            </label>
          ))}
        </div>

        {formData.selectedTeams.length < 2 && (
          <div className="mt-4 text-xs sm:text-sm text-yellow-400">
            Please select at least 2 teams to create a tournament
          </div>
        )}
      </div>
      )}

      {/* Submit */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 sm:px-6 py-2.5 sm:py-3 bg-white/5 border border-white/10 text-white rounded-lg sm:rounded-xl font-bold hover:bg-white/10 transition-all text-sm sm:text-base"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || (!formData.isLinkedTournament && formData.selectedTeams.length < 2) || (formData.isLinkedTournament && !formData.linkSourceTournamentId)}
          className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-[#E8A800] to-[#FFB347] hover:from-[#FFC93A] hover:to-[#FFB347] text-[#0a0a0a] rounded-lg sm:rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base flex items-center justify-center gap-2"
        >
          {loading && <LoadingSpinner size="sm" />}
          {loading ? (!!initialTournament ? 'Saving Changes...' : 'Creating...') : (!!initialTournament ? 'Save Changes' : 'Create Tournament')}
        </button>
      </div>
    </form>
  )
}
