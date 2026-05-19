import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import CreateTeamManagerForm from "@/components/admin/CreateTeamManagerForm"

export const metadata = {
  title: "Create Team Manager | Turf Cats Admin",
  description: "Create a new team manager account",
}

export default async function CreateTeamManagerPage({
  searchParams,
}: {
  searchParams: { teamId?: string }
}) {
  const session = await auth()

  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    redirect("/auth/signin")
  }

  // Fetch all teams
  const teams = await prisma.teams.findMany({
    select: {
      id: true,
      name: true,
      managerName: true,
    },
    orderBy: {
      name: "asc",
    },
  })

  // Get teams that already have managers
  const teamManagers = await prisma.users.findMany({
    where: {
      role: "TEAM_MANAGER",
      teamId: { not: null },
    },
    select: {
      teamId: true,
    },
  })

  const assignedTeamIds = teamManagers
    .map((tm) => tm.teamId)
    .filter((id): id is string => id !== null)

  return (
    <div className="pb-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Create Team Manager
          </h1>
          <p className="text-gray-400">
            Create a new team manager account and assign to a team
          </p>
        </div>

        {/* Form */}
        <CreateTeamManagerForm
          teams={teams}
          assignedTeamIds={assignedTeamIds}
          preselectedTeamId={searchParams.teamId}
        />
      </div>
    </div>
  )
}
