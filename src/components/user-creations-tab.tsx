'use client';

import { useState, useEffect } from 'react';
import { librarySearchCache } from '@/lib/services/secondary-cache-service';
import { requestDeduplication } from '@/lib/services/request-deduplication';
import { Loader2, Music2 } from 'lucide-react';
import type { Song, TopRatedSong } from '@/lib/types';
import SongCard from './song-card';

interface UserCreationsTabProps {
  userId: string | null;
}

export default function UserCreationsTab({ userId }: UserCreationsTabProps) {
  const [creations, setCreations] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedSongId, setExpandedSongId] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      setCreations([]);
      return;
    }

    const fetchCreations = async () => {
      setIsLoading(true);
      try {
        const creationsParams = new URLSearchParams({
          creatorId: userId,
          sortBy: 'interactionCount',
          sortDirection: 'desc',
          limit: '100',
        });

        const cacheKey = `user-creations-${creationsParams.toString()}`;

        // Check cache first
        const cachedData = librarySearchCache.get<Song[]>(cacheKey);
        if (cachedData) {
          setCreations(cachedData);
          setIsLoading(false);
          return;
        }

        // Use request deduplication for API calls
        const data = await requestDeduplication.execute(
          cacheKey,
          async (signal) => {
            const response = await fetch(
              `/api/library/search?${creationsParams.toString()}`,
              { signal }
            );
            if (!response.ok) {
              throw new Error('Failed to fetch creations.');
            }
            return response.json() as Promise<Song[]>;
          },
          { enableAbort: true, timeout: 15000 }
        );

        // Cache the successful response
        librarySearchCache.set(cacheKey, data);
        setCreations(data);
      } catch (error) {
        // Handle aborted requests gracefully
        if (error instanceof Error && error.name === 'AbortError') {
          console.debug('[UserCreationsTab] Request was cancelled');
          return;
        }

        console.error('Error fetching creations:', error);
        setCreations([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCreations();
  }, [userId]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (creations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center gap-4 py-16 text-muted-foreground">
        <Music2 className="h-16 w-16" />
        <h3 className="text-xl font-semibold">No Creations Found</h3>
        <p className="max-w-xs">
          This user hasn&apos;t shared any music on the radio yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 -mx-6">
      {creations.map((song) => (
        <SongCard
          key={song.songId}
          song={song as TopRatedSong}
          isExpanded={expandedSongId === song.songId}
          onExpand={() =>
            setExpandedSongId((prev) =>
              prev === song.songId ? null : song.songId
            )
          }
        />
      ))}
    </div>
  );
}
