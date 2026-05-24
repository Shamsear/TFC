'use client'

import { useRouter } from 'next/navigation'
import SearchableSelect from '@/components/ui/SearchableSelect'

interface AuditLogsFiltersProps {
  subAdmins: { id: string; name: string; email: string }[]
  seasons: { id: string; name: string }[]
  currentUserId?: string
  currentSeasonId?: string
  currentAction?: string
}

export default function AuditLogsFilters({
  subAdmins,
  seasons,
  currentUserId,
  currentSeasonId,
  currentAction
}: AuditLogsFiltersProps) {
  const router = useRouter()

  const handleFilterChange = (param: string, value: string) => {
    const url = new URL(window.location.href)
    if (value) {
      url.searchParams.set(param, value)
    } else {
      url.searchParams.delete(param)
    }
    router.push(url.pathname + url.search)
  }

  const subAdminOptions = [
    { value: '', label: 'All Sub-Admins' },
    ...subAdmins.map(sa => ({ value: sa.id, label: sa.name }))
  ]

  const seasonOptions = [
    { value: '', label: 'All Seasons' },
    ...seasons.map(s => ({ value: s.id, label: s.name }))
  ]

  const actionOptions = [
    { value: '', label: 'All Actions' },
    { value: 'CREATE_TOURNAMENT', label: 'Create Tournament' },
    { value: 'UPDATE_TOURNAMENT', label: 'Update Tournament' },
    { value: 'CREATE_MATCH', label: 'Create Match' },
    { value: 'UPDATE_MATCH', label: 'Update Match' },
    { value: 'SELL_PLAYER', label: 'Sell Player' },
    { value: 'CREATE_AUCTION', label: 'Create Auction' }
  ]

  return (
    <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6 mb-6">
      <h2 className="text-base sm:text-lg font-black text-white mb-4">Filters</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        <SearchableSelect
          label="Sub-Admin"
          value={currentUserId || ''}
          options={subAdminOptions}
          onChange={(val) => handleFilterChange('userId', val)}
          enableSearch={true}
        />

        <SearchableSelect
          label="Season"
          value={currentSeasonId || ''}
          options={seasonOptions}
          onChange={(val) => handleFilterChange('seasonId', val)}
          enableSearch={true}
        />

        <SearchableSelect
          label="Action Type"
          value={currentAction || ''}
          options={actionOptions}
          onChange={(val) => handleFilterChange('action', val)}
          enableSearch={true}
        />
      </div>
    </div>
  )
}
