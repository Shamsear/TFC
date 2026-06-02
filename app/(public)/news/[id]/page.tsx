import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { LanguageProvider } from '@/contexts/LanguageContext';
import NewsDetailView from '@/components/news/NewsDetailView';
import LanguageToggle from '@/components/news/LanguageToggle';

export default async function PublicNewsDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const newsItem = await prisma.news.findUnique({
    where: { id },
  });

  if (!newsItem) {
    notFound();
  }

  return (
    <LanguageProvider>
      <div className="absolute top-24 right-4 sm:right-8 z-10">
        <LanguageToggle />
      </div>
      <NewsDetailView news={newsItem} backUrl="/news" />
    </LanguageProvider>
  );
}
