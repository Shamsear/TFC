'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { EFootballPlayer } from '@/lib/sqlite-parser'
import { normalizeString } from '@/lib/search-utils'
import { PreviewResponse } from '@/app/api/import/preview/route'
import PlayerPreviewList from './PlayerPreviewList'
import ImportSummary from './ImportSummary'

interface ImportWizardProps {
  seasonId: string
}

type Step = 'upload' | 'preview' | 'confirm' | 'progress' | 'complete'

const SKILL_FIELDS = [
  'scissorsFeint', 'doubleTouch', 'flipFlap', 'marseilleTurn', 'sombrero', 'chopTurn', 'cutBehindTurn', 'scotchMove', 'soleControl', 'momentumDribbling', 'accelerationBurst', 'magneticFeet',
  'headingSkill', 'bulletHeader',
  'longRangeCurler', 'blitzCurler', 'chipShotControl', 'knuckleShot', 'dippingShot', 'risingShot', 'longRangeShooting', 'lowScreamer', 'acrobaticFinishing', 'heelTrick', 'firstTimeShot', 'phenomenalFinishing', 'willpower',
  'oneTouchPass', 'throughPassing', 'weightedPass', 'pinpointCrossing', 'edgedCrossing', 'outsideCurler', 'rabona', 'noLookPass', 'gameChangingPass', 'visionaryPass', 'phenomenalPass', 'lowLoftedPass',
  'gkLowPunt', 'gkHighPunt', 'longThrow', 'gkLongThrow', 'penaltySpecialist', 'gkPenaltySaver', 'gkDirectingDefence', 'gkSpiritRoar',
  'gamesmanship', 'manMarking', 'trackBack', 'interception', 'blocker', 'aerialSuperiority', 'slidingTackle', 'longReachTackle', 'fortress', 'acrobaticClearance', 'aerialFort',
  'captaincy', 'attackTrigger', 'superSub', 'fightingSpirit', 'trickster', 'mazingRun', 'speedingBullet', 'incisiveRun', 'longBallExpert', 'earlyCross', 'longRanger'
]

const STAT_FIELDS = [
  'offensiveAwareness', 'ballControl', 'dribbling', 'tightPossession', 'lowPass', 'loftedPass', 'finishing', 'heading', 'setPieceTaking', 'curl',
  'speed', 'acceleration', 'kickingPower', 'jumping', 'physicalContact', 'balance', 'stamina',
  'defensiveAwareness', 'tackling', 'aggression', 'defensiveEngagement',
  'gkAwareness', 'gkCatching', 'gkParrying', 'gkReflexes', 'gkReach'
]

const isFieldIgnored = (field: string, ignored: string[]) => {
  if (ignored.includes(field)) return true
  if (ignored.includes('stats') && STAT_FIELDS.includes(field)) return true
  if (ignored.includes('skills') && SKILL_FIELDS.includes(field)) return true
  return false
}

interface ImportProgress {
  total: number
  processed: number
  imported: number
  updated: number
  skipped: number
  errors: Array<{ player: string; error: string }>
  currentPlayer?: string
  importedPlayers: string[]
  updatedPlayers: string[]
}

