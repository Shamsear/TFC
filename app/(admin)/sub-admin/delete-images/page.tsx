import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import DeleteImagesClient from '@/components/admin/DeleteImagesClient'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Delete Player Images - Sub Admin',
  description: 'Manage and delete player photos and cards from GitHub storage repository.'
}

export default async function DeleteImagesPage() {
  const session = await auth()

  // Guard: Ensure user is logged in and has appropriate role
  if (!session?.user) {
    redirect('/auth/signin')
  }

  const role = session.user.role
  if (role !== 'SUPER_ADMIN' && role !== 'SUB_ADMIN') {
    redirect('/auth/signin')
  }

  return <DeleteImagesClient />
}
