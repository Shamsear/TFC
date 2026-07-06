export default function LoadingSpinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  }

  return (
    <div className={`relative ${sizeClasses[size]} flex items-center justify-center`}>
      {/* Outer spinning conic gradient */}
      <div
        className="absolute inset-0 rounded-full animate-spin"
        style={{
          background: 'conic-gradient(from 0deg, #E8A800 0%, #FFB347 40%, transparent 60%, #E8A800 100%)',
          WebkitMask: 'radial-gradient(farthest-side, transparent 70%, black 71%)',
          mask: 'radial-gradient(farthest-side, transparent 70%, black 71%)',
        }}
      />
      {/* Subtle core glow */}
      <div className="absolute w-[40%] h-[40%] rounded-full bg-[#E8A800]/20 blur-[2px]" />
    </div>
  )
}
