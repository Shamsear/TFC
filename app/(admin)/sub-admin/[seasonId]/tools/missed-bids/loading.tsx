export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 pt-6">
      <div className="text-center py-20">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#E8A800] border-t-transparent mb-4"></div>
        <div className="text-xs text-gray-500 font-extrabold uppercase tracking-wider font-mono">
          Loading Missed Bids Audit...
        </div>
      </div>
    </div>
  )
}
