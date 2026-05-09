import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect, notFound } from "next/navigation"
import EditTeamManagerForm from "@/components/admin/EditTeamManagerForm"

export const metadata = {
  title: "Edit Team Manager | Turf Cats Admin",
  description: "Edit team manager account",
}

export default async function EditTeamManagerPage({
  params,
}: {
  params: { id: string }
}) {
  const session = await auth()

  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    redirect("/auth/signin")
  }

  // Fetch team manager
  const teamManager = await prisma.users.findUnique({
    where: {
      id: params.id,
      role: "TEAM_MANAGER",
    },
    include: {
      team: true,
    },
  })

  if (!teamManager) {
    notFound()
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

  // Get teams that already have managers (excluding current manager's team)
  const teamManagers = await prisma.users.findMany({
    where: {
      role: "TEAM_MANAGER",
      teamId: { not: null },
      NOT: {
        id: params.id,
      },
    },
    select: {
      teamId: true,
    },
  })

  const assignedTeamIds = teamManagers
    .map((tm) => tm.teamId)
    .filter((id): id is string => id !== null)

  return (
    <div className="min-h-screen bg-[#0a0a0a] py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Edit Team Manager
          </h1>
          <p className="text-gray-400">
            Update team manager account details
          </p>
        </div>

        {/* Form */}
        <EditTeamManagerForm
          teamManager={teamManager}
          teams={teams}
          assignedTeamIds={assignedTeamIds}
        />
      </div>
    </div>
  )
}
