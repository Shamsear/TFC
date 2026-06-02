'use client';

import { useState, useEffect } from 'react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import LanguageToggle from '@/components/news/LanguageToggle';
import NewsCard from '@/components/news/NewsCard';

interface NewsItem {
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
}

const categories = [
  { value: 'all', label: 'All News' },
  { value: 'season', label: 'Season' },
  { value: 'team', label: 'Team' },
  { value: 'auction', label: 'Auction' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'tournament', label: 'Tournament' },
  { value: 'match', label: 'Match' },
  { value: 'achievement', label: 'Achievement' },
  { value: 'admin', label: 'Admin' },
];

export default function TeamNewsClient() {
  return (
    <LanguageProvider>
      <TeamNewsContent />
    </LanguageProvider>
  );
}

function TeamNewsContent() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/news');
      if (response.ok) {
        const data = await response.json();
        setNews(data.news || []);
      }
    } catch (error) {
      console.error('Failed to fetch news:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredNews = selectedCategory === 'all'
    ? news
    : news.filter(item => item.category === selectedCategory);

  const featuredNews = filteredNews[0];
  const regularNews = filteredNews.slice(1);

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black text-white mb-2 bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent uppercase tracking-wider leading-none">
              📰 NEWS
            </h1>
            <p className="text-[10px] sm:text-xs font-black text-gray-500 uppercase tracking-widest font-mono">
              Latest updates from Turf Cats
            </p>
          </div>
          <LanguageToggle />
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              disabled={loading}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                selectedCategory === cat.value
                  ? 'bg-[#E8A800] text-[#0a0a0a] shadow-[0_0_15px_rgba(232,168,0,0.3)]'
                  : 'bg-white/[0.02] border border-white/10 text-gray-400 hover:text-white hover:border-white/20'
              } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white/[0.02] border border-white/10 rounded-xl overflow-hidden animate-pulse">
                <div className="h-48 bg-white/[0.03]" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-white/[0.03] rounded" />
                  <div className="h-4 bg-white/[0.03] rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredNews.length === 0 ? (
          <div className="text-center py-16 rounded-xl bg-white/[0.02] border border-white/10">
            <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
            <h2 className="text-xl font-black text-white mb-2">No News Yet</h2>
            <p className="text-gray-400 text-sm">Check back soon for updates!</p>
          </div>
        ) : (
          <>
            {/* Featured News */}
            {featuredNews && (
              <div className="mb-6">
                <NewsCard news={featuredNews} featured baseUrl="/team/news" />
              </div>
            )}

            {/* Regular News Grid */}
            {regularNews.length > 0 && (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {regularNews.map((item) => (
                  <NewsCard key={item.id} news={item} baseUrl="/team/news" />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
