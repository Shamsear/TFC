import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { checkTeamSeasonParticipation } from "@/lib/team-auth"
import TeamProfileEditForm from "@/components/team/TeamProfileEditForm"

export const metadata = {
  title: "Edit Profile | Turf Cats",
  description: "Edit team profile details",
}

export default async function EditProfilePage() {
  const session = await auth()

  if (!session?.user?.teamId) {
    redirect("/auth/signin")
  }

  // Verify team participation in the active season
  const { isParticipating } = await checkTeamSeasonParticipation()
  if (!isParticipating) {
    redirect("/team/not-in-season")
  }

  // Fetch team info
  const team = await prisma.teams.findUnique({
    where: { id: session.user.teamId },
    select: {
      id: true,
      name: true,
      managerName: true,
      logoUrl: true,
    },
  })

  if (!team) {
    redirect("/auth/signin")
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pt-24 pb-16 relative overflow-hidden">
      {/* Decorative Spotlights */}
      <div className="absolute top-[-10%] left-[20%] w-[600px] h-[600px] rounded-full bg-[#E8A800]/[0.02] blur-[150px] pointer-events-none" />
      <div className="absolute top-[20%] right-[10%] w-[700px] h-[700px] rounded-full bg-emerald-500/[0.02] blur-[180px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[5%] w-[500px] h-[500px] rounded-full bg-cyan-500/[0.02] blur-[120px] pointer-events-none" />

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <TeamProfileEditForm team={team} />
      </main>
    </div>
  )
}
