'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { EnrichedComment, EnrichedReaction } from '@/lib/types';
import { useDebounce } from './use-debounce';

const INTERACTION_PAGE_SIZE = 10;

export function useUserActivity(userId: string | null) {
  const [comments, setComments] = useState<EnrichedComment[]>([]);
  const [reactions, setReactions] = useState<EnrichedReaction[]>([]);
  const [cursors, setCursors] = useState<{
    comments: string | null;
    reactions: string | null;
  }>({ comments: null, reactions: null });
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // This function is now stable and does not depend on the user object.
  const fetchInteractions = useCallback(
    async (
      currentCursors: typeof cursors,
      currentUserId: string,
      isInitialLoad = false
    ) => {
      if (isInitialLoad) {
        // Reset state for a new user or a refresh
        setComments([]);
        setReactions([]);
        setHasMore(true);
        setError(null);
      }

      const url = new URL('/api/user/interactions', window.location.origin);
      url.searchParams.set('userId', currentUserId);
      url.searchParams.set('limit', `${INTERACTION_PAGE_SIZE}`);

      if (currentCursors.comments)
        url.searchParams.set('commentsCursor', currentCursors.comments);
      if (currentCursors.reactions)
        url.searchParams.set('reactionsCursor', currentCursors.reactions);

      try {
        // The fetch is public and does not require an Authorization header.
        const response = await fetch(url.toString());
        if (!response.ok) {
          throw new Error('Failed to load user activity.');
        }
        const data = await response.json();

        setComments((prev) => {
          const existingIds = new Set(prev.map((c) => c.id));
          const newComments = data.comments.filter(
            (c: EnrichedComment) => !existingIds.has(c.id)
          );
          return isInitialLoad ? newComments : [...prev, ...newComments];
        });
        setReactions((prev) => {
          const existingIds = new Set(prev.map((r) => r.id));
          const newReactions = data.reactions.filter(
            (r: EnrichedReaction) => !existingIds.has(r.id)
          );
          return isInitialLoad ? newReactions : [...prev, ...newReactions];
        });

        const newCursors = {
          comments: data.nextCommentsCursor,
          reactions: data.nextReactionsCursor,
        };
        setCursors(newCursors);
        setHasMore(!!(newCursors.comments || newCursors.reactions));
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'An unknown error occurred';
        setError(errorMessage);
      }
    },
    [] // No dependencies, this function is stable.
  );

  const loadingRef = useRef(false);

  useEffect(() => {
    const loadInitialData = async () => {
      if (!userId) {
        setComments([]);
        setReactions([]);
        setHasMore(false);
        setIsLoading(false);
        loadingRef.current = false;
        return;
      }

      // Prevent concurrent fetches using ref
      if (loadingRef.current) return;

      loadingRef.current = true;
      setIsLoading(true);
      await fetchInteractions(
        { comments: null, reactions: null },
        userId,
        true
      );
      setIsLoading(false);
      loadingRef.current = false;
    };

    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]); // This effect runs only when the userId changes.

  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || !userId) return;

    setIsLoadingMore(true);
    await fetchInteractions(cursors, userId);
    setIsLoadingMore(false);
  }, [isLoadingMore, hasMore, userId, fetchInteractions, cursors]);

  const allInteractions = useMemo(() => {
    const typedComments = comments.map((c) => ({
      ...c,
      type: 'comment' as const,
    }));
    const typedReactions = reactions.map((r) => ({
      ...r,
      type: 'reaction' as const,
    }));

    return [...typedComments, ...typedReactions].sort(
      (a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)
    );
  }, [comments, reactions]);

  const filteredInteractions = useMemo(() => {
    const normalizedSearch = debouncedSearchTerm.toLowerCase();
    if (!normalizedSearch) return allInteractions;

    return allInteractions.filter((item) => {
      const titleMatch = item.song.title
        .toLowerCase()
        .includes(normalizedSearch);
      const artistMatch = item.song.artist
        .toLowerCase()
        .includes(normalizedSearch);
      if (item.type === 'comment') {
        const commentMatch = item.text.toLowerCase().includes(normalizedSearch);
        return titleMatch || artistMatch || commentMatch;
      }
      return titleMatch || artistMatch;
    });
  }, [allInteractions, debouncedSearchTerm]);

  const deleteLocalInteraction = useCallback(
    (type: 'comment' | 'reaction', id: string) => {
      if (type === 'comment') {
        setComments((prev) => prev.filter((c) => c.id !== id));
      } else {
        setReactions((prev) => prev.filter((r) => r.id !== id));
      }
    },
    []
  );

  return {
    comments,
    reactions,
    filteredInteractions,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    searchTerm,
    setSearchTerm,
    debouncedSearchTerm,
    handleLoadMore,
    deleteLocalInteraction,
  };
}
