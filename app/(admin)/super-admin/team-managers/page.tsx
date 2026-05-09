import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import Link from "next/link"

export const metadata = {
  title: "Team Managers | Turf Cats Admin",
  description: "Manage team managers",
}

export default async function TeamManagersPage() {
  const session = await auth()

  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    redirect("/auth/signin")
  }

  // Fetch all team managers
  const teamManagers = await prisma.users.findMany({
    where: {
      role: "TEAM_MANAGER",
    },
    include: {
      team: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  })

  // Get teams without managers
  const allTeams = await prisma.teams.findMany({
    select: {
      id: true,
      name: true,
    },
  })

  const assignedTeamIds = teamManagers
    .filter((tm) => tm.teamId)
    .map((tm) => tm.teamId)

  const unassignedTeams = allTeams.filter(
    (team) => !assignedTeamIds.includes(team.id)
  )

  return (
    <div className="min-h-screen bg-[#0a0a0a] py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Team Managers
            </h1>
            <p className="text-gray-400">
              Manage team manager accounts and assignments
            </p>
          </div>
          <Link
            href="/super-admin/team-managers/new"
            className="px-6 py-3 bg-[#E8A800] hover:bg-[#FFC93A] text-black font-medium rounded-lg transition-colors"
          >
            + Create Team Manager
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
            <div className="text-gray-400 text-sm mb-1">Total Managers</div>
            <div className="text-3xl font-bold text-white">
              {teamManagers.length}
            </div>
          </div>
          <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
            <div className="text-gray-400 text-sm mb-1">Active Managers</div>
            <div className="text-3xl font-bold text-white">
              {teamManagers.filter((tm) => tm.isActive).length}
            </div>
          </div>
          <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
            <div className="text-gray-400 text-sm mb-1">Unassigned Teams</div>
            <div className="text-3xl font-bold text-white">
              {unassignedTeams.length}
            </div>
          </div>
        </div>

        {/* Team Managers Table */}
        <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-4 px-6 text-gray-400 font-medium">
                    Manager
                  </th>
                  <th className="text-left py-4 px-6 text-gray-400 font-medium">
                    Email
                  </th>
                  <th className="text-left py-4 px-6 text-gray-400 font-medium">
                    Team
                  </th>
                  <th className="text-left py-4 px-6 text-gray-400 font-medium">
                    Status
                  </th>
                  <th className="text-left py-4 px-6 text-gray-400 font-medium">
                    Created
                  </th>
                  <th className="text-right py-4 px-6 text-gray-400 font-medium">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {teamManagers.length > 0 ? (
                  teamManagers.map((manager) => (
                    <tr
                      key={manager.id}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <td className="py-4 px-6">
                        <div className="text-white font-medium">
                          {manager.name || "N/A"}
                        </div>
                        <div className="text-gray-400 text-sm font-mono">
                          {manager.id}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-white">
                        {manager.email}
                      </td>
                      <td className="py-4 px-6">
                        {manager.team ? (
                          <div className="text-white">{manager.team.name}</div>
                        ) : (
                          <span className="text-gray-500 italic">
                            No team assigned
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        {manager.isActive ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">
                            <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm">
                            <span className="w-1.5 h-1.5 bg-red-400 rounded-full"></span>
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-gray-400">
                        {new Date(manager.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/super-admin/team-managers/${manager.id}/edit`}
                            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-colors"
                          >
                            Edit
                          </Link>
                          <Link
                            href={`/super-admin/team-managers/${manager.id}/audit`}
                            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-colors"
                          >
                            Audit
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-12 text-center">
                      <div className="text-gray-400">
                        No team managers found
                      </div>
                      <Link
                        href="/super-admin/team-managers/new"
                        className="text-[#E8A800] hover:text-[#FFC93A] mt-2 inline-block"
                      >
                        Create your first team manager →
                      </Link>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Unassigned Teams */}
        {unassignedTeams.length > 0 && (
          <div className="mt-8 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">
              Teams Without Managers
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {unassignedTeams.map((team) => (
                <div
                  key={team.id}
                  className="bg-white/5 border border-white/10 rounded-lg p-4"
                >
                  <div className="text-white font-medium mb-1">
                    {team.name}
                  </div>
                  <div className="text-gray-400 text-sm font-mono mb-3">
                    {team.id}
                  </div>
                  <Link
                    href={`/super-admin/team-managers/new?teamId=${team.id}`}
                    className="text-[#E8A800] hover:text-[#FFC93A] text-sm"
                  >
                    Assign Manager →
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
