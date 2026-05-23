import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import PlayerManagementClient from '@/components/admin/PlayerManagementClient';

export const metadata: Metadata = {
  title: 'Player Management',
  description: 'Transfer and release players'
};

export default async function PlayerManagementPage({
  params
}: {
  params: { seasonId: string };
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'SUB_ADMIN')) {
    redirect('/');
  }

  return <PlayerManagementClient seasonId={params.seasonId} />;
}
