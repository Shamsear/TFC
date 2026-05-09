import LoadingSpinner from "./LoadingSpinner"

export default function PageLoader({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <p className="text-gray-400 mt-4">{message}</p>
      </div>
    </div>
  )
}
