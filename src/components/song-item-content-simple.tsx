'use client';

import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { ListMusic, Music2 } from 'lucide-react';
import type { Song } from '@/lib/types';
import OnDemandLinks from './on-demand-links';
import { Badge } from './ui/badge';

interface SongItemContentProps {
  song: Song;
  showPlaylist?: boolean;
}

export default function SongItemContent({
  song,
  showPlaylist = true,
}: SongItemContentProps) {
  return (
    <div className="flex flex-1 min-w-0 items-center gap-3">
      <div className="relative flex-shrink-0 w-12 h-12">
        {song.albumArt ? (
          <Image
            src={song.albumArt}
            alt={`Album art for ${song.title}`}
            fill
            sizes="48px"
            className="rounded-md aspect-square object-cover"
          />
        ) : (
          <div className="w-full h-full rounded-md bg-muted flex items-center justify-center">
            <Music2 className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/20 rounded-md ring-1 ring-inset ring-white/10"></div>
      </div>

      <div className="flex-1 overflow-hidden min-w-0">
        <p className="font-semibold text-sm whitespace-normal break-words">
          {song.title}
        </p>
        <div className="text-xs text-muted-foreground whitespace-normal break-words">
          <span>{song.artist}</span>
        </div>
        
        {/* On-demand platform links */}
        <OnDemandLinks onDemand={song.onDemand} />

        {song.played_at && (
          <p className="text-xs text-muted-foreground mt-0.5">
            Last played{' '}
            {formatDistanceToNow(new Date(song.played_at * 1000), {
              addSuffix: true,
            })}
          </p>
        )}
        
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          {showPlaylist &&
            song.playlists &&
            (song.playlists as string[]).length > 0 &&
            (song.playlists as string[])
              .slice()
              .reverse()
              .map((playlistName: string) => (
                <Badge
                  key={playlistName}
                  variant="secondary"
                  className="gap-1.5 cursor-default"
                >
                  <ListMusic className="h-3 w-3" />
                  <span className="font-medium">{playlistName}</span>
                </Badge>
              ))}
        </div>
      </div>
    </div>
  );
}