export default function ImportWizard({ seasonId }: ImportWizardProps) {
  const router = useRouter()
  const [step, setStep] = useState<Step>('upload')
  const [mode, setMode] = useState<'import' | 'update' | 'bulk'>('import')
  const [tabIgnoredFields, setTabIgnoredFields] = useState<Record<string, string[]>>({
    new: [],
    changed: [],
    unchanged: [],
    duplicates: [],
    'name-duplicates': [],
    'new-duplicates': [],
    all: []
  })
  const [rawDbData, setRawDbData] = useState<{ existingPlayers: any[], nameMatches: any[] } | null>(null)
  const [parsedPlayers, setParsedPlayers] = useState<any[] | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set())
  const [duplicateResolutions, setDuplicateResolutions] = useState<Record<string, 'skip' | 'replace' | 'add' | string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [importSessionId, setImportSessionId] = useState<string | null>(null)
  const [isStagingCleared, setIsStagingCleared] = useState(false)
  const [isClearingStaging, setIsClearingStaging] = useState(false)
  const [stagedPreviewData, setStagedPreviewData] = useState<PreviewResponse | null>(null)
  const [stagedInfo, setStagedInfo] = useState<{ count: number; sessionId: string; seasonId: string } | null>(null)
  const [isCheckingStaged, setIsCheckingStaged] = useState(false)
  const [isLoadingStagedPreview, setIsLoadingStagedPreview] = useState(false)
  const [isClearingAllStaging, setIsClearingAllStaging] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [error, setError] = useState('')
  const [result, setResult] = useState<any>(null)
  const [progress, setProgress] = useState<ImportProgress>({
    total: 0,
    processed: 0,
    imported: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    importedPlayers: [],
    updatedPlayers: []
  })

  useEffect(() => {
    if (seasonId) {
      checkStagedData(seasonId)
    }
  }, [seasonId])

  const checkStagedData = async (sid: string) => {
    setIsCheckingStaged(true)
    try {
      const res = await fetch(`/api/import/stage?seasonId=${sid}`)
      if (res.ok) {
        const data = await res.json()
        if (data.hasStagedData && data.count > 0) {
          setStagedInfo({
            count: data.count,
            sessionId: data.sessionId,
            seasonId: data.seasonId || sid
          })
        } else {
          const globalRes = await fetch('/api/import/stage')
          if (globalRes.ok) {
            const globalData = await globalRes.json()
            if (globalData.hasStagedData && globalData.count > 0) {
              setStagedInfo({
                count: globalData.count,
                sessionId: globalData.sessionId,
                seasonId: globalData.seasonId
              })
            } else {
              setStagedInfo(null)
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to check staged data:', err)
    } finally {
      setIsCheckingStaged(false)
    }
  }

  const handleLoadStagedData = async (sessId: string, targetSeasonId: string) => {
    setIsLoadingStagedPreview(true)
    setError('')
    try {
      const res = await fetch(`/api/import/preview-staged?sessionId=${sessId}&seasonId=${targetSeasonId}`)
      if (!res.ok) {
        const errText = await res.text()
        throw new Error(`Failed to load staged data: ${errText}`)
      }
      const data: PreviewResponse = await res.json()
      setStagedPreviewData(data)
      setImportSessionId(sessId)

      const autoSelected = new Set<string>()
      data.players.forEach(p => autoSelected.add(p.playerId))
      setSelectedPlayers(autoSelected)

      const resolutions: Record<string, 'skip' | 'replace' | 'add' | string> = {}
      data.duplicates.forEach(d => {
        if (d.duplicateType === 'file-vs-file' && d.allFileInstances) {
          resolutions[d.playerId] = d.allFileInstances[0].playerId
        } else {
          resolutions[d.playerId] = 'skip'
        }
      })
      setDuplicateResolutions(resolutions)

      setStep('preview')
    } catch (err) {
      console.error('Failed to load staged preview:', err)
      setError(err instanceof Error ? err.message : 'Failed to load staged player data')
    } finally {
      setIsLoadingStagedPreview(false)
    }
  }

  const handleClearAllStaging = async () => {
    setIsClearingAllStaging(true)
    setError('')
    setSuccessMsg('')
    try {
      const res = await fetch('/api/import/stage?all=true', { method: 'DELETE' })
      if (!res.ok) {
        const errText = await res.text()
        throw new Error(`Failed to clear temp table: ${errText}`)
      }
      setStagedInfo(null)
      setStagedPreviewData(null)
      setImportSessionId(null)
      setIsStagingCleared(true)
      setSuccessMsg('Temporary staging table cleared completely (0 records remaining).')
      setStep('upload')
    } catch (err) {
      console.error('Failed to clear temp table:', err)
      setError(err instanceof Error ? err.message : 'Failed to clear temporary staging table')
    } finally {
      setIsClearingAllStaging(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.db')) {
        setError('Please select a .db file')
        setFile(null)
        return
      }
      
      setFile(selectedFile)
      setError('')
    }
  }

  const handleBulkImport = async () => {
    if (!file) return

    setStep('progress')
    setIsLoading(true)
    setError('')

    try {
      console.log('Starting bulk import - parsing database file...')
      const { parseClientSQLiteDB } = await import('@/lib/client-sqlite-parser')
      
      const parseResult = await parseClientSQLiteDB(file)
      
      if (!parseResult.success || !parseResult.players) {
        throw new Error(parseResult.error || 'Failed to parse database file')
      }

      const allPlayers = parseResult.players
      console.log(`Parsed ${allPlayers.length} players from database`)

      // Initialize progress
      setProgress({
        total: allPlayers.length,
        processed: 0,
        imported: 0,
        updated: 0,
        skipped: 0,
        errors: [],
        importedPlayers: [],
        updatedPlayers: []
      })

      // Process in batches of 100 players
      const BATCH_SIZE = 100
      let totalImported = 0
      let totalUpdated = 0
      let totalSkipped = 0
      const allErrors: Array<{ player: string; error: string }> = []
      const allImportedPlayers: string[] = []
      const allUpdatedPlayers: string[] = []

      for (let batchStart = 0; batchStart < allPlayers.length; batchStart += BATCH_SIZE) {
        const batchEnd = Math.min(batchStart + BATCH_SIZE, allPlayers.length)
        const batch = allPlayers.slice(batchStart, batchEnd)
        
        console.log(`Processing batch ${Math.floor(batchStart / BATCH_SIZE) + 1}/${Math.ceil(allPlayers.length / BATCH_SIZE)} (${batch.length} players)`)

        // Send batch to server
        const response = await fetch('/api/import/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            seasonId,
            players: batch,
            batchInfo: {
              batchNumber: Math.floor(batchStart / BATCH_SIZE) + 1,
              totalBatches: Math.ceil(allPlayers.length / BATCH_SIZE),
              overallStart: batchStart,
              overallTotal: allPlayers.length
            }
          })
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error('Bulk import batch failed:', errorText)
          throw new Error(`Failed to import batch: ${response.status} ${errorText}`)
        }

        const reader = response.body?.getReader()
        const decoder = new TextDecoder()

        if (!reader) {
          throw new Error('No response body')
        }

        let buffer = ''
        
        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            console.log(`Batch ${Math.floor(batchStart / BATCH_SIZE) + 1} completed`)
            break
          }

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))

                if (data.type === 'progress') {
                  // Only keep last 50 player names to avoid memory issues
                  const recentImported = [...allImportedPlayers, ...(data.importedPlayers || [])].slice(-50)
                  const recentUpdated = [...allUpdatedPlayers, ...(data.updatedPlayers || [])].slice(-50)
                  
                  setProgress({
                    total: allPlayers.length,
                    processed: batchStart + data.processed,
                    imported: totalImported + data.imported,
                    updated: totalUpdated + data.updated,
                    skipped: totalSkipped + data.skipped,
                    errors: [...allErrors, ...data.errors],
                    currentPlayer: data.currentPlayer,
                    importedPlayers: recentImported,
                    updatedPlayers: recentUpdated
                  })
                } else if (data.type === 'current') {
                  setProgress(prev => ({
                    ...prev,
                    currentPlayer: data.currentPlayer
                  }))
                } else if (data.type === 'complete') {
                  console.log('Batch complete:', data)
                  totalImported += data.imported
                  totalUpdated += data.updated
                  totalSkipped += data.skipped
                  allErrors.push(...data.errors)
                  allImportedPlayers.push(...(data.importedPlayers || []))
                  allUpdatedPlayers.push(...(data.updatedPlayers || []))
                } else if (data.type === 'error') {
                  console.error('Stream error:', data.error)
                  throw new Error(data.error)
                }
              } catch (parseError) {
                console.error('Failed to parse SSE data:', line, parseError)
              }
            }
          }
        }
      }

      // All batches complete
      console.log('All batches complete:', { totalImported, totalUpdated, totalSkipped })
      setResult({
        success: true,
        imported: totalImported,
        updated: totalUpdated,
        skipped: totalSkipped,
        total: allPlayers.length,
        errors: allErrors
      })
      setProgress({
        total: allPlayers.length,
        processed: allPlayers.length,
        imported: totalImported,
        updated: totalUpdated,
        skipped: totalSkipped,
        errors: allErrors,
        importedPlayers: allImportedPlayers,
        updatedPlayers: allUpdatedPlayers
      })
      setStep('complete')
    } catch (err) {
      console.error('Bulk import error:', err)
      setError(err instanceof Error ? err.message : 'Failed to bulk import players')
      setStep('upload')
    } finally {
      setIsLoading(false)
    }
  }

  // Memoized preview calculation
  const preview = useMemo(() => {
    if (!rawDbData || !parsedPlayers) return null

    const { existingPlayers, nameMatches } = rawDbData

    const existingMap = new Map(existingPlayers.map(p => [p.player_id, p]))
    const nameMatchesMap = new Map<string, any[]>()
    nameMatches.forEach(p => {
      const key = normalizeString(p.name)
      if (!nameMatchesMap.has(key)) {
        nameMatchesMap.set(key, [])
      }
      nameMatchesMap.get(key)!.push(p)
    })

    const duplicates: any[] = []
    const newPlayers: any[] = []
    const changedPlayers: any[] = []
    const unchangedPlayers: any[] = []

    // Identify file-vs-file duplicates (based on player_id)
    const fileDuplicateGroups = new Map<string, any[]>()
    const seenPlayerIds = new Set<string>()
    const fileDuplicateIds = new Set<string>()
    for (const player of parsedPlayers) {
      if (!fileDuplicateGroups.has(player.playerId)) {
        fileDuplicateGroups.set(player.playerId, [])
      }
      fileDuplicateGroups.get(player.playerId)!.push(player)
      
      if (seenPlayerIds.has(player.playerId)) {
        fileDuplicateIds.add(player.playerId)
      }
      seenPlayerIds.add(player.playerId)
    }

    const processedDuplicates = new Set<string>()

    // Temporary lists/maps for groupings
    const singleNewStatsPlayers: any[] = []
    const dbNameMatchesGroupMap = new Map<string, { existingPlayer: any, newCards: any[] }>()
    const fileNewGroupsMap = new Map<string, { name: string, nationality: string, newCards: any[] }>()

    for (const player of parsedPlayers) {
      // Process file-vs-file duplicates
      if (fileDuplicateIds.has(player.playerId)) {
        if (!processedDuplicates.has(player.playerId)) {
          processedDuplicates.add(player.playerId)
          const instances = fileDuplicateGroups.get(player.playerId) || []
          duplicates.push({
            playerId: player.playerId,
            playerName: player.playerName,
            position: player.position,
            existingCount: instances.length - 1,
            existingPlayers: [],
            reason: `Found ${instances.length} entries for this player in the uploaded file (same player_id)`,
            duplicateType: 'file-vs-file',
            allFileInstances: instances
          })
        }
        continue
      }

      const existing = existingMap.get(player.playerId)
      if (existing) {
        const existingStats = existing.seasonalPlayerStats[0]
        
        if (existingStats) {
          const oldStats = {
            position: existingStats.position,
            overallRating: existingStats.overallRating,
            playingStyle: existingStats.playing_style || '',
            teamName: existingStats.realWorldClub,
            nationality: existingStats.nationality || '',
            height: existingStats.height || 0,
            weight: existingStats.weight || 0,
            age: existingStats.age || 0,
            foot: existingStats.foot || '',
            featured: existingStats.featured || '',
            weakFootUsage: existingStats.weak_foot_usage || '',
            weakFootAccuracy: existingStats.weak_foot_accuracy || '',
            form: existingStats.form || '',
            injuryResistance: existingStats.injury_resistance || '',
            condition: existingStats.condition || '',
            maxLevel: existingStats.max_level || 0,
            overallAtMaxLevel: existingStats.overall_at_max_level || 0,
            offensiveAwareness: existingStats.offensive_awareness || 0,
            ballControl: existingStats.ball_control || 0,
            dribbling: existingStats.dribbling || 0,
            tightPossession: existingStats.tight_possession || 0,
            lowPass: existingStats.low_pass || 0,
            loftedPass: existingStats.lofted_pass || 0,
            finishing: existingStats.finishing || 0,
            heading: existingStats.heading || 0,
            setPieceTaking: existingStats.set_piece_taking || 0,
            curl: existingStats.curl || 0,
            speed: existingStats.speed || 0,
            acceleration: existingStats.acceleration || 0,
            kickingPower: existingStats.kicking_power || 0,
            jumping: existingStats.jumping || 0,
            physicalContact: existingStats.physical_contact || 0,
            balance: existingStats.balance || 0,
            stamina: existingStats.stamina || 0,
            defensiveAwareness: existingStats.defensive_awareness || 0,
            tackling: existingStats.tackling || 0,
            aggression: existingStats.aggression || 0,
            defensiveEngagement: existingStats.defensive_engagement || 0,
            gkAwareness: existingStats.gk_awareness || 0,
            gkCatching: existingStats.gk_catching || 0,
            gkParrying: existingStats.gk_parrying || 0,
            gkReflexes: existingStats.gk_reflexes || 0,
            gkReach: existingStats.gk_reach || 0
          }

          // Compare stats to see if changed, using tabIgnoredFields['changed']
          const changedFields: string[] = []
          Object.keys(oldStats).forEach((key) => {
            const oldVal = (oldStats as any)[key]
            const newVal = (player as any)[key]
            
            // Skip if key is ignored for the 'changed' tab
            if (isFieldIgnored(key, tabIgnoredFields['changed'] || [])) return

            // Check if values are different
            if (oldVal !== newVal && !(oldVal === 0 && newVal === null) && !(oldVal === '' && newVal === null)) {
              changedFields.push(key)
            }
          })
          
          if (changedFields.length > 0) {
            changedPlayers.push({
              playerId: player.playerId,
              playerName: player.playerName,
              oldStats,
              newStats: player,
              changedFields
            })
          } else {
            unchangedPlayers.push(player)
          }
        } else {
          // Player exists in database but has no stats for this season
          singleNewStatsPlayers.push(player)
        }
      } else {
        // Check for database players with same name and nationality but different player ID
        const matches = nameMatchesMap.get(normalizeString(player.playerName)) || []
        const sameNameNation = matches.find(m => {
          const dbStats = m.seasonalPlayerStats[0]
          return dbStats && normalizeString(dbStats.nationality || '') === normalizeString(player.nationality || '')
        })

        if (sameNameNation) {
          // Group under this existing database player
          const dbPlayerId = sameNameNation.id
          if (!dbNameMatchesGroupMap.has(dbPlayerId)) {
            const dbStats = sameNameNation.seasonalPlayerStats[0]
            dbNameMatchesGroupMap.set(dbPlayerId, {
              existingPlayer: {
                id: sameNameNation.id,
                playerId: sameNameNation.player_id,
                name: sameNameNation.name,
                team: dbStats?.realWorldClub || 'Unknown',
                rating: dbStats?.overallRating || 0,
                position: dbStats?.position || 'N/A',
                nationality: dbStats?.nationality || 'N/A',
                featured: dbStats?.featured || 'N/A'
              },
              newCards: []
            })
          }
          dbNameMatchesGroupMap.get(dbPlayerId)!.newCards.push(player)
        } else {
          // Brand-new player: group by name + nationality to check for multiple copies in the file
          const key = `${player.playerName.toLowerCase().trim()}|${(player.nationality || '').toLowerCase().trim()}`
          if (!fileNewGroupsMap.has(key)) {
            fileNewGroupsMap.set(key, {
              name: player.playerName,
              nationality: player.nationality || '',
              newCards: []
            })
          }
          fileNewGroupsMap.get(key)!.newCards.push(player)
        }
      }
    }

    // Convert groupings to final preview arrays
    const newDuplicates: any[] = []
    for (const [key, group] of fileNewGroupsMap.entries()) {
      if (group.newCards.length > 1) {
        newDuplicates.push(group)
      } else {
        newPlayers.push(group.newCards[0])
      }
    }

    // Add single new stats players to newPlayers
    singleNewStatsPlayers.forEach(p => newPlayers.push(p))

    const nameDuplicates = Array.from(dbNameMatchesGroupMap.values())

    const previewData: PreviewResponse = {
      mode: mode === 'bulk' ? 'import' : mode,
      seasonId,
      players: parsedPlayers,
      newPlayers,
      changedPlayers,
      unchangedPlayers,
      duplicates,
      nameDuplicates,
      newDuplicates,
      stats: {
        total: parsedPlayers.length,
        new: newPlayers.length,
        changed: changedPlayers.length,
        unchanged: unchangedPlayers.length,
        duplicates: duplicates.length,
        nameDuplicates: nameDuplicates.length,
        newDuplicates: newDuplicates.length
      }
    }

    return previewData
  }, [rawDbData, parsedPlayers, tabIgnoredFields, mode, seasonId])

  // Initialize selection and resolutions when raw database data changes
  useEffect(() => {
    if (!preview) return

    // Auto-select all new and changed players (only if mode is NOT 'update')
    const autoSelected = new Set<string>()
    if (mode !== 'update') {
      preview.newPlayers.forEach(p => autoSelected.add(p.playerId))
      preview.changedPlayers.forEach(p => autoSelected.add(p.playerId))
    }
    setSelectedPlayers(autoSelected)

    // Initialize duplicate resolutions
    const resolutions: Record<string, 'skip' | 'replace' | 'add' | string> = {}
    preview.duplicates.forEach(d => {
      if (d.duplicateType === 'file-vs-file' && d.allFileInstances) {
        resolutions[d.playerId] = d.allFileInstances[0].playerId
      } else {
        resolutions[d.playerId] = 'skip'
      }
    })
    setDuplicateResolutions(resolutions)
  }, [rawDbData])

  const handlePreview = async () => {
    if (!file) return

    // If bulk mode, skip preview and go straight to import
    if (mode === 'bulk') {
      await handleBulkImport()
      return
    }

    setIsLoading(true)
    setError('')

    try {
      // Parse the database file client-side
      console.log('Parsing database file client-side...')
      const { parseClientSQLiteDB } = await import('@/lib/client-sqlite-parser')
      
      const parseResult = await parseClientSQLiteDB(file)
      
      if (!parseResult.success || !parseResult.players) {
        throw new Error(parseResult.error || 'Failed to parse database file')
      }

      console.log(`Parsed ${parseResult.players.length} players from database`)

      // Extract player IDs and names to check against database
      const playerIds = parseResult.players.map(p => p.playerId)
      const playerNames = parseResult.players.map(p => p.playerName)

      // Send IDs and names to server
      const response = await fetch('/api/import/preview-parsed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerIds,
          playerNames,
          seasonId,
          mode
        })
      })

      // Check content type before parsing
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        console.error('Non-JSON response:', text)
        throw new Error(`Server returned non-JSON response: ${text.substring(0, 100)}`)
      }

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to preview')
      }

      const { existingPlayers, nameMatches = [] } = await response.json() as {
        existingPlayers: any[]
        nameMatches: any[]
      }

      setRawDbData({ existingPlayers, nameMatches })
      setParsedPlayers(parseResult.players)
      setStep('preview')
    } catch (err) {
      console.error('Preview error:', err)
      setError(err instanceof Error ? err.message : 'Failed to preview import')
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfirm = async () => {
    if (!preview) return

    setStep('progress')
    setIsLoading(true)
    setError('')

    try {
      // Get selected player objects
      const selected: EFootballPlayer[] = []
      const processedDuplicateGroups = new Set<string>()
      
      for (const player of preview.players) {
        if (selectedPlayers.has(player.playerId)) {
          const duplicateInfo = preview.duplicates.find(d => d.playerId === player.playerId)
          
          if (duplicateInfo?.duplicateType === 'file-vs-file' && duplicateInfo.allFileInstances) {
            if (!processedDuplicateGroups.has(duplicateInfo.playerId)) {
              processedDuplicateGroups.add(duplicateInfo.playerId)
              
              // Get the resolution for this duplicate
              const resolution = duplicateResolutions[duplicateInfo.playerId]
              
              if (resolution) {
                // Parse comma-separated player IDs
                const selectedIds = resolution.split(',')
                const selectedInstances = duplicateInfo.allFileInstances.filter(
                  instance => selectedIds.includes(instance.playerId)
                )
                selected.push(...selectedInstances)
              } else {
                // Fallback to first instance if no resolution
                selected.push(duplicateInfo.allFileInstances[0])
              }
            }
          } else {
            selected.push(player)
          }
        }
      }

      console.log(`Starting import of ${selected.length} players using staging table...`)

      // Initialize progress
      setProgress({
        total: selected.length,
        processed: 0,
        imported: 0,
        updated: 0,
        skipped: 0,
        errors: [],
        importedPlayers: [],
        updatedPlayers: []
      })

      // 1. Stage the selected players in database
      setProgress(prev => ({
        ...prev,
        currentPlayer: 'Staging players in database...'
      }))
      const stageResponse = await fetch('/api/import/stage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seasonId,
          players: selected
        })
      })

      if (!stageResponse.ok) {
        const errorText = await stageResponse.text()
        throw new Error(`Failed to stage players: ${errorText}`)
      }

      const { importSessionId: sessionUuid } = await stageResponse.json()
      setImportSessionId(sessionUuid)
      setIsStagingCleared(false)

      // Update progress to show staging completed
      setProgress(prev => ({
        ...prev,
        processed: Math.floor(selected.length / 2),
        currentPlayer: 'Applying changes from staging table...'
      }))

      // 2. Commit the staging table to production
      const confirmResponse = await fetch('/api/import/confirm-staged', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionUuid,
          seasonId,
          duplicateResolutions
        })
      })

      if (!confirmResponse.ok) {
        const errorText = await confirmResponse.text()
        throw new Error(`Failed to apply staged changes: ${errorText}`)
      }

      const confirmData = await confirmResponse.json()

      // 3. Set the results and complete
      setResult({
        success: true,
        imported: confirmData.imported,
        updated: confirmData.updated,
        skipped: confirmData.skipped,
        total: selected.length,
        errors: []
      })
      
      setProgress({
        total: selected.length,
        processed: selected.length,
        imported: confirmData.imported,
        updated: confirmData.updated,
        skipped: confirmData.skipped,
        errors: [],
        importedPlayers: [],
        updatedPlayers: []
      })
      
      setStep('complete')
    } catch (err) {
      console.error('Import error:', err)
      setError(err instanceof Error ? err.message : 'Failed to import players')
      setStep('confirm') // Go back to confirm step on error
    } finally {
      setIsLoading(false)
    }
  }

  const handleClearStaging = async () => {
    if (!importSessionId) return
    setIsClearingStaging(true)
    setError('')
    try {
      const response = await fetch(`/api/import/stage?sessionId=${importSessionId}`, {
        method: 'DELETE'
      })
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to clear staging: ${errorText}`)
      }
      setIsStagingCleared(true)
    } catch (err) {
      console.error('Failed to clear staging:', err)
      setError(err instanceof Error ? err.message : 'Failed to clear staging table')
    } finally {
      setIsClearingStaging(false)
    }
  }

  const activePreview = stagedPreviewData || preview

  const togglePlayer = (playerId: string) => {
    const newSelected = new Set(selectedPlayers)
    if (newSelected.has(playerId)) {
      newSelected.delete(playerId)
    } else {
      newSelected.add(playerId)
    }
    setSelectedPlayers(newSelected)
  }

  const toggleAll = (playerIds?: string[]) => {
    if (!activePreview) return
    
    if (playerIds && playerIds.length > 0) {
      const allSelected = playerIds.every(id => selectedPlayers.has(id))
      const newSelected = new Set(selectedPlayers)
      if (allSelected) {
        playerIds.forEach(id => newSelected.delete(id))
      } else {
        playerIds.forEach(id => newSelected.add(id))
      }
      setSelectedPlayers(newSelected)
    } else {
      if (selectedPlayers.size === activePreview.players.length) {
        setSelectedPlayers(new Set())
      } else {
        setSelectedPlayers(new Set(activePreview.players.map(p => p.playerId)))
      }
    }
  }

  const togglePage = (playerIds: string[], select: boolean) => {
    const newSelected = new Set(selectedPlayers)
    playerIds.forEach(id => {
      if (select) {
        newSelected.add(id)
      } else {
        newSelected.delete(id)
      }
    })
    setSelectedPlayers(newSelected)
  }

  const batchResolveDuplicates = (resolutions: Record<string, 'skip' | 'replace' | 'add' | string>) => {
    setDuplicateResolutions(prev => ({ ...prev, ...resolutions }))
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-2 sm:gap-4 overflow-x-auto pb-2">
        {['upload', 'preview', 'confirm', 'progress', 'complete'].map((s, idx) => (
          <div key={s} className="flex items-center flex-shrink-0">
            <div className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 font-bold text-sm sm:text-base transition-all ${
              step === s ? 'bg-[#E8A800] border-[#E8A800] text-[#0a0a0a] scale-110' :
              ['upload', 'preview', 'confirm', 'progress', 'complete'].indexOf(step) > idx ? 'bg-emerald-500 border-emerald-500 text-white' :
              'bg-white/5 border-white/20 text-[#7A7367]'
            }`}>
              {['upload', 'preview', 'confirm', 'progress', 'complete'].indexOf(step) > idx ? (
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                idx + 1
              )}
            </div>
            {idx < 4 && (
              <div className={`w-8 sm:w-16 h-0.5 transition-all ${
                ['upload', 'preview', 'confirm', 'progress', 'complete'].indexOf(step) > idx ? 'bg-emerald-500' : 'bg-white/20'
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Step Labels */}
      <div className="flex items-center justify-center gap-2 sm:gap-4">
        {[
          { key: 'upload', label: 'Upload' },
          { key: 'preview', label: 'Preview' },
          { key: 'confirm', label: 'Confirm' },
          { key: 'progress', label: 'Progress' },
          { key: 'complete', label: 'Complete' }
        ].map((s) => (
          <div key={s.key} className={`text-xs sm:text-sm font-medium transition-colors ${
            step === s.key ? 'text-[#E8A800]' : 'text-[#7A7367]'
          }`}>
            {s.label}
          </div>
        ))}
      </div>

      {/* Step Content */}
      {step === 'upload' && (
        <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6 lg:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-white/10">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white">Upload Database</h2>
              <p className="text-xs text-gray-400 font-mono mt-0.5">
                {stagedInfo && stagedInfo.count > 0 
                  ? `Found ${stagedInfo.count.toLocaleString()} staged players. Resume below or upload a new .db file.` 
                  : 'Select a database file (.db) to begin import'}
              </p>
            </div>

            <button
              type="button"
              onClick={handleClearAllStaging}
              disabled={isClearingAllStaging}
              className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 hover:text-red-300 px-3.5 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 flex-shrink-0"
              title="Instantly truncates import_staging_players table with 0 DB read/write operation overhead"
            >
              {isClearingAllStaging ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5 text-red-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Truncating Table...
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Clear Temp Staging Table
                </>
              )}
            </button>
          </div>

          {/* Staged Data Detected Alert Banner */}
          {isCheckingStaged ? (
            <div className="mb-6 bg-blue-500/10 border border-blue-500/20 text-blue-400 p-4 rounded-2xl flex items-center gap-3 font-mono text-xs uppercase tracking-wider">
              <svg className="animate-spin h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Checking temporary staging table for existing data...</span>
            </div>
          ) : stagedInfo && stagedInfo.count > 0 ? (
            <div className="mb-6 bg-[#E8A800]/10 border-2 border-[#E8A800]/40 p-5 sm:p-6 rounded-2xl shadow-lg backdrop-blur-xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-[#E8A800] font-black text-sm uppercase tracking-wider">
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Existing Staged Data Detected ({stagedInfo.count.toLocaleString()} Players)
                  </div>
                  <p className="text-xs text-gray-300 font-mono">
                    There are already <strong className="text-white">{stagedInfo.count.toLocaleString()}</strong> players staged in temporary storage. You do not need to re-upload a .db file!
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleLoadStagedData(stagedInfo.sessionId, stagedInfo.seasonId)}
                    disabled={isLoadingStagedPreview}
                    className="bg-gradient-to-r from-[#E8A800] to-[#FFB347] hover:from-[#FFC93A] hover:to-[#FFB347] text-[#0a0a0a] px-4 py-2.5 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-md"
                  >
                    {isLoadingStagedPreview ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-[#0a0a0a]" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Loading Staged Data...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Resume Staged Players ({stagedInfo.count})
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleClearAllStaging}
                    disabled={isClearingAllStaging}
                    className="bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 hover:text-red-300 px-4 py-2.5 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all flex items-center gap-2"
                  >
                    {isClearingAllStaging ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-red-400" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Truncating...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Clear Temp Table
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {successMsg && (
            <div className="mb-4 sm:mb-6 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2 font-mono">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span>{successMsg}</span>
            </div>
          )}

          {/* Mode Selection */}
          <div className="mb-4 sm:mb-6">
            <label className="block text-sm font-bold text-white mb-3">Import Mode</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <button
                type="button"
                onClick={() => setMode('import')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  mode === 'import'
                    ? 'bg-[#E8A800]/20 border-[#E8A800] text-[#E8A800]'
                    : 'bg-black/30 border-white/10 text-[#D4CCBB] hover:border-white/20'
                }`}
              >
                <div className="font-bold mb-1 text-sm sm:text-base">Import</div>
                <div className="text-xs">New season - import all players</div>
              </button>
              <button
                type="button"
                onClick={() => setMode('update')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  mode === 'update'
                    ? 'bg-[#E8A800]/20 border-[#E8A800] text-[#E8A800]'
                    : 'bg-black/30 border-white/10 text-[#D4CCBB] hover:border-white/20'
                }`}
              >
                <div className="font-bold mb-1 text-sm sm:text-base">Update</div>
                <div className="text-xs">Update existing season data</div>
              </button>
              <button
                type="button"
                onClick={() => setMode('bulk')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  mode === 'bulk'
                    ? 'bg-[#E8A800]/20 border-[#E8A800] text-[#E8A800]'
                    : 'bg-black/30 border-white/10 text-[#D4CCBB] hover:border-white/20'
                }`}
              >
                <div className="font-bold mb-1 text-sm sm:text-base">Bulk</div>
                <div className="text-xs">Import everything without preview</div>
              </button>
            </div>
          </div>



          {/* File Upload */}
          <div className="mb-4 sm:mb-6">
            <label className="block text-sm font-bold text-white mb-3">Database File (.db)</label>
            <input
              type="file"
              accept=".db"
              onChange={handleFileChange}
              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#E8A800] file:text-[#0a0a0a] file:font-bold file:cursor-pointer hover:file:bg-[#FFC93A] transition-all text-white text-sm"
            />
            {file && (
              <div className="mt-2 text-xs sm:text-sm text-emerald-400 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </div>
            )}
          </div>

          {error && (
            <div className="mb-4 sm:mb-6 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handlePreview}
            disabled={!file || isLoading}
            className="w-full bg-gradient-to-r from-[#E8A800] to-[#FFB347] hover:from-[#FFC93A] hover:to-[#FFB347] disabled:from-gray-700 disabled:to-gray-800 disabled:cursor-not-allowed text-[#0a0a0a] px-6 py-3 rounded-xl font-bold transition-all text-sm sm:text-base"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {mode === 'bulk' ? 'Importing...' : 'Analyzing...'}
              </span>
            ) : mode === 'bulk' ? 'Start Bulk Import' : 'Preview Import'}
          </button>
        </div>
      )}

      {step === 'preview' && activePreview && (
        <PlayerPreviewList
          preview={activePreview}
          selectedPlayers={selectedPlayers}
          duplicateResolutions={duplicateResolutions}
          tabIgnoredFields={tabIgnoredFields}
          onToggleTabIgnoredField={(tab, fieldId) => {
            setTabIgnoredFields(prev => {
              const current = prev[tab] || []
              const updated = current.includes(fieldId)
                ? current.filter(f => f !== fieldId)
                : [...current, fieldId]
              return { ...prev, [tab]: updated }
            })
          }}
          onTogglePlayer={togglePlayer}
          onToggleAll={toggleAll}
          onTogglePage={togglePage}
          onResolveDuplicate={(playerId, resolution) => {
            setDuplicateResolutions({ ...duplicateResolutions, [playerId]: resolution })
          }}
          onBatchResolveDuplicates={batchResolveDuplicates}
          onNext={() => setStep('confirm')}
          onBack={() => setStep('upload')}
        />
      )}

      {step === 'confirm' && activePreview && (
        <ImportSummary
          preview={activePreview}
          selectedCount={selectedPlayers.size}
          onConfirm={handleConfirm}
          onBack={() => setStep('preview')}
          isLoading={isLoading}
          error={error}
        />
      )}

      {step === 'progress' && (
        <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-6 sm:p-8">
          <h2 className="text-2xl font-black text-white mb-6">
            {isLoading ? 'Importing Players...' : 'Import Complete'}
          </h2>
          
          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Overall Progress</span>
              <span className="text-sm font-bold text-white">
                {progress.processed} / {progress.total}
              </span>
            </div>
            <div className="w-full h-4 bg-black/50 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300"
                style={{ 
                  width: `${progress.total > 0 ? (progress.processed / progress.total) * 100 : 0}%` 
                }}
              />
            </div>
            <div className="text-xs text-gray-500 mt-1 text-center">
              {progress.total > 0 ? Math.round((progress.processed / progress.total) * 100) : 0}% complete
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-center">
              <div className="text-3xl font-black text-emerald-400">{progress.imported}</div>
              <div className="text-xs text-gray-400">Imported</div>
            </div>
            <div className="rounded-xl bg-orange-500/10 border border-orange-500/20 p-4 text-center">
              <div className="text-3xl font-black text-orange-400">{progress.updated}</div>
              <div className="text-xs text-gray-400">Updated</div>
            </div>
            <div className="rounded-xl bg-gray-500/10 border border-gray-500/20 p-4 text-center">
              <div className="text-3xl font-black text-gray-400">{progress.skipped}</div>
              <div className="text-xs text-gray-400">Skipped</div>
            </div>
          </div>

          {/* Current Player */}
          {progress.currentPlayer && (
            <div className="mb-6 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <div className="text-sm text-blue-400 mb-1">Currently processing:</div>
              <div className="font-bold text-white">{progress.currentPlayer}</div>
            </div>
          )}

          {/* Errors */}
          {progress.errors.length > 0 && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="font-bold text-red-400">Errors ({progress.errors.length})</h3>
              </div>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {progress.errors.map((err, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-black/30 border border-red-500/20">
                    <div className="font-bold text-white text-sm mb-1">{err.player}</div>
                    <div className="text-xs text-red-300">{err.error}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Player Lists - Show only recent players */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Imported Players */}
            {progress.importedPlayers.length > 0 && (
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <h3 className="font-bold text-emerald-400">Imported Players ({progress.importedPlayers.length})</h3>
                </div>
                <div className="max-h-60 overflow-y-auto space-y-1">
                  {progress.importedPlayers.slice(-50).map((player, idx) => (
                    <div key={idx} className="p-2 rounded bg-black/30 text-white text-sm">
                      {player}
                    </div>
                  ))}
                  {progress.importedPlayers.length > 50 && (
                    <div className="text-xs text-gray-500 text-center py-2">
                      Showing last 50 of {progress.importedPlayers.length} players
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Updated Players */}
            {progress.updatedPlayers.length > 0 && (
              <div className="rounded-xl bg-orange-500/10 border border-orange-500/20 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-5 h-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <h3 className="font-bold text-orange-400">Updated Players ({progress.updatedPlayers.length})</h3>
                </div>
                <div className="max-h-60 overflow-y-auto space-y-1">
                  {progress.updatedPlayers.slice(-50).map((player, idx) => (
                    <div key={idx} className="p-2 rounded bg-black/30 text-white text-sm">
                      {player}
                    </div>
                  ))}
                  {progress.updatedPlayers.length > 50 && (
                    <div className="text-xs text-gray-500 text-center py-2">
                      Showing last 50 of {progress.updatedPlayers.length} players
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Loading Spinner */}
          {isLoading && (
            <div className="flex items-center justify-center gap-3 mt-6">
              <svg className="animate-spin h-6 w-6 text-[#E8A800]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-gray-400">Processing players...</span>
            </div>
          )}
        </div>
      )}

      {step === 'complete' && result && (
        <div className="rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 p-6 sm:p-8 text-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 mx-auto mb-4 sm:mb-6">
            <svg className="w-8 h-8 sm:w-10 sm:h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white mb-4 sm:mb-6">Import Complete!</h2>
          <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
            <div className="rounded-xl bg-black/30 p-3 sm:p-4">
              <div className="text-2xl sm:text-3xl font-black text-emerald-400">{result.imported}</div>
              <div className="text-xs sm:text-sm text-[#7A7367]">Imported</div>
            </div>
            <div className="rounded-xl bg-black/30 p-3 sm:p-4">
              <div className="text-2xl sm:text-3xl font-black text-[#E8A800]">{result.updated}</div>
              <div className="text-xs sm:text-sm text-[#7A7367]">Updated</div>
            </div>
            <div className="rounded-xl bg-black/30 p-3 sm:p-4">
              <div className="text-2xl sm:text-3xl font-black text-[#D4CCBB]">{result.skipped}</div>
              <div className="text-xs sm:text-sm text-[#7A7367]">Skipped</div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-6">
            <button
              onClick={() => router.push(`/sub-admin/${seasonId}/all-players`)}
              className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white px-6 sm:px-8 py-3 rounded-xl font-bold transition-all text-sm sm:text-base"
            >
              View Players
            </button>
            {importSessionId && (
              isStagingCleared ? (
                <div className="text-xs font-mono font-bold text-gray-500 uppercase tracking-wider py-3">
                  ✓ Temporary staging database cleared
                </div>
              ) : (
                <button
                  type="button"
                  disabled={isClearingStaging}
                  onClick={handleClearStaging}
                  className="w-full sm:w-auto bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 text-red-400 px-6 sm:px-8 py-3 rounded-xl font-bold transition-all text-sm sm:text-base flex items-center justify-center gap-2"
                >
                  {isClearingStaging ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-red-400" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Clearing Staging...
                    </>
                  ) : (
                    'Delete Temporary Staging Table'
                  )}
                </button>
              )
            )}
          </div>
        </div>
      )}
    </div>
  )
}
