import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import AdminToolsClient from '@/components/admin/AdminToolsClient';

export const metadata: Metadata = {
  title: 'Admin Tools',
  description: 'Transfer fixes and balance audits'
};

export default async function AdminToolsPage({
  params
}: {
  params: { seasonId: string };
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'SUB_ADMIN')) {
    redirect('/');
  }

  return <AdminToolsClient seasonId={params.seasonId} />;
}
