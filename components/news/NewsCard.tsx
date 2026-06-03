'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import Image from 'next/image';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

interface NewsCardProps {
  news: {
    id: string;
    title_en: string;
    title_ml?: string | null;
    summary_en?: string | null;
    summary_ml?: string | null;
    category: string;
    image_url?: string | null;
    created_at: Date;
    tone?: string | null;
    reporter_en?: string | null;
    reporter_ml?: string | null;
  };
  featured?: boolean;
  baseUrl?: string;
}

const categoryColors: Record<string, string> = {
  season: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  team: 'bg-green-500/20 text-green-300 border-green-500/30',
  auction: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  transfer: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  tournament: 'bg-red-500/20 text-red-300 border-red-500/30',
  match: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  achievement: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
  admin: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
  financial: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
};

const toneEmojis: Record<string, string> = {
  neutral: '📰',
  dramatic: '⚡',
  funny: '😄',
  harsh: '🔥',
};

export default function NewsCard({ news, featured = false, baseUrl = '/news' }: NewsCardProps) {
  const { language } = useLanguage();

  const title = language === 'ml' && news.title_ml ? news.title_ml : news.title_en;
  const summary = language === 'ml' && news.summary_ml ? news.summary_ml : news.summary_en;
  const reporter = language === 'ml' && news.reporter_ml ? news.reporter_ml : news.reporter_en;

  const categoryColor = categoryColors[news.category] || categoryColors.season;
  const toneEmoji = news.tone ? toneEmojis[news.tone] || '📰' : '📰';
  
  const href = `${baseUrl}/${news.id}`;

  if (featured) {
    return (
      <Link href={href} className="block group">
        <div className="bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden hover:border-white/30 transition-all shadow-xl group-hover:shadow-2xl group-hover:transform group-hover:-translate-y-1">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Image */}
            <div className="relative h-64 md:h-full">
              {news.image_url ? (
                <Image
                  src={news.image_url}
                  alt={title}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#E8A800]/20 to-[#FFB347]/20 flex items-center justify-center">
                  <span className="text-6xl">{toneEmoji}</span>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="p-6 flex flex-col justify-center">
              <div className="flex items-center gap-2 text-xs text-gray-400 mb-3 font-bold">
                <span>{toneEmoji}</span>
                <span>{formatDistanceToNow(new Date(news.created_at), { addSuffix: true })}</span>
              </div>

              <h2 className="text-3xl font-black mb-4 text-white leading-tight group-hover:text-[#E8A800] transition-colors">
                {title}
              </h2>

              {summary && (
                <p className="text-base text-gray-300 mb-4 line-clamp-3">
                  {summary}
                </p>
              )}

              {reporter && (
                <p className="text-sm text-gray-400 italic font-medium">
                  — {reporter}
                </p>
              )}
            </div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link href={href} className="block group h-full">
      <div className="bg-white/[0.02] border border-white/10 rounded-xl overflow-hidden hover:border-white/30 transition-all shadow-lg h-full flex flex-col group-hover:shadow-xl group-hover:transform group-hover:-translate-y-1">
        {/* Image */}
        <div className="relative h-48 flex-shrink-0">
          {news.image_url ? (
            <Image
              src={news.image_url}
              alt={title}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#E8A800]/20 to-[#FFB347]/20 flex items-center justify-center">
              <span className="text-4xl">{toneEmoji}</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col flex-grow">
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-2 font-bold">
            <span>{toneEmoji}</span>
            <span>{formatDistanceToNow(new Date(news.created_at), { addSuffix: true })}</span>
          </div>

          <h3 className="text-xl font-black mb-2 text-white line-clamp-2 leading-tight group-hover:text-[#E8A800] transition-colors">
            {title}
          </h3>

          {summary && (
            <p className="text-sm text-gray-300 mb-3 line-clamp-2 flex-grow">
              {summary}
            </p>
          )}

          {reporter && (
            <p className="text-xs text-gray-400 italic font-medium mt-auto pt-2">
              — {reporter}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
