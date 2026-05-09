'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { EFootballPlayer } from '@/lib/sqlite-parser'
import { PreviewResponse } from '@/app/api/import/preview/route'
import PlayerPreviewList from './PlayerPreviewList'
import ImportSummary from './ImportSummary'

interface ImportWizardProps {
  seasonId: string
}

type Step = 'upload' | 'preview' | 'confirm' | 'progress' | 'complete'

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
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<PreviewResponse | null>(null)
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set())
  const [duplicateResolutions, setDuplicateResolutions] = useState<Record<string, 'skip' | 'replace' | 'add' | string>>({})
  const [isLoading, setIsLoading] = useState(false)
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

      // Compress the data before sending
      const jsonString = JSON.stringify({
        players: parseResult.players,
        seasonId,
        mode
      })
      
      console.log(`JSON size: ${(jsonString.length / 1024 / 1024).toFixed(2)} MB`)
      
      // Use gzip compression
      const encoder = new TextEncoder()
      const encodedData = encoder.encode(jsonString)
      
      // Create a compressed stream
      const compressionStream = new CompressionStream('gzip')
      const writer = compressionStream.writable.getWriter()
      writer.write(encodedData)
      writer.close()
      
      const compressedData = await new Response(compressionStream.readable).blob()
      console.log(`Compressed size: ${(compressedData.size / 1024 / 1024).toFixed(2)} MB`)

      // Send compressed data to server
      const response = await fetch('/api/import/preview-parsed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Encoding': 'gzip',
        },
        body: compressedData
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

      const previewData: PreviewResponse = await response.json()
      setPreview(previewData)
      
      // Auto-select all new and changed players
      const autoSelected = new Set<string>()
      previewData.newPlayers.forEach(p => autoSelected.add(p.playerId))
      previewData.changedPlayers.forEach(p => autoSelected.add(p.playerId))
      setSelectedPlayers(autoSelected)
      
      // Initialize duplicate resolutions
      const resolutions: Record<string, 'skip' | 'replace' | 'add' | string> = {}
      previewData.duplicates.forEach(d => {
        if (d.duplicateType === 'file-vs-file' && d.allFileInstances) {
          // For file-vs-file, default to first instance
          resolutions[d.playerId] = d.allFileInstances[0].playerId
        } else {
          // For file-vs-db, default to skip
          resolutions[d.playerId] = 'skip'
        }
      })
      setDuplicateResolutions(resolutions)
      
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

      console.log(`Starting import of ${selected.length} players`)

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

      // Use EventSource for real-time updates
      const response = await fetch('/api/import/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seasonId,
          mode,
          selectedPlayers: selected,
          duplicateResolutions
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Import stream failed:', errorText)
        throw new Error(`Failed to start import: ${response.status} ${errorText}`)
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
          console.log('Stream completed')
          break
        }

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        
        // Keep the last incomplete line in the buffer
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))

              if (data.type === 'progress') {
                setProgress({
                  total: data.total,
                  processed: data.processed,
                  imported: data.imported,
                  updated: data.updated,
                  skipped: data.skipped,
                  errors: data.errors,
                  currentPlayer: data.currentPlayer,
                  importedPlayers: data.importedPlayers || [],
                  updatedPlayers: data.updatedPlayers || []
                })
              } else if (data.type === 'current') {
                setProgress(prev => ({
                  ...prev,
                  currentPlayer: data.currentPlayer
                }))
              } else if (data.type === 'complete') {
                console.log('Import complete:', data)
                setResult({
                  success: true,
                  imported: data.imported,
                  updated: data.updated,
                  skipped: data.skipped,
                  total: data.total,
                  errors: data.errors
                })
                setProgress({
                  total: data.total,
                  processed: data.total,
                  imported: data.imported,
                  updated: data.updated,
                  skipped: data.skipped,
                  errors: data.errors,
                  importedPlayers: data.importedPlayers || [],
                  updatedPlayers: data.updatedPlayers || []
                })
                setStep('complete')
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
    } catch (err) {
      console.error('Import error:', err)
      setError(err instanceof Error ? err.message : 'Failed to import players')
      setStep('confirm') // Go back to confirm step on error
    } finally {
      setIsLoading(false)
    }
  }

  const togglePlayer = (playerId: string) => {
    const newSelected = new Set(selectedPlayers)
    if (newSelected.has(playerId)) {
      newSelected.delete(playerId)
    } else {
      newSelected.add(playerId)
    }
    setSelectedPlayers(newSelected)
  }

  const toggleAll = () => {
    if (!preview) return
    
    if (selectedPlayers.size === preview.players.length) {
      setSelectedPlayers(new Set())
    } else {
      setSelectedPlayers(new Set(preview.players.map(p => p.playerId)))
    }
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
          <h2 className="text-xl sm:text-2xl font-black text-white mb-4 sm:mb-6">Upload Database</h2>
          
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

      {step === 'preview' && preview && (
        <PlayerPreviewList
          preview={preview}
          selectedPlayers={selectedPlayers}
          duplicateResolutions={duplicateResolutions}
          onTogglePlayer={togglePlayer}
          onToggleAll={toggleAll}
          onResolveDuplicate={(playerId, resolution) => {
            setDuplicateResolutions({ ...duplicateResolutions, [playerId]: resolution })
          }}
          onBatchResolveDuplicates={batchResolveDuplicates}
          onNext={() => setStep('confirm')}
          onBack={() => setStep('upload')}
        />
      )}

      {step === 'confirm' && preview && (
        <ImportSummary
          preview={preview}
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
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-center">
              <div className="text-3xl font-black text-emerald-400">{progress.imported}</div>
              <div className="text-xs text-gray-400">Imported</div>
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
          <div className="mb-6">
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
          <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8">
            <div className="rounded-xl bg-black/30 p-3 sm:p-4">
              <div className="text-2xl sm:text-3xl font-black text-emerald-400">{result.imported}</div>
              <div className="text-xs sm:text-sm text-[#7A7367]">Imported</div>
            </div>
            <div className="rounded-xl bg-black/30 p-3 sm:p-4">
              <div className="text-2xl sm:text-3xl font-black text-[#D4CCBB]">{result.skipped}</div>
              <div className="text-xs sm:text-sm text-[#7A7367]">Skipped</div>
            </div>
          </div>
          <button
            onClick={() => router.push(`/sub-admin/${seasonId}/all-players`)}
            className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white px-6 sm:px-8 py-3 rounded-xl font-bold transition-all text-sm sm:text-base"
          >
            View Players
          </button>
        </div>
      )}
    </div>
  )
}
