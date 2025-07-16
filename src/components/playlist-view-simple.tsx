'use client';

import { useMemo, memo, useCallback } from 'react';
import Image from 'next/image';
import { Music2, Clock, AlertCircle } from 'lucide-react';

import type { Song } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { formatDuration, cn } from '@/lib/utils';
import HelpTooltip from './help-tooltip';
import SongItemContent from './song-item-content-simple';

interface PlaylistViewProps {
  title: string;
  songs: Song[];
  helpContent?: React.ReactNode;
  maxItems?: number;
  showDuration?: boolean;
  isLoading?: boolean;
  error?: string | null;
}

// Enhanced UpNext song item with better error handling and performance
const UpNextSongItem = memo(({ song, showDuration = true }: { song: Song; showDuration?: boolean }) => {
  const handleImageError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    console.warn(`[PlaylistView] Failed to load album art for ${song.title}`);
    // Image will fallback to the fallback div automatically
  }, [song.title]);

  return (
    <div className="flex items-center gap-3 p-2 rounded-lg transition-colors hover:bg-white/5 group">
      <div className="relative flex-shrink-0 w-12 h-12">
        {song.albumArt ? (
          <Image
            src={song.albumArt}
            alt={`Album art for ${song.title}`}
            fill
            sizes="48px"
            className="rounded-md aspect-square object-cover transition-opacity group-hover:opacity-80"
            onError={handleImageError}
            loading="lazy"
            placeholder="blur"
            blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
          />
        ) : (
          <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center transition-colors group-hover:bg-muted/80">
            <Music2 className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
      </div>
      <div className="flex-1 overflow-hidden min-w-0">
        <p className="font-semibold truncate text-sm transition-colors group-hover:text-foreground">
          {song.title || 'Unknown Title'}
        </p>
        <p className="text-xs text-muted-foreground truncate transition-colors group-hover:text-muted-foreground/80">
          {song.artist || 'Unknown Artist'}
        </p>
      </div>
      {showDuration && song.duration && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{formatDuration(song.duration)}</span>
        </div>
      )}
    </div>
  );
});

UpNextSongItem.displayName = 'UpNextSongItem';

// Enhanced recently played item with better performance
const RecentlyPlayedItem = memo(({ song, index }: { song: Song; index: number }) => (
  <div
    key={`${song.id}-${index}`}
    className="rounded-lg transition-colors hover:bg-white/5"
  >
    <div className="p-3 sm:p-4 transition-colors">
      <SongItemContent song={song} showPlaylist={false} />
    </div>
  </div>
));

RecentlyPlayedItem.displayName = 'RecentlyPlayedItem';

// Loading skeleton component
const LoadingSkeleton = memo(() => (
  <div className="flex flex-col gap-1">
    {Array.from({ length: 3 }).map((_, index) => (
      <div key={index} className="flex items-center gap-3 p-2 rounded-lg animate-pulse">
        <div className="w-12 h-12 rounded-md bg-muted/50" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-muted/50 rounded w-3/4" />
          <div className="h-3 bg-muted/30 rounded w-1/2" />
        </div>
        <div className="h-3 bg-muted/30 rounded w-12" />
      </div>
    ))}
  </div>
));

LoadingSkeleton.displayName = 'LoadingSkeleton';

// Error state component
const ErrorState = memo(({ error, title }: { error: string; title: string }) => (
  <div className="flex flex-col items-center justify-center p-6 text-center">
    <AlertCircle className="h-8 w-8 text-destructive mb-2" />
    <p className="text-sm text-muted-foreground mb-1">
      Failed to load {title.toLowerCase()}
    </p>
    <p className="text-xs text-muted-foreground/70">
      {error}
    </p>
  </div>
));

ErrorState.displayName = 'ErrorState';

// Empty state component
const EmptyState = memo(({ title }: { title: string }) => (
  <div className="flex flex-col items-center justify-center p-6 text-center">
    <Music2 className="h-8 w-8 text-muted-foreground/50 mb-2" />
    <p className="text-sm text-muted-foreground">
      No {title.toLowerCase()} available
    </p>
  </div>
));

EmptyState.displayName = 'EmptyState';

export default function PlaylistView({
  title,
  songs,
  helpContent,
  maxItems = 10,
  showDuration = true,
  isLoading = false,
  error = null,
}: PlaylistViewProps) {
  // Memoize processed songs to avoid unnecessary re-renders
  const processedSongs = useMemo(() => {
    if (!songs || !Array.isArray(songs)) return [];
    
    return songs
      .filter(song => song && (song.id || song.songId)) // Filter out invalid songs
      .slice(0, maxItems) // Limit number of items for performance
      .map((song, index) => ({ ...song, index })); // Add index for keys
  }, [songs, maxItems]);

  // Memoize card classes
  const cardClasses = useMemo(() => cn(
    "w-full max-w-sm bg-black/20 backdrop-blur-sm border-white/10 shadow-xl rounded-lg lg:max-w-xs",
    "transition-all duration-200 hover:shadow-2xl hover:bg-black/25"
  ), []);

  const renderContent = useCallback(() => {
    if (isLoading) {
      return <LoadingSkeleton />;
    }

    if (error) {
      return <ErrorState error={error} title={title} />;
    }

    if (!processedSongs.length) {
      return <EmptyState title={title} />;
    }

    return (
      <div className="flex flex-col gap-1">
        {processedSongs.map((song) => {
          if (title === 'Recently Played') {
            return (
              <RecentlyPlayedItem
                key={`${song.id}-${song.index}`}
                song={song}
                index={song.index}
              />
            );
          } else {
            return (
              <UpNextSongItem
                key={song.songId || `${song.id}-${song.index}`}
                song={song}
                showDuration={showDuration}
              />
            );
          }
        })}
      </div>
    );
  }, [isLoading, error, processedSongs, title, showDuration]);

  return (
    <Card className={cardClasses}>
      <CardHeader className="p-3 flex-row items-center justify-center gap-2">
        <CardTitle className="text-lg font-headline font-medium text-center text-muted-foreground transition-colors hover:text-foreground">
          {title}
        </CardTitle>
        {helpContent && <HelpTooltip title={title}>{helpContent}</HelpTooltip>}
      </CardHeader>
      <CardContent className="p-2">
        {renderContent()}
      </CardContent>
    </Card>
  );
}