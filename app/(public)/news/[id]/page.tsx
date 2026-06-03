import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { LanguageProvider } from '@/contexts/LanguageContext';
import NewsDetailView from '@/components/news/NewsDetailView';
import LanguageToggle from '@/components/news/LanguageToggle';
import { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  const newsItem = await prisma.news.findUnique({
    where: { id },
  });

  if (!newsItem) {
    return {
      title: 'News Not Found',
    };
  }

  const title = newsItem.title_en;
  const description = newsItem.summary_en || newsItem.content_en.substring(0, 160);
  const imageUrl = newsItem.image_url || '/images/default-news.jpg';

  return {
    title: `${title} | TFC News`,
    description,
    openGraph: {
      title,
      description,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
  };
}

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
