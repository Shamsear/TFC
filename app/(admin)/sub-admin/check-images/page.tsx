import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import CheckImagesClient from '@/components/admin/CheckImagesClient'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Scan Player Images - Sub Admin',
  description: 'Scan and identify players missing card templates or photos and auto-fetch them from PESDB.'
}

export default async function CheckImagesPage() {
  const session = await auth()

  // Guard: Ensure user is logged in and is an administrator
  if (!session?.user) {
    redirect('/auth/signin')
  }

  const role = session.user.role
  if (role !== 'SUPER_ADMIN' && role !== 'SUB_ADMIN') {
    redirect('/auth/signin')
  }

  return (
    <div className="text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <CheckImagesClient />
      </div>
    </div>
  )
}
