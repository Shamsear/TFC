import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import SubAdminForm from '@/components/admin/SubAdminForm'

async function getSubAdmin(id: string) {
  try {
    const user = await prisma.users.findUnique({
      where: { 
        id,
        role: 'SUB_ADMIN'
      },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        subAdminSeasons: {
          select: { seasonId: true }
        }
      }
    })

    if (!user) {
      return null
    }

    return {
      id: user.id,
      name: user.name || '',
      email: user.email,
      isActive: user.isActive,
      assignedSeasons: user.subAdminSeasons.map(s => s.seasonId)
    }
  } catch (error) {
    console.error('Error fetching sub-admin:', error)
    return null
  }
}

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

export default async function EditSubAdminPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()

  if (!session || session.user?.role !== 'SUPER_ADMIN') {
    redirect('/api/auth/signin')
  }

  const { id } = await params
  const subAdmin = await getSubAdmin(id)
  const seasons = await getSeasons()

  if (!subAdmin) {
    redirect('/super-admin/sub-admins')
  }

  return (
    <div className="text-white px-4 sm:px-6 lg:px-8 pb-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black mb-2 sm:mb-3">
            <span className="bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent">
              Edit Sub-Admin
            </span>
          </h1>
          <p className="text-[#D4CCBB] text-sm sm:text-base">Update sub-admin account details and permissions</p>
        </div>

        <SubAdminForm 
          seasons={seasons} 
          createdBy={session.user.id!}
          initialData={subAdmin}
        />
      </div>
    </div>
  )
}
