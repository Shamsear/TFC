import { redirect } from 'next/navigation';

export default async function SeasonDefaultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  
  // Redirect to season page for now
  redirect(`/super-admin/seasons/${id}`);
}
