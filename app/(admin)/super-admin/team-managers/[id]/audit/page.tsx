import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"

export const metadata = {
  title: "Team Manager Audit Logs | Turf Cats Admin",
  description: "View team manager audit logs",
}

export default async function TeamManagerAuditPage({
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

  // Fetch audit logs for this team manager
  const auditLogs = await prisma.audit_logs.findMany({
    where: {
      userId: params.id,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 100,
  })

  return (
    <div className="pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-4">
            <Link
              href="/super-admin/team-managers"
              className="hover:text-white"
            >
              Team Managers
            </Link>
            <span>/</span>
            <span className="text-white">Audit Logs</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Audit Logs: {teamManager.name || teamManager.email}
          </h1>
          <p className="text-gray-400">
            View all actions performed by this team manager
          </p>
        </div>

        {/* Team Manager Info */}
        <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-gray-400 text-sm mb-1">Manager</div>
              <div className="text-white font-medium">
                {teamManager.name || "N/A"}
              </div>
            </div>
            <div>
              <div className="text-gray-400 text-sm mb-1">Email</div>
              <div className="text-white font-medium">{teamManager.email}</div>
            </div>
            <div>
              <div className="text-gray-400 text-sm mb-1">Team</div>
              <div className="text-white font-medium">
                {teamManager.team?.name || "No team assigned"}
              </div>
            </div>
          </div>
        </div>

        {/* Audit Logs */}
        <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-white/10">
            <h2 className="text-xl font-bold text-white">
              Activity Log ({auditLogs.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-4 px-6 text-gray-400 font-medium">
                    Date & Time
                  </th>
                  <th className="text-left py-4 px-6 text-gray-400 font-medium">
                    Action
                  </th>
                  <th className="text-left py-4 px-6 text-gray-400 font-medium">
                    Entity
                  </th>
                  <th className="text-left py-4 px-6 text-gray-400 font-medium">
                    Details
                  </th>
                  <th className="text-left py-4 px-6 text-gray-400 font-medium">
                    IP Address
                  </th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.length > 0 ? (
                  auditLogs.map((log) => (
                    <tr
                      key={log.id}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <td className="py-4 px-6">
                        <div className="text-white text-sm">
                          {new Date(log.createdAt).toLocaleDateString()}
                        </div>
                        <div className="text-gray-400 text-xs">
                          {new Date(log.createdAt).toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                            log.action === "CREATE"
                              ? "bg-green-500/20 text-green-400"
                              : log.action === "UPDATE"
                              ? "bg-blue-500/20 text-blue-400"
                              : log.action === "DELETE"
                              ? "bg-red-500/20 text-red-400"
                              : "bg-gray-500/20 text-gray-400"
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-white text-sm">
                          {log.entityType}
                        </div>
                        {log.entityName && (
                          <div className="text-gray-400 text-xs">
                            {log.entityName}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-gray-400 text-sm max-w-md truncate">
                          {log.details || "N/A"}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-gray-400 text-sm font-mono">
                        {log.ipAddress || "N/A"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-12 text-center">
                      <div className="text-gray-400">No audit logs found</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
