/**
 * Lightweight inline skeleton loader for page transitions.
 * Server component — renders instantly as pure HTML, zero JS overhead.
 * Shows inside the layout's Suspense boundary while page data loads.
 */
export default function PageSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse">
      {/* Title skeleton */}
      <div className="h-8 w-48 bg-white/5 rounded-lg mb-6" />
      
      {/* Stats row skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="rounded-2xl bg-white/[0.02] border border-white/5 p-6">
          <div className="h-3 w-24 bg-white/5 rounded mb-3" />
          <div className="h-8 w-16 bg-white/5 rounded" />
        </div>
        <div className="rounded-2xl bg-white/[0.02] border border-white/5 p-6">
          <div className="h-3 w-24 bg-white/5 rounded mb-3" />
          <div className="h-8 w-16 bg-white/5 rounded" />
        </div>
        <div className="rounded-2xl bg-white/[0.02] border border-white/5 p-6">
          <div className="h-3 w-24 bg-white/5 rounded mb-3" />
          <div className="h-8 w-16 bg-white/5 rounded" />
        </div>
        <div className="rounded-2xl bg-white/[0.02] border border-white/5 p-6">
          <div className="h-3 w-24 bg-white/5 rounded mb-3" />
          <div className="h-8 w-16 bg-white/5 rounded" />
        </div>
      </div>

      {/* Content rows skeleton */}
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl bg-white/[0.02] border border-white/5 p-4 flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-lg bg-white/5 flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-3/4 bg-white/5 rounded" />
              <div className="h-3 w-1/2 bg-white/5 rounded" />
            </div>
            <div className="h-6 w-16 bg-white/5 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
