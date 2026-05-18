import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import TeamEditForm from '@/components/team/TeamEditForm'

interface TeamEditPageProps {
  params: Promise<{
    teamId: string
  }>
}

export default async function TeamEditPage({ params }: TeamEditPageProps) {
  const session = await auth()

  if (session?.user?.role !== "SUPER_ADMIN") {
    redirect("/")
  }

  const { teamId } = await params
  
  const team = await prisma.teams.findUnique({
    where: { id: teamId }
  })

  if (!team) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white px-4 sm:px-6 lg:px-8 pt-20 pb-8">
      <div className="max-w-3xl mx-auto">
        <TeamEditForm team={team} />
      </div>
    </div>
  )
}
