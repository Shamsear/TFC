import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import PlayersManagementClient from "@/components/admin/PlayersManagementClient"
import Link from "next/link"

export const dynamic = 'force-dynamic'

export const metadata = {
  title: "Player Management | Super Admin",
  description: "Manage global players database",
}

export default async function AdminPlayersPage() {
  const session = await auth()

  if (session?.user?.role !== "SUPER_ADMIN") {
    redirect("/")
  }

  return (
    <div className="text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6 sm:pb-8 lg:pb-12">
        <div className="mb-6 sm:mb-8 lg:mb-12">
          <div className="flex items-center gap-4 mb-4">
            <Link 
              href="/super-admin"
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black">
              <span className="bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent">
                Player Database
              </span>
            </h1>
          </div>
          <p className="text-gray-400 text-sm sm:text-base lg:text-lg pl-10">
            View all players in the system, search, find duplicates, and delete players.
          </p>
        </div>

        <PlayersManagementClient />
      </div>
    </div>
  )
}
