import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import TeamNavigation from "@/components/team/TeamNavigation"
import AdminFooter from "@/components/AdminFooter"

export default async function TeamLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  // Check if user is authenticated and is a team manager
  if (!session?.user) {
    redirect("/auth/signin")
  }

  if (session.user.role !== "TEAM_MANAGER") {
    redirect("/auth/signin")
  }

  // Check if team manager has a team assigned
  if (!session.user.teamId) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">No Team Assigned</h1>
          <p className="text-gray-400">Please contact an administrator to assign you to a team.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <TeamNavigation />
      <main className="pt-20">{children}</main>
      <AdminFooter />
    </div>
  )
}
