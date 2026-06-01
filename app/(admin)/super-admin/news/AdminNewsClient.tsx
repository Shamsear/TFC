'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface NewsItem {
  id: string;
  title_en: string;
  title_ml?: string | null;
  content_en: string;
  content_ml?: string | null;
  summary_en?: string | null;
  summary_ml?: string | null;
  category: string;
  event_type: string;
  is_published: boolean;
  created_at: Date;
  tone?: string | null;
  generated_by: string;
}

type FilterStatus = 'all' | 'drafts' | 'published';

export default function AdminNewsClient() {
  const router = useRouter();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>('drafts');

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/news?include_drafts=true');
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

  const togglePublish = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/news/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_published: !currentStatus }),
      });

      if (response.ok) {
        await fetchNews();
      }
    } catch (error) {
      console.error('Failed to toggle publish:', error);
    }
  };

  const deleteNews = async (id: string) => {
    if (!confirm('Are you sure you want to delete this news?')) return;

    try {
      const response = await fetch(`/api/news/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchNews();
      }
    } catch (error) {
      console.error('Failed to delete news:', error);
    }
  };

  const filteredNews = news.filter((item) => {
    if (filter === 'drafts') return !item.is_published;
    if (filter === 'published') return item.is_published;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-white mb-2">
            📰 News Management
          </h1>
          <p className="text-sm text-[#7A7367] font-medium">
            Review and manage news articles
          </p>
        </div>
        <a
          href="/news"
          target="_blank"
          rel="noopener noreferrer"
          className="px-5 py-2.5 bg-[#E8A800] hover:bg-[#FFC93A] text-[#0a0a0a] rounded-lg font-bold transition-all hover:scale-105 text-sm"
        >
          View Public Page →
        </a>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setFilter('drafts')}
          className={`px-4 py-2 rounded-lg font-bold transition-all text-sm ${
            filter === 'drafts'
              ? 'bg-yellow-600 text-white'
              : 'bg-white/[0.02] border border-white/10 text-[#7A7367] hover:text-white'
          }`}
        >
          📝 Drafts ({news.filter(n => !n.is_published).length})
        </button>
        <button
          onClick={() => setFilter('published')}
          className={`px-4 py-2 rounded-lg font-bold transition-all text-sm ${
            filter === 'published'
              ? 'bg-green-600 text-white'
              : 'bg-white/[0.02] border border-white/10 text-[#7A7367] hover:text-white'
          }`}
        >
          ✅ Published ({news.filter(n => n.is_published).length})
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg font-bold transition-all text-sm ${
            filter === 'all'
              ? 'bg-[#E8A800] text-[#0a0a0a]'
              : 'bg-white/[0.02] border border-white/10 text-[#7A7367] hover:text-white'
          }`}
        >
          📋 All ({news.length})
        </button>
      </div>

      {/* News List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#E8A800]"></div>
        </div>
      ) : filteredNews.length === 0 ? (
        <div className="text-center py-12 bg-white/[0.02] border border-white/10 rounded-xl">
          <p className="text-xl text-[#7A7367]">
            No {filter === 'all' ? '' : filter} news found.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredNews.map((item) => (
            <div
              key={item.id}
              className="bg-white/[0.02] border border-white/10 rounded-xl p-6 hover:border-white/20 transition-all"
            >
              <div className="flex flex-col lg:flex-row justify-between items-start gap-4 mb-4">
                <div className="flex-1 w-full">
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <span className={`px-2 py-1 rounded text-xs font-black uppercase ${
                      item.is_published
                        ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                        : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                    }`}>
                      {item.is_published ? 'PUBLISHED' : 'DRAFT'}
                    </span>
                    <span className="px-2 py-1 rounded text-xs font-black uppercase bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      {item.category}
                    </span>
                    <span className="px-2 py-1 rounded text-xs font-black uppercase bg-gray-500/20 text-gray-300 border border-gray-500/30">
                      {item.event_type}
                    </span>
                    {item.tone && (
                      <span className="px-2 py-1 rounded text-xs font-black uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        {item.tone}
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl font-black text-white mb-2">
                    🇬🇧 {item.title_en}
                  </h3>
                  {item.title_ml && (
                    <h3 className="text-xl font-black text-white mb-2">
                      🇮🇳 {item.title_ml}
                    </h3>
                  )}
                  {item.summary_en && (
                    <p className="text-sm text-[#7A7367] mb-2">
                      {item.summary_en}
                    </p>
                  )}
                  <p className="text-xs text-[#7A7367]">
                    Generated by: {item.generated_by} • {new Date(item.created_at).toLocaleString()}
                  </p>
                </div>

                <div className="flex gap-2 w-full lg:w-auto">
                  <button
                    onClick={() => togglePublish(item.id, item.is_published)}
                    className={`flex-1 lg:flex-none px-4 py-2 rounded-lg font-bold transition-all text-sm ${
                      item.is_published
                        ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                  >
                    {item.is_published ? 'Unpublish' : 'Publish'}
                  </button>
                  <button
                    onClick={() => deleteNews(item.id)}
                    className="flex-1 lg:flex-none px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition-all text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {/* Content Preview */}
              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-[#E8A800] hover:text-[#FFC93A] font-bold">
                  View full content
                </summary>
                <div className="mt-4 p-4 bg-black/20 border border-white/5 rounded-lg">
                  <div className="mb-4">
                    <h4 className="font-black mb-2 text-white">🇬🇧 English:</h4>
                    <p className="text-sm whitespace-pre-wrap text-[#7A7367]">{item.content_en}</p>
                  </div>
                  {item.content_ml && (
                    <div>
                      <h4 className="font-black mb-2 text-white">🇮🇳 Malayalam:</h4>
                      <p className="text-sm whitespace-pre-wrap text-[#7A7367]">{item.content_ml}</p>
                    </div>
                  )}
                </div>
              </details>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
