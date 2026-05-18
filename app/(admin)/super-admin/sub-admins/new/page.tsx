import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import SubAdminForm from '@/components/admin/SubAdminForm'

async function getSeasons() {
  try {
    const seasons = await prisma.seasons.findMany({
      orderBy: { createdAt: 'desc' }
    })
    return seasons
  } catch (error) {
    console.error('Error fetching seasons:', error)
    return []
  }
}

export default async function NewSubAdminPage() {
  const session = await auth()

  if (!session || session.user?.role !== 'SUPER_ADMIN') {
    redirect('/api/auth/signin')
  }

  const seasons = await getSeasons()

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white px-4 sm:px-6 lg:px-8 pt-20 pb-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black mb-2 sm:mb-3">
            <span className="bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent">
              Create Sub-Admin
            </span>
          </h1>
          <p className="text-[#D4CCBB] text-sm sm:text-base">Create a new sub-admin account with specific permissions</p>
        </div>

        <SubAdminForm seasons={seasons} createdBy={session.user.id!} />
      </div>
    </div>
  )
}
