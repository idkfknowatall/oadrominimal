'use client';

import { useState, useEffect } from 'react';
import { Search, Music, ChevronLeft, ChevronRight, ExternalLink, User, RefreshCw, Send, CheckCircle, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useFilteredRequests, useRequestSubmission, useRequestSearch } from '@/hooks/use-requests';
import { cleanGenreString, extractPlatformLinks, getCreatorInfo, getSongDisplayText } from '@/lib/request-types';
import type { RequestableSong } from '@/lib/request-types';

interface SongCardProps {
  song: RequestableSong;
  onRequest: (requestUrl: string) => void;
  isRequesting: boolean;
}

function SongCard({ song, onRequest, isRequesting }: SongCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="group relative overflow-hidden rounded-lg border bg-card hover:shadow-md transition-all duration-200"
    >
      <div className="p-4">
        <div className="flex items-center gap-4">
          {/* Album Art */}
          <div className="shrink-0">
            <div className="w-12 h-12 rounded-md overflow-hidden bg-muted">
              {song.song.art ? (
                <img
                  src={song.song.art}
                  alt={`${song.song.title} album art`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Music className="w-4 h-4 text-muted-foreground" />
                </div>
              )}
            </div>
          </div>

          {/* Song Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground mb-1 line-clamp-1">
              {song.song.title}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-1">
              by {song.song.artist}
            </p>
          </div>

          {/* Request Button */}
          <div className="shrink-0">
            <Button
              onClick={() => onRequest(song.request_url)}
              disabled={isRequesting}
              size="sm"
              className="min-w-[80px]"
            >
              {isRequesting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4 mr-1" />
                  Request
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function RequestSearch({ onSearchChange, isLoading }: {
  onSearchChange: (search: string) => void;
  isLoading: boolean;
}) {
  const { searchTerm, setSearchTerm, debouncedSearchTerm } = useRequestSearch();

  // Update parent component when debounced search term changes
  useEffect(() => {
    onSearchChange(debouncedSearchTerm);
  }, [debouncedSearchTerm]); // Remove onSearchChange from dependencies to prevent infinite loop

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="w-5 h-5" />
          Search Songs
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by song title, artist name, or both..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 text-base"
            disabled={isLoading}
          />
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Type any part of the song title or artist name to find what you're looking for
        </p>
      </CardContent>
    </Card>
  );
}

function RequestStatus({ submission, onClear }: {
  submission: any;
  onClear: () => void;
}) {
  if (!submission) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="mb-6"
    >
      <Card className={submission.success ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20' : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20'}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            {submission.success ? (
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            )}
            <div className="flex-1">
              <p className={`font-medium ${submission.success ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>
                {submission.success ? 'Request Submitted!' : 'Request Failed'}
              </p>
              <p className={`text-sm ${submission.success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {submission.message}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="shrink-0"
            >
              ×
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function RequestsView() {
  const {
    songs,
    totalPages,
    currentPage,
    hasNext,
    hasPrev,
    totalFiltered,
    totalCount,
    filters,
    updateFilters,
    goToPage,
    nextPage,
    prevPage,
    isLoading,
    error,
    refresh,
  } = useFilteredRequests(12);

  const { submitRequest, isSubmitting, lastSubmission, clearLastSubmission } = useRequestSubmission();

  const handleRequest = async (requestUrl: string) => {
    await submitRequest(requestUrl);
  };

  if (error) {
    return (
      <div className="w-full max-w-6xl mx-auto p-4">
        <Card>
          <CardContent className="p-8 text-center">
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Failed to Load Songs</h2>
            <p className="text-muted-foreground mb-4">
              Unable to fetch the song request list. Please try again.
            </p>
            <Button onClick={refresh}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Request a Song</h1>
        <p className="text-muted-foreground">
          Browse our music library and request your favorite songs to be played on the radio
        </p>
      </div>

      {/* Request Status */}
      <AnimatePresence>
        {lastSubmission && (
          <RequestStatus
            submission={lastSubmission}
            onClear={clearLastSubmission}
          />
        )}
      </AnimatePresence>

      {/* Search */}
      <RequestSearch
        onSearchChange={(search) => updateFilters({ search })}
        isLoading={isLoading}
      />

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {isLoading ? (
            'Loading songs...'
          ) : (
            `Showing ${totalFiltered} of ${totalCount} songs`
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={refresh}
          disabled={isLoading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Songs Grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <Skeleton className="w-16 h-16 rounded-md" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <div className="flex gap-2">
                      <Skeleton className="h-5 w-16" />
                      <Skeleton className="h-5 w-20" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : songs.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {songs.map((song) => (
              <SongCard
                key={song.request_id}
                song={song}
                onRequest={handleRequest}
                isRequesting={isSubmitting}
              />
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <Music className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Songs Found</h2>
            <p className="text-muted-foreground">
              Try adjusting your search or filter criteria
            </p>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={prevPage}
            disabled={!hasPrev || isLoading}
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const page = i + Math.max(1, currentPage - 2);
              if (page > totalPages) return null;
              
              return (
                <Button
                  key={page}
                  variant={page === currentPage ? "default" : "outline"}
                  size="sm"
                  onClick={() => goToPage(page)}
                  disabled={isLoading}
                  className="w-10"
                >
                  {page}
                </Button>
              );
            })}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={nextPage}
            disabled={!hasNext || isLoading}
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}