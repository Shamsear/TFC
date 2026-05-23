import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import LedgerFlowFixClient from '@/components/admin/LedgerFlowFixClient';

export default async function LedgerFixPage({
  params,
}: {
  params: { seasonId: string };
}) {
  const session = await auth();

  if (!session?.user || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'SUB_ADMIN')) {
    redirect('/login');
  }

  const season = await prisma.seasons.findUnique({
    where: { id: params.seasonId },
    select: { name: true }
  });

  if (!season) {
    redirect('/sub-admin');
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">Ledger Flow Fix</h1>
          <p className="text-gray-400">{season.name}</p>
        </div>

        <LedgerFlowFixClient seasonId={params.seasonId} />
      </div>
    </div>
  );
}
