'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Music2 } from 'lucide-react';

import type { Song } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { formatDuration, cn } from '@/lib/utils';
import HelpTooltip from './help-tooltip';
import SongItemContent from './song-item-content-simple';

interface PlaylistViewProps {
  title: string;
  songs: Song[];
  helpContent?: React.ReactNode;
}

// A simple component for the Up Next list items to ensure consistent component structure.
const UpNextSongItem = ({ song }: { song: Song }) => (
  <div className="flex items-center gap-3 p-2 rounded-lg">
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
        <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center">
          <Music2 className="h-6 w-6 text-muted-foreground" />
        </div>
      )}
    </div>
    <div className="flex-1 overflow-hidden">
      <p className="font-semibold truncate text-sm">{song.title}</p>
      <p className="text-xs text-muted-foreground truncate">{song.artist}</p>
    </div>
    <p className="text-xs text-muted-foreground">
      {formatDuration(song.duration)}
    </p>
  </div>
);

export default function PlaylistView({
  title,
  songs,
  helpContent,
}: PlaylistViewProps) {
  return (
    <Card className="w-full max-w-sm bg-black/20 backdrop-blur-sm border-white/10 shadow-xl rounded-lg lg:max-w-xs">
      <CardHeader className="p-3 flex-row items-center justify-center gap-2">
        <CardTitle className="text-lg font-headline font-medium text-center text-muted-foreground">
          {title}
        </CardTitle>
        {helpContent && <HelpTooltip title={title}>{helpContent}</HelpTooltip>}
      </CardHeader>
      <CardContent className="p-2">
        <div className="flex flex-col gap-1">
          {songs.map((song, index) => {
            if (!song) return null; // Defensive guard clause

            if (title === 'Recently Played') {
              // For recently played, show basic song info without interactions
              return (
                <div
                  key={`${song.id}-${index}`}
                  className="rounded-lg transition-colors hover:bg-white/5"
                >
                  <div className="p-3 sm:p-4 transition-colors">
                    <SongItemContent song={song} showPlaylist={false} />
                  </div>
                </div>
              );
            } else {
              // For "Up Next", songId is unique.
              return <UpNextSongItem key={song.songId} song={song} />;
            }
          })}
        </div>
      </CardContent>
    </Card>
  );
}