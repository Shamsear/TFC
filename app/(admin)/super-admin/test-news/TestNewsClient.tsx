'use client';

import { useState } from 'react';
import Link from 'next/link';

interface TestEvent {
  name: string;
  event_type: string;
  category: string;
  metadata: any;
}

const testEvents: TestEvent[] = [
  {
    name: 'Match Completed',
    event_type: 'match_completed',
    category: 'match',
    metadata: {
      tournament_name: 'Premier League',
      home_team: 'Manchester United',
      away_team: 'Liverpool',
      home_score: 3,
      away_score: 2,
      venue: 'Old Trafford',
    },
  },
  {
    name: 'Thrashing Victory',
    event_type: 'match_completed_thrashing',
    category: 'match',
    metadata: {
      tournament_name: 'Champions League',
      home_team: 'Barcelona',
      away_team: 'Real Madrid',
      home_score: 5,
      away_score: 0,
      venue: 'Camp Nou',
    },
  },
  {
    name: 'Tournament Created',
    event_type: 'tournament_created',
    category: 'tournament',
    metadata: {
      tournament_name: 'Summer Cup 2026',
      format: 'League',
      teams_count: 8,
    },
  },
  {
    name: 'Season Created',
    event_type: 'season_created',
    category: 'season',
    metadata: {
      season_name: 'Season 2026',
      teams_count: 10,
      start_date: '2026-06-01',
    },
  },
  {
    name: 'Auction Round Completed',
    event_type: 'auction_round_completed',
    category: 'auction',
    metadata: {
      round_number: 5,
      players_sold: 12,
      total_spent: 15000,
      highest_bid: 2500,
      highest_bid_player: 'Cristiano Ronaldo',
    },
  },
  {
    name: 'Transfer Request Approved',
    event_type: 'release_request_approved',
    category: 'transfer',
    metadata: {
      player_name: 'Lionel Messi',
      from_team: 'PSG',
      release_fee: 1000,
    },
  },
  {
    name: 'Badge Unlocked',
    event_type: 'badge_unlocked',
    category: 'achievement',
    metadata: {
      team_name: 'Chelsea FC',
      badge_name: 'Hat-trick Hero',
      badge_description: 'Score 3 goals in a single match',
    },
  },
  {
    name: 'Team Level Up',
    event_type: 'team_level_up',
    category: 'achievement',
    metadata: {
      team_name: 'Arsenal',
      new_level: 5,
      xp_earned: 500,
    },
  },
];

export default function TestNewsClient() {
  const [loading, setLoading] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const testGeneration = async (event: TestEvent) => {
    setLoading(event.event_type);
    setResult(null);
    setError(null);

    try {
      const response = await fetch('/api/news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          generate_with_ai: true,
          generation_input: {
            event_type: event.event_type,
            category: event.category,
            season_id: 'TEST-SEASON',
            season_name: 'Test Season 2026',
            metadata: event.metadata,
          },
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
      } else {
        setError(data.error || 'Failed to generate news');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-black text-white mb-2">
          🧪 Test News Generation
        </h1>
        <p className="text-sm text-[#7A7367] font-medium mb-4">
          Test AI news generation with various event types
        </p>
        <div className="flex gap-3">
          <Link
            href="/super-admin/news"
            className="px-4 py-2 bg-[#E8A800] hover:bg-[#FFC93A] text-[#0a0a0a] rounded-lg font-bold transition-all text-sm"
          >
            ← Back to News Management
          </Link>
          <Link
            href="/news"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-white/[0.02] border border-white/10 text-white hover:border-white/20 rounded-lg font-bold transition-all text-sm"
          >
            View Public Page →
          </Link>
        </div>
      </div>

      {/* Test Buttons Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {testEvents.map((event) => (
          <button
            key={event.event_type}
            onClick={() => testGeneration(event)}
            disabled={loading !== null}
            className={`p-4 rounded-xl border transition-all text-left ${
              loading === event.event_type
                ? 'bg-[#E8A800]/20 border-[#E8A800] cursor-wait'
                : 'bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.04]'
            }`}
          >
            <div className="text-sm font-black text-white mb-1">{event.name}</div>
            <div className="text-xs text-[#7A7367] font-mono">{event.event_type}</div>
            <div className="text-xs text-[#7A7367] mt-2">
              Category: <span className="text-[#E8A800]">{event.category}</span>
            </div>
            {loading === event.event_type && (
              <div className="mt-2 text-xs text-[#E8A800] font-bold">Generating...</div>
            )}
          </button>
        ))}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-8 p-4 bg-red-500/20 border border-red-500/30 rounded-xl">
          <h3 className="text-lg font-black text-red-300 mb-2">❌ Error</h3>
          <p className="text-sm text-red-200">{error}</p>
        </div>
      )}

      {/* Result Display */}
      {result && (
        <div className="space-y-6">
          <div className="p-6 bg-white/[0.02] border border-white/10 rounded-xl">
            <h3 className="text-xl font-black text-white mb-4">✅ News Generated Successfully</h3>
            
            {/* English Version */}
            <div className="mb-6">
              <h4 className="text-lg font-black text-white mb-3 flex items-center gap-2">
                🇬🇧 English Version
              </h4>
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-[#7A7367] font-bold mb-1">Title:</div>
                  <div className="text-base font-bold text-white">{result.news.en.title}</div>
                </div>
                <div>
                  <div className="text-xs text-[#7A7367] font-bold mb-1">Summary:</div>
                  <div className="text-sm text-gray-300">{result.news.en.summary}</div>
                </div>
                <div>
                  <div className="text-xs text-[#7A7367] font-bold mb-1">Content:</div>
                  <div className="text-sm text-gray-300 whitespace-pre-wrap">{result.news.en.content}</div>
                </div>
                <div>
                  <div className="text-xs text-[#7A7367] font-bold mb-1">Reporter:</div>
                  <div className="text-sm text-gray-300 italic">— {result.news.en.reporter}</div>
                </div>
                <div>
                  <div className="text-xs text-[#7A7367] font-bold mb-1">Tone:</div>
                  <div className="text-sm text-[#E8A800] font-bold uppercase">{result.news.en.tone}</div>
                </div>
              </div>
            </div>

            {/* Malayalam Version */}
            <div>
              <h4 className="text-lg font-black text-white mb-3 flex items-center gap-2">
                🇮🇳 Malayalam Version
              </h4>
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-[#7A7367] font-bold mb-1">Title:</div>
                  <div className="text-base font-bold text-white">{result.news.ml.title}</div>
                </div>
                <div>
                  <div className="text-xs text-[#7A7367] font-bold mb-1">Summary:</div>
                  <div className="text-sm text-gray-300">{result.news.ml.summary}</div>
                </div>
                <div>
                  <div className="text-xs text-[#7A7367] font-bold mb-1">Content:</div>
                  <div className="text-sm text-gray-300 whitespace-pre-wrap">{result.news.ml.content}</div>
                </div>
                <div>
                  <div className="text-xs text-[#7A7367] font-bold mb-1">Reporter:</div>
                  <div className="text-sm text-gray-300 italic">— {result.news.ml.reporter}</div>
                </div>
              </div>
            </div>

            {/* Metadata */}
            <div className="mt-6 pt-6 border-t border-white/10">
              <div className="text-xs text-[#7A7367] font-bold mb-2">News ID:</div>
              <div className="text-sm text-gray-300 font-mono">{result.news_id}</div>
              <div className="text-xs text-[#7A7367] mt-3">
                ✅ News saved as draft. Go to News Management to publish it.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
