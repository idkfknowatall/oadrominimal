/**
 * @fileoverview Loading skeleton components for better perceived performance
 */

import { Card, CardContent } from '@/components/ui/card';

export function AudioPlayerSkeleton() {
  return (
    <Card className="w-full max-w-md mx-auto bg-card/95 backdrop-blur-sm border-border/50 shadow-2xl">
      <CardContent className="p-6">
        {/* Album Art Skeleton */}
        <div className="relative mb-4 group mx-auto w-48">
          <div className="aspect-square rounded-lg overflow-hidden bg-muted/50 border border-border/30">
            <div className="w-full h-full bg-gradient-to-br from-muted/30 to-muted/60 animate-pulse" />
          </div>
        </div>

        {/* Song Info Skeleton */}
        <div className="text-center mb-6 space-y-2">
          <div className="h-6 bg-gradient-to-r from-muted/40 to-muted/60 rounded animate-pulse mx-auto w-3/4" />
          <div className="h-4 bg-gradient-to-r from-muted/30 to-muted/50 rounded animate-pulse mx-auto w-1/2" />
        </div>

        {/* Timeline Skeleton */}
        <div className="mb-6">
          <div className="h-2 bg-gradient-to-r from-muted/30 to-muted/50 rounded-full animate-pulse" />
        </div>

        {/* Controls Skeleton */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex-1 flex justify-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/30 to-primary/50 animate-pulse" />
          </div>
        </div>

        {/* Volume Control Skeleton */}
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 bg-muted/40 rounded animate-pulse" />
          <div className="flex-1 h-2 bg-gradient-to-r from-muted/30 to-muted/50 rounded-full animate-pulse" />
          <div className="w-5 h-5 bg-muted/40 rounded animate-pulse" />
        </div>

        {/* Discord Link Skeleton */}
        <div className="mt-6">
          <div className="h-16 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-lg animate-pulse" />
        </div>
      </CardContent>
    </Card>
  );
}

export function HeaderSkeleton() {
  return (
    <header className="bg-background/95 backdrop-blur-sm border-b border-border/50 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="h-6 bg-gradient-to-r from-muted/40 to-muted/60 rounded animate-pulse w-32" />
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-muted/40 rounded animate-pulse" />
            <div className="w-8 h-8 bg-muted/40 rounded animate-pulse" />
          </div>
        </div>
      </div>
    </header>
  );
}

export function NowPlayingInfoSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 bg-gradient-to-br from-muted/30 to-muted/60 rounded-lg animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gradient-to-r from-muted/40 to-muted/60 rounded animate-pulse w-3/4" />
          <div className="h-3 bg-gradient-to-r from-muted/30 to-muted/50 rounded animate-pulse w-1/2" />
        </div>
      </div>
    </div>
  );
}

export function ListenerCountSkeleton() {
  return (
    <div className="flex items-center gap-2">
      <div className="w-4 h-4 bg-muted/40 rounded-full animate-pulse" />
      <div className="h-4 bg-gradient-to-r from-muted/30 to-muted/50 rounded animate-pulse w-16" />
    </div>
  );
}

// Shimmer effect for better visual feedback
export function ShimmerWrapper({ children, isLoading }: { children: React.ReactNode; isLoading: boolean }) {
  if (!isLoading) return <>{children}</>;

  return (
    <div className="relative overflow-hidden">
      {children}
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </div>
  );
}