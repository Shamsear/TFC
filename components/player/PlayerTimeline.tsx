'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';

interface SeasonalStat {
  id: string;
  position: string;
  realWorldClub: string;
  overallRating: number;
  season: {
    id: string;
    name: string;
    createdAt: string;
  };
}

interface Transfer {
  id: string;
  soldPrice: number;
  season: {
    id: string;
    name: string;
    createdAt: string;
  };
  team: {
    id: string;
    name: string;
    logoUrl: string;
  };
}

interface PlayerTimelineProps {
  seasonalStats: SeasonalStat[];
  transferHistory: Transfer[];
}

interface TimelineEntry {
  seasonId: string;
  seasonName: string;
  position: string;
  club: string;
  rating: number;
  team?: {
    name: string;
    logoUrl: string;
  };
  price?: number;
}

export function PlayerTimeline({ seasonalStats, transferHistory }: PlayerTimelineProps) {
  // Merge seasonal stats with transfer history
  const timeline: TimelineEntry[] = seasonalStats.map((stat) => {
    const transfer = transferHistory.find((t) => t.season.id === stat.season.id);
    
    return {
      seasonId: stat.season.id,
      seasonName: stat.season.name,
      position: stat.position,
      club: stat.realWorldClub,
      rating: stat.overallRating,
      team: transfer ? {
        name: transfer.team.name,
        logoUrl: transfer.team.logoUrl,
      } : undefined,
      price: transfer?.soldPrice,
    };
  });

  if (timeline.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400 text-lg">No seasonal data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-fluid-2xl md:text-fluid-3xl font-bold mb-6">Season Timeline</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-fluid-md">
        {timeline.map((entry, index) => (
          <motion.div
            key={entry.seasonId}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="relative bg-gradient-to-br from-dark-100 to-zinc-950 rounded-lg p-fluid-md border border-white/10 shadow-offset-80"
          >
            {/* Season Badge */}
            <div className="absolute top-4 right-4 bg-neon-blue/20 text-neon-blue px-3 py-1 rounded-full text-fluid-xs font-semibold">
              {entry.seasonName}
            </div>

            {/* Stats Grid */}
            <div className="mt-8 space-y-4">
              {/* Position & Rating */}
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-gray-400 text-fluid-xs">Position</p>
                  <p className="text-fluid-xl font-bold text-white">{entry.position}</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-400 text-fluid-xs">Rating</p>
                  <p className="text-fluid-3xl font-bold text-neon-blue">{entry.rating}</p>
                </div>
              </div>

              {/* Club */}
              <div>
                <p className="text-gray-400 text-fluid-xs">Club</p>
                <p className="text-fluid-lg font-semibold text-white">{entry.club}</p>
              </div>

              {/* Team & Price (if sold) */}
              {entry.team && entry.price !== undefined && (
                <div className="pt-4 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-white/20">
                        <Image
                          src={entry.team.logoUrl}
                          alt={entry.team.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div>
                        <p className="text-gray-400 text-fluid-xs">Sold to</p>
                        <p className="text-fluid-sm font-semibold text-white">{entry.team.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-400 text-fluid-xs">Price</p>
                      <p className="text-fluid-lg font-bold text-neon-green">
                        ${entry.price.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Not Sold Badge */}
              {!entry.team && (
                <div className="pt-4 border-t border-white/10">
                  <p className="text-gray-500 text-fluid-sm italic text-center">Not sold this season</p>
                </div>
              )}
            </div>

            {/* Rating Evolution Indicator */}
            {index > 0 && (
              <div className="absolute -left-3 top-1/2 -translate-y-1/2">
                {entry.rating > timeline[index - 1].rating ? (
                  <div className="bg-neon-green text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow-neon-glow-green">
                    ↑
                  </div>
                ) : entry.rating < timeline[index - 1].rating ? (
                  <div className="bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                    ↓
                  </div>
                ) : (
                  <div className="bg-gray-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                    =
                  </div>
                )}
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
