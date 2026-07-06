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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 pt-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/sub-admin"
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#E8A800] hover:text-[#FFC93A] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-4xl sm:text-5xl font-black text-white mb-2 bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent uppercase tracking-wider leading-none">
          Team Selection
        </h1>
        <p className="text-[10px] sm:text-xs font-black text-gray-500 uppercase tracking-widest font-mono">
          Select teams from the global registry to participate in {season.name}
        </p>
      </div>

      {/* Season Info */}
      <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8 backdrop-blur-xl shadow-md">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 transition-all duration-300 shadow-md">
            <div className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest font-mono mb-1">Season</div>
            <div className="text-lg sm:text-xl font-black text-white">{season.name}</div>
          </div>
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 transition-all duration-300 shadow-md">
            <div className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest font-mono mb-1">Starting Purse</div>
            <div className="text-lg sm:text-xl font-black text-[#E8A800] font-mono">
              ${season.startingPurse.toLocaleString()}
            </div>
          </div>
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 transition-all duration-300 shadow-md sm:col-span-2 lg:col-span-1">
            <div className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest font-mono mb-1">Currently Selected</div>
            <div className="text-lg sm:text-xl font-black text-[#FFB347] font-mono">
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
