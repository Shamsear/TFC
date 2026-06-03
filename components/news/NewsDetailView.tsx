'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { FaWhatsapp } from 'react-icons/fa';

interface NewsDetailProps {
  news: {
    id: string;
    title_en: string;
    title_ml?: string | null;
    content_en: string;
    content_ml?: string | null;
    summary_en?: string | null;
    summary_ml?: string | null;
    category: string;
    image_url?: string | null;
    created_at: Date;
    tone?: string | null;
    reporter_en?: string | null;
    reporter_ml?: string | null;
  };
  backUrl: string;
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

export default function NewsDetailView({ news, backUrl }: NewsDetailProps) {
  const { language } = useLanguage();

  const title = language === 'ml' && news.title_ml ? news.title_ml : news.title_en;
  const content = language === 'ml' && news.content_ml ? news.content_ml : news.content_en;
  const reporter = language === 'ml' && news.reporter_ml ? news.reporter_ml : news.reporter_en;

  const categoryColor = categoryColors[news.category] || categoryColors.season;
  const toneEmoji = news.tone ? toneEmojis[news.tone] || '📰' : '📰';

  // Format the text nicely with paragraphs
  const renderContent = (text: string) => {
    return text.split('\n').map((paragraph, index) => {
      if (!paragraph.trim()) return <br key={index} />;
      return (
        <p key={index} className="mb-4 text-gray-200 leading-relaxed text-lg">
          {paragraph}
        </p>
      );
    });
  };

  const shareToWhatsApp = () => {
    // Share via smart router API that auto-redirects based on login status:
    // - Team users → /team/news/[id]
    // - Public users → /news/[id]
    const baseUrl = window.location.origin;
    const smartUrl = `${baseUrl}/api/news/share/${news.id}`;
    
    const text = `*${title}*\n\nRead more at: ${smartUrl}`;
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      <Link 
        href={backUrl}
        className="inline-flex items-center text-sm font-bold text-gray-400 hover:text-white transition-colors mb-8 group"
      >
        <span className="mr-2 transform group-hover:-translate-x-1 transition-transform">←</span>
        Back to News
      </Link>

      <article className="bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        {/* Header Image */}
        <div className="relative w-full bg-black/50">
          {news.image_url ? (
            <div className="relative w-full">
              <Image
                src={news.image_url}
                alt={title}
                width={1200}
                height={630}
                className="w-full h-auto object-contain max-h-[600px]"
                priority
              />
            </div>
          ) : (
            <div className="w-full h-[400px] bg-gradient-to-br from-[#E8A800]/20 to-[#FFB347]/20 flex items-center justify-center">
              <span className="text-8xl">{toneEmoji}</span>
            </div>
          )}
          
          {/* Share Button - Positioned over image */}
          <div className="absolute bottom-6 right-6">
            <button 
              onClick={shareToWhatsApp}
              className="bg-[#25D366] hover:bg-[#128C7E] text-white p-3 rounded-full shadow-lg transition-transform hover:scale-110 flex items-center justify-center gap-2"
              title="Share to WhatsApp"
            >
              <FaWhatsapp size={24} />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-8 md:p-12">
          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400 mb-6 font-bold">
            <div className="flex items-center gap-2">
              <span>{toneEmoji}</span>
              <time dateTime={new Date(news.created_at).toISOString()}>
                {formatDistanceToNow(new Date(news.created_at), { addSuffix: true })}
              </time>
            </div>
            {reporter && (
              <>
                <span className="text-gray-600">•</span>
                <span className="text-[#E8A800] uppercase tracking-wider">
                  Reported by {reporter}
                </span>
              </>
            )}
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-black mb-8 text-white leading-tight">
            {title}
          </h1>

          {/* Article Body */}
          <div className="prose prose-invert max-w-none">
            {renderContent(content)}
          </div>
        </div>
      </article>
    </main>
  );
}
