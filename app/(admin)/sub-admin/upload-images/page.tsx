import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import UploadImagesClient from '@/components/admin/UploadImagesClient'

export const metadata = {
  title: 'Upload Player Images - Sub Admin',
  description: 'Upload player photos and cards to GitHub storage repository.'
}

export default async function UploadImagesPage() {
  const session = await auth()

  // Guard: Ensure user is logged in and has appropriate role
  if (!session?.user) {
    redirect('/auth/signin')
  }

  const role = session.user.role
  if (role !== 'SUPER_ADMIN' && role !== 'SUB_ADMIN') {
    redirect('/auth/signin') // Redirect to login or unauthorized
  }

  // Check if GITHUB_TOKEN or GITHUB_PAT is set on the server
  const hasToken = !!(process.env.GITHUB_TOKEN || process.env.GITHUB_PAT)

  return <UploadImagesClient hasToken={hasToken} />
}
