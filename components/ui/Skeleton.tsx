export default function Skeleton({
  className = "",
  variant = "default",
}: {
  className?: string
  variant?: "default" | "card" | "text" | "circle"
}) {
  const baseClasses = "animate-pulse bg-white/10"
  
  const variantClasses = {
    default: "rounded",
    card: "rounded-xl",
    text: "rounded h-4",
    circle: "rounded-full",
  }

  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${className}`} />
  )
}

export function SkeletonCard() {
  return (
    <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
      <Skeleton variant="text" className="w-1/3 mb-4" />
      <Skeleton variant="text" className="w-full mb-2" />
      <Skeleton variant="text" className="w-2/3" />
    </div>
  )
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden">
      <div className="p-6 border-b border-white/10">
        <Skeleton variant="text" className="w-1/4" />
      </div>
      <div className="p-6 space-y-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton variant="circle" className="w-10 h-10" />
            <div className="flex-1 space-y-2">
              <Skeleton variant="text" className="w-1/3" />
              <Skeleton variant="text" className="w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
