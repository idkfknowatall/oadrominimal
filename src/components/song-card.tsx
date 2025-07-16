'use client';

import { AnimatePresence } from 'framer-motion';
import { Trophy } from 'lucide-react';

import type { TopRatedSong } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import SongTimelineDetail from '@/components/song-timeline-detail';
import SongItemContent from './song-item-content';

const getRankingColor = (rank: number) => {
  switch (rank) {
    case 0:
      return 'text-yellow-400'; // Gold
    case 1:
      return 'text-slate-400'; // Silver
    case 2:
      return 'text-yellow-600'; // Bronze
    default:
      return 'text-muted-foreground';
  }
};

interface SongCardProps {
  song: TopRatedSong;
  rank?: number;
  isExpanded: boolean;
  onExpand: () => void;
}

export default function SongCard({
  song,
  rank,
  isExpanded,
  onExpand,
}: SongCardProps) {
  const isTopRated = typeof rank === 'number';

  return (
    <Card
      className={cn(
        'bg-black/20 backdrop-blur-sm border-white/10 shadow-xl rounded-lg cursor-pointer transition-all duration-300',
        isExpanded
          ? 'ring-2 ring-primary shadow-primary/20'
          : 'hover:bg-white/5',
        isTopRated &&
          typeof rank === 'number' &&
          rank < 3 &&
          'border-yellow-400/20'
      )}
      onClick={onExpand}
    >
      <CardContent className="p-0">
        <div className="p-3 sm:p-4 flex items-center gap-3 sm:gap-4">
          {isTopRated ? (
            <div className="flex items-center gap-1 sm:gap-2 w-10 sm:w-16 flex-shrink-0">
              <Trophy
                className={cn(
                  'h-4 w-4 sm:h-6 sm:w-6',
                  getRankingColor(rank as number)
                )}
              />
              <span
                className={cn(
                  'text-lg sm:text-2xl font-bold',
                  getRankingColor(rank as number)
                )}
              >
                {(rank as number) + 1}
              </span>
            </div>
          ) : // No placeholder needed for non-ranked views like Library
          null}
          <SongItemContent song={song} />
        </div>
        <AnimatePresence>
          {isExpanded && (
            <SongTimelineDetail songId={song.songId} initialSongData={song} />
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
