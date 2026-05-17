interface PositionGroupBadgeProps {
  position: string
  group?: string | null
  size?: 'sm' | 'md' | 'lg'
}

const GROUPED_POSITIONS = ['CB', 'DMF', 'CMF', 'AMF', 'CF']

export default function PositionGroupBadge({ position, group, size = 'sm' }: PositionGroupBadgeProps) {
  // Only show badge for grouped positions
  if (!group || !GROUPED_POSITIONS.includes(position)) {
    return null
  }

  const colors = {
    A: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    B: 'bg-purple-500/20 text-purple-400 border-purple-500/30'
  }

  const sizes = {
    sm: 'px-1.5 py-0.5 text-[10px]',
    md: 'px-2 py-0.5 text-xs',
    lg: 'px-2.5 py-1 text-sm'
  }

  const color = colors[group as 'A' | 'B'] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'

  return (
    <span className={`inline-flex items-center rounded border font-bold ${color} ${sizes[size]}`}>
      {position}-{group}
    </span>
  )
}
