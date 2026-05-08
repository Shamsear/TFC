import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

async function getSubAdmins() {
  try {
    const subAdmins = await prisma.users.findMany({
      where: {
        role: 'SUB_ADMIN'
      },
      include: {
        auditLogs: {
          select: {
            id: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Map to include action count
    const subAdminsWithStats = subAdmins.map((admin) => ({
      ...admin,
      total_actions: admin.auditLogs.length
    }))

    return subAdminsWithStats
  } catch (error) {
    console.error('Error fetching sub-admins:', error)
    return []
  }
}

export default async function SubAdminsPage() {
  const session = await auth()

  if (!session || session.user?.role !== 'SUPER_ADMIN') {
    redirect('/')
  }

  const subAdmins = await getSubAdmins()

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white px-4 sm:px-6 lg:px-8 pb-8">
      <div className="max-w-7xl mx-auto">
        {/* Page Title */}
        <div className="mb-6 sm:mb-8 lg:mb-12">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-black mb-2 sm:mb-3">
            <span className="bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent">
              Sub-Admin Management
            </span>
          </h1>
          <p className="text-[#D4CCBB] text-sm sm:text-base lg:text-lg">
            Create and manage sub-admin accounts
          </p>
        </div>

        {/* Create Sub-Admin Button */}
        <div className="mb-6 sm:mb-8">
          <Link
            href="/super-admin/sub-admins/new"
            className="inline-flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-[#E8A800] to-[#FFB347] text-[#0a0a0a] rounded-lg sm:rounded-xl font-bold hover:from-[#FFC93A] hover:to-[#FFB347] transition-all hover:scale-105 shadow-lg hover:shadow-[#E8A800]/50 text-sm sm:text-base"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Sub-Admin
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8 lg:mb-12">
          <div className="rounded-lg sm:rounded-xl bg-white/5 border border-white/10 p-3 sm:p-4 lg:p-6">
            <div className="text-xl sm:text-2xl lg:text-3xl font-black text-white mb-1">{subAdmins.length}</div>
            <div className="text-xs sm:text-sm text-gray-400">Total Sub-Admins</div>
          </div>
          <div className="rounded-lg sm:rounded-xl bg-white/5 border border-white/10 p-3 sm:p-4 lg:p-6">
            <div className="text-xl sm:text-2xl lg:text-3xl font-black text-[#E8A800] mb-1">
              {subAdmins.length}
            </div>
            <div className="text-xs sm:text-sm text-gray-400">Active</div>
          </div>
          <div className="rounded-lg sm:rounded-xl bg-white/5 border border-white/10 p-3 sm:p-4 lg:p-6">
            <div className="text-xl sm:text-2xl lg:text-3xl font-black text-[#FFB347] mb-1">
              {subAdmins.reduce((sum, s) => sum + (s.total_actions || 0), 0)}
            </div>
            <div className="text-xs sm:text-sm text-gray-400">Total Actions</div>
          </div>
        </div>

        {/* Sub-Admins List */}
        {subAdmins.length === 0 ? (
          <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-8 sm:p-12 text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl bg-[#E8A800]/10 border border-[#E8A800]/20 flex items-center justify-center text-[#E8A800] mx-auto mb-4 sm:mb-6">
              <svg className="w-8 h-8 sm:w-10 sm:h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div className="text-lg sm:text-xl font-bold text-white mb-2">No Sub-Admins Yet</div>
            <div className="text-[#D4CCBB] mb-4 sm:mb-6 text-sm sm:text-base">Create your first sub-admin account to get started</div>
            <Link
              href="/super-admin/sub-admins/new"
              className="inline-flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-[#E8A800] to-[#FFB347] text-[#0a0a0a] rounded-lg sm:rounded-xl font-bold hover:from-[#FFC93A] hover:to-[#FFB347] transition-all text-sm sm:text-base"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Sub-Admin
            </Link>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {subAdmins.map((admin) => (
              <div
                key={admin.id}
                className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6 hover:border-[#E8A800]/30 hover:bg-white/[0.07] transition-all"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Admin Info */}
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                      <h3 className="text-lg sm:text-xl font-black text-white">{admin.name || 'Unnamed Admin'}</h3>
                      <span className="px-2 sm:px-3 py-1 rounded-full border text-xs font-bold w-fit bg-[#E8A800]/10 border-[#E8A800]/30 text-[#E8A800]">
                        ACTIVE
                      </span>
                    </div>
                    <div className="text-sm text-[#D4CCBB] mb-2 sm:mb-3">{admin.email}</div>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-gray-400">
                      <div>Created: {formatDate(admin.createdAt)}</div>
                      <div>Actions: {admin.total_actions || 0}</div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                    <Link
                      href={`/super-admin/sub-admins/${admin.id}/audit`}
                      className="px-3 sm:px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold rounded-lg text-xs sm:text-sm transition-all text-center"
                    >
                      View Audit Log
                    </Link>
                    <Link
                      href={`/super-admin/sub-admins/${admin.id}/edit`}
                      className="px-3 sm:px-4 py-2 bg-[#E8A800]/10 border border-[#E8A800]/30 hover:bg-[#E8A800]/20 text-[#E8A800] font-bold rounded-lg text-xs sm:text-sm transition-all text-center"
                    >
                      Edit
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
