'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import PositionGroupBadge from '@/components/player/PositionGroupBadge'

interface Player {
  id: string
  name: string
  photoUrl: string
  position: string
  realWorldClub: string
  overallRating: number
  team: { id: string; name: string; logoUrl: string } | null
  soldPrice: number | null
  status: 'SOLD' | 'AVAILABLE'
  position_group?: string | null
}

interface AllPlayersClientProps {
  seasonId: string
  positions: string[]
  teams: string[]
  enableStarring?: boolean  // Enable star functionality for team users
  basePath?: string         // Base path for player links
}

// ── Icons ──────────────────────────────────────────────────────────────────────
const SearchIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
)

const SpinnerIcon = () => (
  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
  </svg>
)

const ChevronLeftIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
)

const ChevronRightIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
)

// ── Custom Select Component for Filters ──────────────────────────────────────
function CustomSelect({ 
  label, 
  value, 
  options, 
  onChange, 
  displayValue 
}: {
  label: string
  value: string
  options: string[]
  onChange: (val: string) => void
  displayValue?: (val: string) => string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={containerRef}>
      <label className="block text-xs sm:text-sm font-bold text-[#F5F0E8] mb-2">{label}</label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl bg-black/50 border border-white/10 text-white focus:border-[#E8A800] focus:outline-none focus:ring-2 focus:ring-[#E8A800]/20 transition-all text-sm sm:text-base text-left"
      >
        <span className="truncate">
          {displayValue ? displayValue(value) : value}
        </span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-20 mt-2 w-full max-h-60 overflow-y-auto rounded-xl bg-[#121212]/95 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgb(0,0,0,0.5)] py-1 focus:outline-none scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          {options.map((option) => {
            const isSeparator = option.includes('───')
            const isSelected = option === value
            
            if (isSeparator) {
              return (
                <div
                  key={option}
                  className="px-4 py-2 text-xs font-black text-gray-500 bg-white/5 select-none"
                >
                  {option}
                </div>
              )
            }

            return (
              <button
                key={option}
                type="button"
                onClick={() => {
                  onChange(option)
                  setIsOpen(false)
                }}
                className={`w-full flex items-center justify-between px-4 py-2 text-left text-sm transition-colors hover:bg-[#E8A800]/10 hover:text-[#E8A800] ${
                  isSelected ? 'text-[#E8A800] bg-[#E8A800]/5 font-bold' : 'text-gray-300'
                }`}
              >
                <span className="truncate">{displayValue ? displayValue(option) : option}</span>
                {isSelected && (
                  <svg className="w-4 h-4 text-[#E8A800] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function AllPlayersClient({ seasonId, positions, teams, enableStarring = false, basePath }: AllPlayersClientProps) {
  const pathname = usePathname()
  const router = useRouter()

  // Starring state
  const [starredPlayerIds, setStarredPlayerIds] = useState<Set<string>>(new Set())
  const [starringInProgress, setStarringInProgress] = useState<Set<string>>(new Set())

  // Position groups mapping
  const POSITION_GROUPS = {
    'Goalkeepers': ['GK'],
    'Defenders': ['CB', 'LB', 'RB'],
    'Midfielders': ['DMF', 'CMF', 'LMF', 'RMF', 'AMF'],
    'Forwards': ['SS', 'LWF', 'RWF', 'CF']
  }

  // Create enhanced position list with groups
  const enhancedPositions = [
    'ALL',
    '─── Position Groups ───',
    ...Object.keys(POSITION_GROUPS),
    '─── Individual Positions ───',
    ...positions.filter(p => p !== 'ALL').sort()
  ]

  // Read initial values from URL so direct links / back-nav work
  const getParam = (key: string, fallback: string) => {
    if (typeof window === 'undefined') return fallback
    return new URLSearchParams(window.location.search).get(key) || fallback
  }

  const [searchQuery, setSearchQuery] = useState(() => getParam('search', ''))
  const [positionFilter, setPositionFilter] = useState(() => getParam('position', 'ALL'))
  const [teamFilter, setTeamFilter] = useState(() => getParam('team', 'ALL'))
  const [groupFilter, setGroupFilter] = useState(() => getParam('group', 'ALL'))
  const [starredFilter, setStarredFilter] = useState(() => getParam('starred', 'all'))
  const [currentPage, setCurrentPage] = useState(() => parseInt(getParam('page', '1'), 10))

  const [players, setPlayers] = useState<Player[]>([])
  const [totalPlayers, setTotalPlayers] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const abortRef = useRef<AbortController | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isFirstRender = useRef(true)

  // Export to Excel states
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportFilter, setExportFilter] = useState<'all' | 'sold' | 'unsold'>('all')
  const [exportMode, setExportMode] = useState<'single' | 'multiple'>('single')
  const [exportLoading, setExportLoading] = useState(false)

  const handleExportMultipleFiles = async () => {
    console.log('🔵 [EXPORT-MULTI] Starting multiple files export...')
    setExportLoading(true)
    
    try {
      const apiUrl = `/api/admin/seasons/${seasonId}/players/export?is_sold=${exportFilter}`
      console.log('🔵 [EXPORT-MULTI] Fetching from API:', apiUrl)
      
      const response = await fetch(apiUrl)
      if (!response.ok) {
        throw new Error('Failed to fetch player database')
      }
      
      const data = await response.json()
      const rawPlayers = data.players || []
      console.log('🔵 [EXPORT-MULTI] Raw players count:', rawPlayers.length)

      if (rawPlayers.length === 0) {
        alert('No players found to export.')
        setExportLoading(false)
        return
      }

      // Dynamic import of exceljs and jszip
      const ExcelJS = (await import('exceljs')).default
      const JSZip = (await import('jszip')).default
      console.log('🔵 [EXPORT-MULTI] Libraries imported')

      // Group players by position-group combination
      const positionGroupMap = new Map<string, any[]>()
      rawPlayers.forEach((p: any) => {
        const pos = p.position || 'N/A'
        const group = p.position_group || 'ALL'
        const combinedKey = group === 'ALL' ? pos : `${pos}-${group}`
        
        if (!positionGroupMap.has(combinedKey)) {
          positionGroupMap.set(combinedKey, [])
        }
        positionGroupMap.get(combinedKey)!.push(p)
      })

      console.log('🔵 [EXPORT-MULTI] Position-Group combinations:', Array.from(positionGroupMap.keys()))

      // Columns configuration
      const columns = [
        { header: 'Player ID', key: 'id', width: 25 },
        { header: 'Name', key: 'name', width: 30 },
        { header: 'Position', key: 'position', width: 12 },
        { header: 'Position Group', key: 'position_group', width: 15 },
        { header: 'Overall Rating', key: 'overallRating', width: 15 },
        { header: 'Age', key: 'age', width: 10 },
        { header: 'Nationality', key: 'nationality', width: 18 },
        { header: 'Club', key: 'realWorldClub', width: 25 },
        { header: 'Current Team Name', key: 'teamName', width: 25 },
        { header: 'Auction Eligible', key: 'eligible', width: 18 },
        { header: 'Is Sold', key: 'isSoldText', width: 12 },
        { header: 'Acquisition Value', key: 'soldPrice', width: 18 },
        { header: 'Playing Style', key: 'playing_style', width: 20 },
        { header: 'Ball Control', key: 'ball_control', width: 14 },
        { header: 'Dribbling', key: 'dribbling', width: 12 },
        { header: 'Tight Possession', key: 'tight_possession', width: 16 },
        { header: 'Low Pass', key: 'low_pass', width: 12 },
        { header: 'Lofted Pass', key: 'lofted_pass', width: 12 },
        { header: 'Finishing', key: 'finishing', width: 12 },
        { header: 'Heading', key: 'heading', width: 12 },
        { header: 'Set Piece Taking', key: 'set_piece_taking', width: 16 },
        { header: 'Curl', key: 'curl', width: 10 },
        { header: 'Offensive Awareness', key: 'offensive_awareness', width: 18 },
        { header: 'Speed', key: 'speed', width: 10 },
        { header: 'Acceleration', key: 'acceleration', width: 14 },
        { header: 'Kicking Power', key: 'kicking_power', width: 14 },
        { header: 'Jumping', key: 'jumping', width: 10 },
        { header: 'Physical Contact', key: 'physical_contact', width: 16 },
        { header: 'Balance', key: 'balance', width: 10 },
        { header: 'Stamina', key: 'stamina', width: 10 },
        { header: 'Tackling', key: 'tackling', width: 12 },
        { header: 'Aggression', key: 'aggression', width: 12 },
        { header: 'Defensive Engagement', key: 'defensive_engagement', width: 20 },
        { header: 'Defensive Awareness', key: 'defensive_awareness', width: 18 },
        { header: 'GK Awareness', key: 'gk_awareness', width: 14 },
        { header: 'GK Catching', key: 'gk_catching', width: 14 },
        { header: 'GK Parrying', key: 'gk_parrying', width: 14 },
        { header: 'GK Reflexes', key: 'gk_reflexes', width: 14 },
        { header: 'GK Reach', key: 'gk_reach', width: 14 }
      ]

      const styleWorksheet = (ws: any) => {
        const headerRow = ws.getRow(1)
        headerRow.height = 25
        headerRow.eachCell((cell: any) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0066FF' } }
          cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } }
          cell.alignment = { horizontal: 'center', vertical: 'middle' }
          cell.border = { bottom: { style: 'medium', color: { argb: 'FF0044BB' } } }
        })

        const rCount = ws.rowCount
        for (let i = 2; i <= rCount; i++) {
          const row = ws.getRow(i)
          row.height = 20
          const isEven = i % 2 === 0
          const bgFill = isEven ? 'FFF8F9FA' : 'FFFFFFFF'

          row.eachCell((cell: any, colNumber: number) => {
            cell.font = { name: 'Segoe UI', size: 9, color: { argb: 'FF333333' } }
            cell.border = {
              bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
              right: { style: 'thin', color: { argb: 'FFF0F0F0' } }
            }
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgFill } }

            const colKey = ws.columns[colNumber - 1]?.key
            if (['id', 'name', 'nationality', 'realWorldClub', 'teamName', 'playing_style'].includes(colKey)) {
              cell.alignment = { horizontal: 'left', vertical: 'middle' }
            } else {
              cell.alignment = { horizontal: 'center', vertical: 'middle' }
            }

            if (colKey === 'eligible') {
              const val = cell.value
              if (val === 'Yes') {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4EDDA' } }
                cell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF155724' } }
              } else if (val === 'No') {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8D7DA' } }
                cell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF721C24' } }
              }
            }
          })
        }
      }

      // Create a ZIP file to hold all Excel files
      const zip = new JSZip()
      let fileCount = 0

      // Create one Excel file per position-group combination
      for (const [combinedKey, players] of positionGroupMap.entries()) {
        console.log(`🔵 [EXPORT-MULTI] Creating file for ${combinedKey} (${players.length} players)`)
        
        const workbook = new ExcelJS.Workbook()
        workbook.creator = 'Turf Cats'
        workbook.created = new Date()

        const sheet = workbook.addWorksheet(combinedKey)
        sheet.columns = columns
        
        players.forEach((p: any) => {
          sheet.addRow({
            ...p,
            eligible: !p.isSold ? 'Yes' : 'No',
            isSoldText: p.isSold ? 'Yes' : 'No',
            soldPrice: p.soldPrice || 0
          })
        })
        
        styleWorksheet(sheet)

        const buffer = await workbook.xlsx.writeBuffer()
        zip.file(`${combinedKey}.xlsx`, buffer)
        fileCount++
      }

      console.log(`🔵 [EXPORT-MULTI] Created ${fileCount} Excel files, generating ZIP...`)

      // Generate ZIP and trigger download
      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const url = window.URL.createObjectURL(zipBlob)
      const a = document.createElement('a')
      a.href = url
      const filename = `TurfCats-Players-ByPosition-${new Date().toISOString().split('T')[0]}.zip`
      a.download = filename
      console.log('🔵 [EXPORT-MULTI] Triggering ZIP download:', filename)
      a.click()
      window.URL.revokeObjectURL(url)

      setShowExportModal(false)
      console.log('✅ [EXPORT-MULTI] Multiple files export completed successfully!')
    } catch (err: any) {
      console.error('🔴 [EXPORT-MULTI] Error:', err)
      alert('Failed to export multiple files: ' + err.message)
    } finally {
      setExportLoading(false)
    }
  }

  const handleExportToExcel = async () => {
    console.log('🔵 [EXPORT] Starting export process...')
    console.log('🔵 [EXPORT] Season ID:', seasonId)
    console.log('🔵 [EXPORT] Export Filter:', exportFilter)
    console.log('🔵 [EXPORT] Export Mode:', exportMode)
    
    if (exportMode === 'multiple') {
      await handleExportMultipleFiles()
      return
    }
    
    setExportLoading(true)
    try {
      const apiUrl = `/api/admin/seasons/${seasonId}/players/export?is_sold=${exportFilter}`
      console.log('🔵 [EXPORT] Fetching from API:', apiUrl)
      
      const response = await fetch(apiUrl)
      console.log('🔵 [EXPORT] Response status:', response.status)
      console.log('🔵 [EXPORT] Response OK:', response.ok)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('🔴 [EXPORT] API Error Response:', errorText)
        throw new Error('Failed to fetch player database')
      }
      
      const data = await response.json()
      console.log('🔵 [EXPORT] Data received:', {
        playersCount: data.players?.length || 0,
        hasPlayers: !!data.players,
        dataKeys: Object.keys(data)
      })
      
      const rawPlayers = data.players || []
      console.log('🔵 [EXPORT] Raw players count:', rawPlayers.length)

      if (rawPlayers.length === 0) {
        console.warn('⚠️ [EXPORT] No players found to export')
        alert('No players found to export.')
        setExportLoading(false)
        return
      }

      console.log('🔵 [EXPORT] Sample player data:', rawPlayers[0])
      console.log('🔵 [EXPORT] Importing ExcelJS...')
      
      // Dynamic import of exceljs
      const ExcelJS = (await import('exceljs')).default
      console.log('🔵 [EXPORT] ExcelJS imported successfully')
      
      const workbook = new ExcelJS.Workbook()
      console.log('🔵 [EXPORT] Workbook created')
      
      workbook.creator = 'Turf Cats'
      workbook.lastModifiedBy = 'Admin'
      workbook.created = new Date()
      workbook.modified = new Date()

      // Calculate totals
      const totalCount = rawPlayers.length
      const soldCount = rawPlayers.filter((p: any) => p.isSold).length
      const availableCount = totalCount - soldCount
      const eligibleCount = rawPlayers.filter((p: any) => !p.isSold).length // Unsold players
      
      console.log('🔵 [EXPORT] Stats calculated:', {
        totalCount,
        soldCount,
        availableCount,
        eligibleCount
      })

      // Calculate position and group stats
      const positionGroupStats: Record<string, { total: number, sold: number, available: number }> = {}
      const positionStats: Record<string, { total: number, sold: number, available: number }> = {}

      rawPlayers.forEach((p: any) => {
        const group = p.position_group || 'Unassigned'
        const pos = p.position || 'N/A'
        const isSold = p.isSold

        if (!positionGroupStats[group]) {
          positionGroupStats[group] = { total: 0, sold: 0, available: 0 }
        }
        positionGroupStats[group].total++
        if (isSold) positionGroupStats[group].sold++
        else positionGroupStats[group].available++

        if (!positionStats[pos]) {
          positionStats[pos] = { total: 0, sold: 0, available: 0 }
        }
        positionStats[pos].total++
        if (isSold) positionStats[pos].sold++
        else positionStats[pos].available++
      })

      // 1. Create Summary Sheet
      const summarySheet = workbook.addWorksheet('Summary')
      
      summarySheet.mergeCells('A1:D1')
      summarySheet.getCell('A1').value = 'Turf Cats Players Database Summary'
      summarySheet.getCell('A1').font = { name: 'Segoe UI', size: 16, bold: true, color: { argb: 'FF0066FF' } }
      summarySheet.getCell('A1').alignment = { horizontal: 'left', vertical: 'middle' }
      summarySheet.getRow(1).height = 40

      summarySheet.getCell('A3').value = 'Metric'
      summarySheet.getCell('B3').value = 'Count'
      summarySheet.getRow(3).font = { name: 'Segoe UI', size: 11, bold: true }
      summarySheet.getRow(3).height = 25

      const metrics = [
        { name: 'Total Players', value: totalCount },
        { name: 'Auction Eligible Players', value: eligibleCount },
        { name: 'Sold Players', value: soldCount },
        { name: 'Available / Unsold Players', value: availableCount }
      ]

      metrics.forEach((m, idx) => {
        const rowNum = 4 + idx
        summarySheet.getCell(`A${rowNum}`).value = m.name
        summarySheet.getCell(`B${rowNum}`).value = m.value
        summarySheet.getCell(`A${rowNum}`).font = { name: 'Segoe UI', size: 10, bold: true }
        summarySheet.getCell(`B${rowNum}`).font = { name: 'Segoe UI', size: 10, color: { argb: 'FF0066FF' } }
        summarySheet.getCell(`B${rowNum}`).alignment = { horizontal: 'center' }
        summarySheet.getCell(`A${rowNum}`).border = { bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } } }
        summarySheet.getCell(`B${rowNum}`).border = { bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } } }
      })

      summarySheet.getCell('A10').value = 'Position Group Breakdown'
      summarySheet.getCell('A10').font = { name: 'Segoe UI', size: 12, bold: true, color: { argb: 'FF333333' } }
      summarySheet.getCell('A11').value = 'Position Group'
      summarySheet.getCell('B11').value = 'Total Players'
      summarySheet.getCell('C11').value = 'Sold Players'
      summarySheet.getCell('D11').value = 'Available Players'
      summarySheet.getRow(11).font = { name: 'Segoe UI', size: 10, bold: true }
      summarySheet.getRow(11).height = 25

      let currentRow = 12
      Object.entries(positionGroupStats).forEach(([group, stats]) => {
        summarySheet.getCell(`A${currentRow}`).value = group
        summarySheet.getCell(`B${currentRow}`).value = stats.total
        summarySheet.getCell(`C${currentRow}`).value = stats.sold
        summarySheet.getCell(`D${currentRow}`).value = stats.available
        summarySheet.getRow(currentRow).font = { name: 'Segoe UI', size: 9 }
        summarySheet.getCell(`A${currentRow}`).alignment = { horizontal: 'left' }
        summarySheet.getCell(`B${currentRow}`).alignment = { horizontal: 'center' }
        summarySheet.getCell(`C${currentRow}`).alignment = { horizontal: 'center' }
        summarySheet.getCell(`D${currentRow}`).alignment = { horizontal: 'center' }
        currentRow++
      })

      currentRow += 2
      summarySheet.getCell(`A${currentRow}`).value = 'Individual Position Breakdown'
      summarySheet.getCell(`A${currentRow}`).font = { name: 'Segoe UI', size: 12, bold: true, color: { argb: 'FF333333' } }
      currentRow++
      summarySheet.getCell(`A${currentRow}`).value = 'Position'
      summarySheet.getCell(`B${currentRow}`).value = 'Total Players'
      summarySheet.getCell(`C${currentRow}`).value = 'Sold Players'
      summarySheet.getCell(`D${currentRow}`).value = 'Available Players'
      summarySheet.getRow(currentRow).font = { name: 'Segoe UI', size: 10, bold: true }
      summarySheet.getRow(currentRow).height = 25
      currentRow++

      Object.entries(positionStats).forEach(([pos, stats]) => {
        summarySheet.getCell(`A${currentRow}`).value = pos
        summarySheet.getCell(`B${currentRow}`).value = stats.total
        summarySheet.getCell(`C${currentRow}`).value = stats.sold
        summarySheet.getCell(`D${currentRow}`).value = stats.available
        summarySheet.getRow(currentRow).font = { name: 'Segoe UI', size: 9 }
        summarySheet.getCell(`A${currentRow}`).alignment = { horizontal: 'left' }
        summarySheet.getCell(`B${currentRow}`).alignment = { horizontal: 'center' }
        summarySheet.getCell(`C${currentRow}`).alignment = { horizontal: 'center' }
        summarySheet.getCell(`D${currentRow}`).alignment = { horizontal: 'center' }
        currentRow++
      })

      summarySheet.getColumn('A').width = 30
      summarySheet.getColumn('B').width = 15
      summarySheet.getColumn('C').width = 15
      summarySheet.getColumn('D').width = 18

      // Columns configuration
      const columns = [
        { header: 'Player ID', key: 'id', width: 25 },
        { header: 'Name', key: 'name', width: 30 },
        { header: 'Position', key: 'position', width: 12 },
        { header: 'Position Group', key: 'position_group', width: 15 },
        { header: 'Overall Rating', key: 'overallRating', width: 15 },
        { header: 'Age', key: 'age', width: 10 },
        { header: 'Nationality', key: 'nationality', width: 18 },
        { header: 'Club', key: 'realWorldClub', width: 25 },
        { header: 'Current Team Name', key: 'teamName', width: 25 },
        { header: 'Auction Eligible', key: 'eligible', width: 18 },
        { header: 'Is Sold', key: 'isSoldText', width: 12 },
        { header: 'Acquisition Value', key: 'soldPrice', width: 18 },
        { header: 'Playing Style', key: 'playing_style', width: 20 },
        
        { header: 'Ball Control', key: 'ball_control', width: 14 },
        { header: 'Dribbling', key: 'dribbling', width: 12 },
        { header: 'Tight Possession', key: 'tight_possession', width: 16 },
        { header: 'Low Pass', key: 'low_pass', width: 12 },
        { header: 'Lofted Pass', key: 'lofted_pass', width: 12 },
        { header: 'Finishing', key: 'finishing', width: 12 },
        { header: 'Heading', key: 'heading', width: 12 },
        { header: 'Set Piece Taking', key: 'set_piece_taking', width: 16 },
        { header: 'Curl', key: 'curl', width: 10 },
        { header: 'Offensive Awareness', key: 'offensive_awareness', width: 18 },
        
        { header: 'Speed', key: 'speed', width: 10 },
        { header: 'Acceleration', key: 'acceleration', width: 14 },
        { header: 'Kicking Power', key: 'kicking_power', width: 14 },
        { header: 'Jumping', key: 'jumping', width: 10 },
        { header: 'Physical Contact', key: 'physical_contact', width: 16 },
        { header: 'Balance', key: 'balance', width: 10 },
        { header: 'Stamina', key: 'stamina', width: 10 },

        { header: 'Tackling', key: 'tackling', width: 12 },
        { header: 'Aggression', key: 'aggression', width: 12 },
        { header: 'Defensive Engagement', key: 'defensive_engagement', width: 20 },
        { header: 'Defensive Awareness', key: 'defensive_awareness', width: 18 },

        { header: 'GK Awareness', key: 'gk_awareness', width: 14 },
        { header: 'GK Catching', key: 'gk_catching', width: 14 },
        { header: 'GK Parrying', key: 'gk_parrying', width: 14 },
        { header: 'GK Reflexes', key: 'gk_reflexes', width: 14 },
        { header: 'GK Reach', key: 'gk_reach', width: 14 }
      ]

      const styleWorksheet = (ws: any) => {
        const headerRow = ws.getRow(1)
        headerRow.height = 25
        headerRow.eachCell((cell: any) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF0066FF' }
          }
          cell.font = {
            name: 'Segoe UI',
            size: 10,
            bold: true,
            color: { argb: 'FFFFFFFF' }
          }
          cell.alignment = {
            horizontal: 'center',
            vertical: 'middle'
          }
          cell.border = {
            bottom: { style: 'medium', color: { argb: 'FF0044BB' } }
          }
        })

        const rCount = ws.rowCount
        for (let i = 2; i <= rCount; i++) {
          const row = ws.getRow(i)
          row.height = 20
          const isEven = i % 2 === 0
          const bgFill = isEven ? 'FFF8F9FA' : 'FFFFFFFF'

          row.eachCell((cell: any, colNumber: number) => {
            cell.font = {
              name: 'Segoe UI',
              size: 9,
              color: { argb: 'FF333333' }
            }
            cell.border = {
              bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
              right: { style: 'thin', color: { argb: 'FFF0F0F0' } }
            }
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: bgFill }
            }

            const colKey = ws.columns[colNumber - 1]?.key
            if (['id', 'name', 'nationality', 'realWorldClub', 'teamName', 'playing_style'].includes(colKey)) {
              cell.alignment = { horizontal: 'left', vertical: 'middle' }
            } else {
              cell.alignment = { horizontal: 'center', vertical: 'middle' }
            }

            if (colKey === 'eligible') {
              const val = cell.value
              if (val === 'Yes') {
                cell.fill = {
                  type: 'pattern',
                  pattern: 'solid',
                  fgColor: { argb: 'FFD4EDDA' }
                }
                cell.font = {
                  name: 'Segoe UI',
                  size: 9,
                  bold: true,
                  color: { argb: 'FF155724' }
                }
              } else if (val === 'No') {
                cell.fill = {
                  type: 'pattern',
                  pattern: 'solid',
                  fgColor: { argb: 'FFF8D7DA' }
                }
                cell.font = {
                  name: 'Segoe UI',
                  size: 9,
                  bold: true,
                  color: { argb: 'FF721C24' }
                }
              }
            }
          })
        }
      }

      // 2. All Players Sheet
      const allSheet = workbook.addWorksheet('All Players')
      allSheet.columns = columns
      rawPlayers.forEach((p: any) => {
        allSheet.addRow({
          ...p,
          eligible: !p.isSold ? 'Yes' : 'No',
          isSoldText: p.isSold ? 'Yes' : 'No',
          soldPrice: p.soldPrice || 0
        })
      })
      styleWorksheet(allSheet)

      // 3. Position + Group Combination Sheets (e.g., CF-A, CF-B, DMF-A, DMF-B)
      const positionGroupMap = new Map<string, any[]>()
      rawPlayers.forEach((p: any) => {
        const pos = p.position || 'N/A'
        const group = p.position_group || 'ALL'
        
        // Create combined key like "CF-A", "CF-B", "GK-ALL", etc.
        const combinedKey = group === 'ALL' ? pos : `${pos}-${group}`
        
        if (!positionGroupMap.has(combinedKey)) {
          positionGroupMap.set(combinedKey, [])
        }
        positionGroupMap.get(combinedKey)!.push(p)
      })

      console.log('🔵 [EXPORT] Position-Group combinations found:', Array.from(positionGroupMap.keys()))

      positionGroupMap.forEach((players, combinedKey) => {
        const safeSheetName = `${combinedKey} (${players.length})`
        const sheet = workbook.addWorksheet(safeSheetName)
        sheet.columns = columns
        players.forEach((p: any) => {
          sheet.addRow({
            ...p,
            eligible: !p.isSold ? 'Yes' : 'No',
            isSoldText: p.isSold ? 'Yes' : 'No',
            soldPrice: p.soldPrice || 0
          })
        })
        styleWorksheet(sheet)
      })

      // 4. Position Sheets (All groups combined per position)
      const positionsMap = new Map<string, any[]>()
      rawPlayers.forEach((p: any) => {
        const posName = p.position || 'N_A'
        if (!positionsMap.has(posName)) {
          positionsMap.set(posName, [])
        }
        positionsMap.get(posName)!.push(p)
      })

      positionsMap.forEach((posPlayers, posName) => {
        const safeSheetName = `${posName}-All (${posPlayers.length})`
        const posSheet = workbook.addWorksheet(safeSheetName)
        posSheet.columns = columns
        posPlayers.forEach((p: any) => {
          posSheet.addRow({
            ...p,
            eligible: !p.isSold ? 'Yes' : 'No',
            isSoldText: p.isSold ? 'Yes' : 'No',
            soldPrice: p.soldPrice || 0
          })
        })
        styleWorksheet(posSheet)
      })

      console.log('🔵 [EXPORT] All worksheets created successfully')
      console.log('🔵 [EXPORT] Writing workbook to buffer...')
      
      // Trigger download
      const buffer = await workbook.xlsx.writeBuffer()
      console.log('🔵 [EXPORT] Buffer created, size:', buffer.byteLength, 'bytes')
      
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      console.log('🔵 [EXPORT] Blob created, size:', blob.size, 'bytes')
      
      const url = window.URL.createObjectURL(blob)
      console.log('🔵 [EXPORT] Object URL created:', url)
      
      const a = document.createElement('a')
      a.href = url
      const filename = `TurfCats-Players-Database-${new Date().toISOString().split('T')[0]}.xlsx`
      a.download = filename
      console.log('🔵 [EXPORT] Triggering download:', filename)
      
      a.click()
      console.log('🔵 [EXPORT] Download triggered')
      
      window.URL.revokeObjectURL(url)
      console.log('🔵 [EXPORT] Object URL revoked')
      
      setShowExportModal(false)
      console.log('✅ [EXPORT] Export completed successfully!')
    } catch (err: any) {
      console.error('🔴 [EXPORT] Error generating Excel export:', err)
      console.error('🔴 [EXPORT] Error name:', err.name)
      console.error('🔴 [EXPORT] Error message:', err.message)
      console.error('🔴 [EXPORT] Error stack:', err.stack)
      alert('Failed to export to Excel: ' + err.message)
    } finally {
      console.log('🔵 [EXPORT] Cleaning up, setting loading to false')
      setExportLoading(false)
    }
  }

  // ── Load starred players ─────────────────────────────────────────────────────
  useEffect(() => {
    if (enableStarring) {
      fetch(`/api/team/starred-players?seasonId=${seasonId}`)
        .then(res => res.json())
        .then(data => {
          if (data.starredPlayerIds) {
            setStarredPlayerIds(new Set(data.starredPlayerIds))
          }
        })
        .catch(err => console.error('Error loading starred players:', err))
    }
  }, [enableStarring, seasonId])

  // ── Toggle star ──────────────────────────────────────────────────────────────
  const toggleStar = async (playerId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (starringInProgress.has(playerId)) return
    
    setStarringInProgress(prev => new Set(prev).add(playerId))
    const isCurrentlyStarred = starredPlayerIds.has(playerId)
    
    try {
      if (isCurrentlyStarred) {
        const res = await fetch(`/api/team/starred-players?playerId=${playerId}&seasonId=${seasonId}`, {
          method: 'DELETE',
        })
        if (res.ok) {
          setStarredPlayerIds(prev => {
            const newSet = new Set(prev)
            newSet.delete(playerId)
            return newSet
          })
        }
      } else {
        const res = await fetch('/api/team/starred-players', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId, seasonId }),
        })
        if (res.ok) {
          setStarredPlayerIds(prev => new Set(prev).add(playerId))
        }
      }
    } catch (err) {
      console.error('Error toggling star:', err)
    } finally {
      setStarringInProgress(prev => {
        const newSet = new Set(prev)
        newSet.delete(playerId)
        return newSet
      })
    }
  }

  // ── Fetch from API ───────────────────────────────────────────────────────────
  const fetchPlayers = useCallback(async (opts: {
    search: string
    position: string
    team: string
    group: string
    starred: string
    page: number
  }) => {
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setError(null)

    const params = new URLSearchParams({ seasonId, page: String(opts.page), sort: 'rating' })
    if (opts.search) params.set('search', opts.search)
    
    // Handle position groups
    if (opts.position !== 'ALL' && !opts.position.includes('───')) {
      const groupPositions = POSITION_GROUPS[opts.position as keyof typeof POSITION_GROUPS]
      if (groupPositions) {
        // It's a group - send multiple positions
        params.set('positions', groupPositions.join(','))
      } else {
        // It's a single position
        params.set('position', opts.position)
      }
    }
    
    if (opts.team !== 'ALL') params.set('team', opts.team)
    if (opts.group !== 'ALL') params.set('group', opts.group)

    try {
      const res = await fetch(`/api/players/search?${params}`, { signal: controller.signal })
      if (!res.ok) throw new Error('Failed to fetch players')
      const data = await res.json()
      if (!controller.signal.aborted) {
        let filteredPlayers = data.players
        
        // Client-side filter for starred players if enabled
        if (enableStarring && opts.starred === 'starred') {
          filteredPlayers = filteredPlayers.filter((p: Player) => starredPlayerIds.has(p.id))
          // When filtering starred on client-side, use filtered count
          setPlayers(filteredPlayers)
          setTotalPlayers(filteredPlayers.length)
          setTotalPages(Math.ceil(filteredPlayers.length / 24))
        } else {
          // Use API response totals for server-side filtering
          setPlayers(filteredPlayers)
          setTotalPlayers(data.totalPlayers)
          setTotalPages(data.totalPages)
        }
        
        setLoading(false)
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError('Failed to load players. Please try again.')
        setLoading(false)
      }
    }
  }, [seasonId, POSITION_GROUPS, enableStarring, starredPlayerIds])

  // ── Silently sync state → URL (no navigation, no reload) ────────────────────
  const syncURL = useCallback((opts: {
    search: string; position: string; team: string; group: string; starred: string; page: number
  }) => {
    const params = new URLSearchParams()
    if (opts.page > 1) params.set('page', String(opts.page))
    if (opts.search) params.set('search', opts.search)
    if (opts.position !== 'ALL') params.set('position', opts.position)
    if (opts.team !== 'ALL') params.set('team', opts.team)
    if (opts.group !== 'ALL') params.set('group', opts.group)
    if (opts.starred !== 'all') params.set('starred', opts.starred)
    const qs = params.toString()
    window.history.replaceState({}, '', qs ? `${pathname}?${qs}` : pathname)
  }, [pathname])

  // ── Debounced search ─────────────────────────────────────────────────────────
  // Fires fetch 400ms after user stops typing — NO page reload
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const newPage = 1
      setCurrentPage(newPage)
      syncURL({ search: searchQuery, position: positionFilter, team: teamFilter, group: groupFilter, starred: starredFilter, page: newPage })
      fetchPlayers({ search: searchQuery, position: positionFilter, team: teamFilter, group: groupFilter, starred: starredFilter, page: newPage })
    }, 400)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery])

  // ── Instant filter changes ───────────────────────────────────────────────────
  const applyFilters = useCallback((overrides: Partial<{
    position: string; team: string; group: string; starred: string; page: number
  }>) => {
    const next = {
      search: searchQuery,
      position: positionFilter,
      team: teamFilter,
      group: groupFilter,
      starred: starredFilter,
      page: 1,
      ...overrides
    }
    setCurrentPage(next.page)
    syncURL(next)
    fetchPlayers(next)
  }, [searchQuery, positionFilter, teamFilter, groupFilter, starredFilter, syncURL, fetchPlayers])

  // ── Initial load ─────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchPlayers({ search: searchQuery, position: positionFilter, team: teamFilter, group: groupFilter, starred: starredFilter, page: currentPage })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handlePositionChange = (value: string) => {
    setPositionFilter(value)
    applyFilters({ position: value })
  }

  const handleTeamChange = (value: string) => {
    setTeamFilter(value)
    applyFilters({ team: value })
  }

  const handleGroupChange = (value: string) => {
    setGroupFilter(value)
    applyFilters({ group: value })
  }

  const handleStarredChange = (value: string) => {
    setStarredFilter(value)
    applyFilters({ starred: value })
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    applyFilters({ page })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleClearFilters = () => {
    setSearchQuery('')
    setPositionFilter('ALL')
    setTeamFilter('ALL')
    setGroupFilter('ALL')
    setStarredFilter('all')
    const next = { search: '', position: 'ALL', team: 'ALL', group: 'ALL', starred: 'all', page: 1 }
    syncURL(next)
    fetchPlayers(next)
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Filters */}
      <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <label className="block text-xs sm:text-sm font-bold text-[#F5F0E8] mb-2">Search Players</label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, club, team, or position..."
                className="w-full px-3 sm:px-4 py-2 sm:py-3 pl-10 sm:pl-12 rounded-lg sm:rounded-xl bg-black/50 border border-white/10 text-white placeholder-[#7A7367] focus:border-[#E8A800] focus:outline-none focus:ring-2 focus:ring-[#E8A800]/20 transition-all text-sm sm:text-base"
                autoComplete="off"
              />
              <div className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-[#7A7367]">
                {loading ? <SpinnerIcon /> : <SearchIcon />}
              </div>
            </div>
          </div>

          {/* Position Filter */}
          <CustomSelect
            label="Position"
            value={positionFilter}
            options={enhancedPositions}
            onChange={handlePositionChange}
          />

          {/* Team Filter */}
          <CustomSelect
            label="Team"
            value={teamFilter}
            options={teams}
            onChange={handleTeamChange}
            displayValue={(val) => val === 'ALL' ? 'All Teams' : val}
          />

          {/* Starred Filter - Only show when starring is enabled */}
          {enableStarring && (
            <CustomSelect
              label="Starred"
              value={starredFilter}
              options={['all', 'starred']}
              onChange={handleStarredChange}
              displayValue={(val) => val === 'all' ? 'All Players' : '⭐ Starred Only'}
            />
          )}

          {/* Group Filter - Show when any position in the filter supports groups */}
          {(() => {
            // Check if current position filter includes any grouped positions
            const GROUPED_POSITIONS = ['CB', 'DMF', 'CMF', 'AMF', 'CF']
            
            // If it's a position group name, check if any positions in that group are grouped
            if (Object.keys(POSITION_GROUPS).includes(positionFilter)) {
              const groupPositions = POSITION_GROUPS[positionFilter as keyof typeof POSITION_GROUPS]
              const hasGroupedPosition = groupPositions.some(pos => GROUPED_POSITIONS.includes(pos))
              if (!hasGroupedPosition) return null
            } 
            // If it's an individual position, check if it's grouped
            else if (!GROUPED_POSITIONS.includes(positionFilter)) {
              return null
            }

            return (
              <CustomSelect
                label="Group"
                value={groupFilter}
                options={['ALL', 'A', 'B']}
                onChange={handleGroupChange}
                displayValue={(val) => val === 'ALL' ? 'All Groups' : `${positionFilter}-${val}`}
              />
            )
          })()}
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between text-xs sm:text-sm text-[#D4CCBB] font-medium">
        <span>
          {loading
            ? 'Loading...'
            : totalPlayers === 0
            ? 'No players found'
            : `Showing ${((currentPage - 1) * 24) + 1}–${Math.min(currentPage * 24, totalPlayers)} of ${totalPlayers} players`}
          {searchQuery && !loading && (
            <span className="text-[#E8A800] ml-2">• Searching for "{searchQuery}"</span>
          )}
        </span>
        <div className="flex items-center gap-4">
          {(searchQuery || positionFilter !== 'ALL' || teamFilter !== 'ALL' || groupFilter !== 'ALL' || starredFilter !== 'all') && (
            <button
              onClick={handleClearFilters}
              className="text-[#E8A800] hover:text-[#FFC93A] transition-colors text-xs"
            >
              Clear Filters
            </button>
          )}
          <button
            onClick={() => {
              console.log('🔵 [EXPORT] Export button clicked')
              console.log('🔵 [EXPORT] Current state:', {
                showExportModal,
                exportFilter,
                exportLoading,
                seasonId
              })
              setShowExportModal(true)
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 font-bold transition-all text-xs"
          >
            📊 Export to Excel
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-4 text-red-400 text-sm text-center">
          {error}
        </div>
      )}

      {/* Players Grid */}
      <div className={`transition-opacity duration-200 ${loading ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
        {!loading && players.length === 0 && !error ? (
          <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-8 sm:p-12 text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl bg-[#E8A800]/10 border border-[#E8A800]/20 flex items-center justify-center text-[#E8A800] mx-auto mb-4">
              <SearchIcon />
            </div>
            <div className="text-[#D4CCBB] text-sm sm:text-base">No players found matching your filters</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
            {/* Skeleton cards while loading */}
            {loading && players.length === 0
              ? Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6 animate-pulse">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg bg-white/10 flex-shrink-0" />
                      <div className="flex-1 space-y-2 pt-1">
                        <div className="h-4 bg-white/10 rounded w-3/4" />
                        <div className="h-3 bg-white/10 rounded w-1/2" />
                        <div className="flex gap-2">
                          <div className="h-5 bg-white/10 rounded w-12" />
                          <div className="h-5 bg-white/10 rounded w-16" />
                        </div>
                      </div>
                    </div>
                    <div className="h-14 bg-white/10 rounded-lg" />
                  </div>
                ))
              : players.map((player) => {
                  const playerPath = basePath ? `${basePath}/${player.id}` : `/sub-admin/${seasonId}/all-players/${player.id}`
                  return (
                    <Link
                      key={player.id}
                      href={playerPath}
                      className="group rounded-xl bg-white/5 border border-white/10 hover:border-[#E8A800]/30 hover:bg-white/10 p-4 transition-all relative"
                    >
                      {/* Star Button */}
                      {enableStarring && (
                        <button
                          onClick={(e) => toggleStar(player.id, e)}
                          disabled={starringInProgress.has(player.id)}
                          className="absolute top-2 right-2 z-10 p-2 rounded-lg bg-black/50 hover:bg-black/70 transition-all disabled:opacity-50"
                          title={starredPlayerIds.has(player.id) ? 'Unstar player' : 'Star player'}
                        >
                          {starredPlayerIds.has(player.id) ? (
                            <svg className="w-5 h-5 text-[#E8A800] fill-current" viewBox="0 0 24 24">
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5 text-gray-400 hover:text-[#E8A800] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                            </svg>
                          )}
                        </button>
                      )}

                      {/* Player Card - Horizontal Layout */}
                      <div className="flex gap-4">
                        {/* Player Photo - Left Side */}
                        <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-gray-800 flex-shrink-0">
                          <img
                            src={player.photoUrl}
                            alt={player.name}
                            loading="eager"
                            decoding="async"
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).src = '/default-player.png' }}
                          />
                        </div>

                        {/* Player Info - Right Side */}
                        <div className="flex-1 min-w-0 space-y-2">
                          <div>
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="px-2 py-0.5 rounded-full border border-[#E8A800]/30 bg-[#E8A800]/20 text-[#E8A800] text-xs font-bold">
                                {player.position}
                              </span>
                              <PositionGroupBadge position={player.position} group={player.position_group} size="sm" />
                              <span className="px-2 py-0.5 rounded-full border border-[#FFB347]/30 bg-[#FFB347]/20 text-[#FFB347] text-xs font-bold">
                                {player.overallRating}
                              </span>
                            </div>
                            <h3 className="text-base font-black text-white mb-1 group-hover:text-[#E8A800] transition-colors line-clamp-1">
                              {player.name}
                            </h3>
                            <div className="text-xs text-gray-400 truncate">{player.realWorldClub}</div>
                          </div>
                        </div>
                      </div>

                      {/* Team or Free Agent */}
                      <div className="mt-3">
                        {player.team ? (
                          <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                            <div className="relative w-5 h-5 rounded overflow-hidden bg-gray-800 flex-shrink-0">
                              <img
                                src={player.team.logoUrl}
                                alt={player.team.name}
                                loading="eager"
                                decoding="async"
                                className="w-full h-full object-cover"
                                onError={(e) => { (e.target as HTMLImageElement).src = '/default-team-logo.png' }}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-bold text-white truncate">{player.team.name}</div>
                              {player.soldPrice && player.soldPrice > 0 && (
                                <div className="text-xs font-bold text-emerald-400">
                                  ${player.soldPrice.toLocaleString()}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-center">
                            <div className="text-xs text-blue-400 font-bold">Free Agent</div>
                          </div>
                        )}
                      </div>
                    </Link>
                  )
                })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6 sm:mt-8">
          {currentPage === 1 ? (
            <span className="px-3 sm:px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white opacity-50 cursor-not-allowed">
              <ChevronLeftIcon />
            </span>
          ) : (
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              className="px-3 sm:px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all"
            >
              <ChevronLeftIcon />
            </button>
          )}

          <div className="flex items-center gap-1 sm:gap-2">
            {currentPage > 3 && (
              <>
                <button onClick={() => handlePageChange(1)} className="px-3 sm:px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all text-sm">1</button>
                {currentPage > 4 && <span className="text-[#7A7367] px-2">...</span>}
              </>
            )}

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === currentPage || p === currentPage - 1 || p === currentPage + 1 ||
                (currentPage <= 2 && p <= 3) || (currentPage >= totalPages - 1 && p >= totalPages - 2))
              .map(p => (
                <button
                  key={p}
                  onClick={() => handlePageChange(p)}
                  className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    p === currentPage
                      ? 'bg-[#E8A800] text-[#0a0a0a] pointer-events-none'
                      : 'bg-white/5 border border-white/10 text-white hover:bg-white/10'
                  }`}
                >
                  {p}
                </button>
              ))}

            {currentPage < totalPages - 2 && (
              <>
                {currentPage < totalPages - 3 && <span className="text-[#7A7367] px-2">...</span>}
                <button onClick={() => handlePageChange(totalPages)} className="px-3 sm:px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all text-sm">{totalPages}</button>
              </>
            )}
          </div>

          {currentPage === totalPages ? (
            <span className="px-3 sm:px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white opacity-50 cursor-not-allowed">
              <ChevronRightIcon />
            </span>
          ) : (
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              className="px-3 sm:px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all"
            >
              <ChevronRightIcon />
            </button>
          )}
        </div>
      )}
      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => !exportLoading && setShowExportModal(false)} />
          
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-[#121212]/95 border border-white/10 p-4 sm:p-6 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg sm:text-xl font-black text-white mb-3 sm:mb-4">Export Players Database</h3>
            
            <p className="text-xs sm:text-sm text-[#7A7367] mb-4 sm:mb-6">
              Choose export format and which player records to include.
            </p>

            {/* Export Mode Selection */}
            <div className="mb-4 sm:mb-6">
              <label className="block text-xs sm:text-sm font-bold text-white mb-2 sm:mb-3">Export Format</label>
              <div className="space-y-2 sm:space-y-3">
                <label className="flex items-start gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="exportMode"
                    checked={exportMode === 'single'}
                    onChange={() => setExportMode('single')}
                    className="w-4 h-4 mt-0.5 accent-[#E8A800] flex-shrink-0"
                    disabled={exportLoading}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs sm:text-sm font-bold text-white">Single Excel File</div>
                    <div className="text-[10px] sm:text-xs text-[#7A7367] leading-tight mt-0.5">One file with multiple sheets (Summary, All Players, Position Groups)</div>
                  </div>
                </label>

                <label className="flex items-start gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="exportMode"
                    checked={exportMode === 'multiple'}
                    onChange={() => setExportMode('multiple')}
                    className="w-4 h-4 mt-0.5 accent-[#E8A800] flex-shrink-0"
                    disabled={exportLoading}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs sm:text-sm font-bold text-white">Multiple Excel Files (ZIP)</div>
                    <div className="text-[10px] sm:text-xs text-[#7A7367] leading-tight mt-0.5">Separate file for each position group (CF-A, CF-B, DMF-A, etc.)</div>
                  </div>
                </label>
              </div>
            </div>

            {/* Player Filter Selection */}
            <div className="mb-4 sm:mb-6">
              <label className="block text-xs sm:text-sm font-bold text-white mb-2 sm:mb-3">Player Filter</label>
              <div className="space-y-2 sm:space-y-3">
                <label className="flex items-start gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="exportFilter"
                    checked={exportFilter === 'all'}
                    onChange={() => setExportFilter('all')}
                    className="w-4 h-4 mt-0.5 accent-[#E8A800] flex-shrink-0"
                    disabled={exportLoading}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs sm:text-sm font-bold text-white">All Players</div>
                    <div className="text-[10px] sm:text-xs text-[#7A7367] leading-tight mt-0.5">Export the entire database pool</div>
                  </div>
                </label>

                <label className="flex items-start gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="exportFilter"
                    checked={exportFilter === 'sold'}
                    onChange={() => setExportFilter('sold')}
                    className="w-4 h-4 mt-0.5 accent-[#E8A800] flex-shrink-0"
                    disabled={exportLoading}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs sm:text-sm font-bold text-white">Sold Players Only</div>
                    <div className="text-[10px] sm:text-xs text-[#7A7367] leading-tight mt-0.5">Only players assigned to a team</div>
                  </div>
                </label>

                <label className="flex items-start gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="exportFilter"
                    checked={exportFilter === 'unsold'}
                    onChange={() => setExportFilter('unsold')}
                    className="w-4 h-4 mt-0.5 accent-[#E8A800] flex-shrink-0"
                    disabled={exportLoading}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs sm:text-sm font-bold text-white">Unsold Players Only</div>
                    <div className="text-[10px] sm:text-xs text-[#7A7367] leading-tight mt-0.5">Only players remaining in the draft pool</div>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 sm:gap-3 pt-2 border-t border-white/5">
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                disabled={exportLoading}
                className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-gray-400 hover:text-white transition-colors text-xs sm:text-sm font-bold disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  console.log('🔵 [EXPORT] Modal Export button clicked')
                  console.log('🔵 [EXPORT] Export filter selected:', exportFilter)
                  console.log('🔵 [EXPORT] Export mode selected:', exportMode)
                  console.log('🔵 [EXPORT] Export loading state:', exportLoading)
                  handleExportToExcel()
                }}
                disabled={exportLoading}
                className="flex items-center justify-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black transition-colors text-xs sm:text-sm font-black disabled:opacity-50 min-w-[100px] sm:min-w-[120px]"
              >
                {exportLoading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin text-black" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Exporting...
                  </>
                ) : (
                  'Export'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
