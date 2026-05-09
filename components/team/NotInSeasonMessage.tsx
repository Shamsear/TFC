import Link from "next/link"
import Image from "next/image"

interface NotInSeasonMessageProps {
  team: {
    id: string
    name: string
    logoUrl: string
    managerName: string
  }
  activeSeason: {
    name: string
  } | null
}

export default function NotInSeasonMessage({ team, activeSeason }: NotInSeasonMessageProps) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            {team.logoUrl && (
              <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-white/5">
                <Image
                  src={team.logoUrl}
                  alt={team.name}
                  fill
                  className="object-cover"
                />
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold text-white">{team.name}</h1>
              <p className="text-gray-400">Manager: {team.managerName}</p>
            </div>
          </div>
        </div>

        {/* Not in Active Season Message */}
        <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-8 text-center">
          <div className="text-6xl mb-4">🏆</div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Not in Active Season
          </h2>
          <p className="text-gray-400 mb-6">
            Your team is not participating in the current active season.
            {activeSeason && (
              <span className="block mt-2">
                Active Season: <span className="text-[#E8A800] font-medium">{activeSeason.name}</span>
              </span>
            )}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/seasons"
              className="px-6 py-3 bg-[#E8A800] hover:bg-[#FFC93A] text-black font-medium rounded-lg transition-colors"
            >
              View All Seasons
            </Link>
            <Link
              href={`/teams/${team.id}`}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg transition-colors"
            >
              View Team Profile
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
