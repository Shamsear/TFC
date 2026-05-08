import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import TeamSelectionForm from "@/components/season/TeamSelectionForm"

export default async function SeasonTeamSelectionPage({
  params,
}: {
  params: Promise<{ seasonId: string }>
}) {
  const session = await auth()

  if (!session?.user) {
    redirect("/auth/signin")
  }

  const { seasonId } = await params

  // Fetch season details
  const season = await prisma.seasons.findUnique({
    where: { id: seasonId },
    include: {
      seasonTeams: {
        include: { team: true }
      }
    }
  })

  if (!season) {
    redirect("/sub-admin")
  }

  // Fetch all teams from global registry
  const allTeams = await prisma.teams.findMany({
    orderBy: { name: "asc" }
  })

  // Get IDs of teams already assigned to this season
  const assignedTeamIds = season.seasonTeams.map(st => st.teamId)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6 sm:pb-8 lg:pb-12">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <Link
          href="/sub-admin"
          className="inline-flex items-center gap-2 text-[#E8A800] hover:text-[#FFC93A] text-sm font-medium mb-4 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </Link>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-2 sm:mb-3">
          <span className="bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent">
            Team Selection
          </span>
        </h1>
        <p className="text-[#D4CCBB] text-sm sm:text-base">
          Select teams from the global registry to participate in {season.name}
        </p>
      </div>

      {/* Season Info */}
      <div className="bg-gradient-to-br from-[#E8A800]/10 to-[#FFB347]/10 border border-[#E8A800]/30 rounded-xl sm:rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-black/30 backdrop-blur-sm border border-white/10 rounded-lg sm:rounded-xl p-3 sm:p-4">
            <div className="text-[#7A7367] text-xs sm:text-sm mb-1 font-medium">Season</div>
            <div className="text-lg sm:text-xl font-black text-white">{season.name}</div>
          </div>
          <div className="bg-black/30 backdrop-blur-sm border border-white/10 rounded-lg sm:rounded-xl p-3 sm:p-4">
            <div className="text-[#7A7367] text-xs sm:text-sm mb-1 font-medium">Starting Purse</div>
            <div className="text-lg sm:text-xl font-black text-[#E8A800]">
              ${season.startingPurse.toLocaleString()}
            </div>
          </div>
          <div className="bg-black/30 backdrop-blur-sm border border-white/10 rounded-lg sm:rounded-xl p-3 sm:p-4 sm:col-span-2 lg:col-span-1">
            <div className="text-[#7A7367] text-xs sm:text-sm mb-1 font-medium">Currently Selected</div>
            <div className="text-lg sm:text-xl font-black text-[#FFB347]">
              {assignedTeamIds.length} teams
            </div>
          </div>
        </div>
      </div>

      {/* Team Selection Form */}
      <TeamSelectionForm
        seasonId={seasonId}
        allTeams={allTeams}
        assignedTeamIds={assignedTeamIds}
      />
    </div>
  )
}
