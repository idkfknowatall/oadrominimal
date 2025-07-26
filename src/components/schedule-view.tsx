'use client';

import { useState } from 'react';
import { Clock, Calendar, Music, ChevronRight, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrentSchedule, useUpcomingSchedule } from '@/hooks/use-schedule';
import { 
  formatScheduleTime, 
  formatScheduleDate, 
  getScheduleDuration, 
  getTimeUntilNext, 
  simplifyPlaylistName 
} from '@/lib/schedule-types';
import type { ScheduleEntry } from '@/lib/schedule-types';

interface ScheduleCardProps {
  entry: ScheduleEntry;
  isCurrent?: boolean;
  isNext?: boolean;
  showDate?: boolean;
}

function ScheduleCard({ entry, isCurrent = false, isNext = false, showDate = true }: ScheduleCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`relative overflow-hidden rounded-lg border transition-all duration-200 ${
        isCurrent 
          ? 'border-primary bg-primary/5 shadow-lg ring-2 ring-primary/20' 
          : isNext
          ? 'border-orange-200 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-950/20'
          : 'border-border bg-card hover:shadow-md'
      }`}
    >
      {isCurrent && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary/80 to-primary animate-pulse" />
      )}
      
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              {isCurrent && (
                <Badge variant="default" className="text-xs font-medium">
                  <div className="w-2 h-2 bg-current rounded-full mr-1 animate-pulse" />
                  LIVE NOW
                </Badge>
              )}
              {isNext && (
                <Badge variant="secondary" className="text-xs font-medium">
                  UP NEXT
                </Badge>
              )}
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="w-3 h-3" />
                {formatScheduleTime(entry.start_timestamp)}
                {showDate && (
                  <>
                    <span className="mx-1">•</span>
                    <Calendar className="w-3 h-3" />
                    {formatScheduleDate(entry.start_timestamp)}
                  </>
                )}
              </div>
            </div>
            
            <h3 className="font-semibold text-foreground mb-1 line-clamp-2">
              {simplifyPlaylistName(entry.title)}
            </h3>
            
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Music className="w-3 h-3" />
                {getScheduleDuration(entry)}
              </div>
              {!isCurrent && (
                <div className="text-xs">
                  {getTimeUntilNext(entry)}
                </div>
              )}
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="shrink-0"
          >
            <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
          </Button>
        </div>
        
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-3 pt-3 border-t border-border/50"
            >
              <p className="text-sm text-muted-foreground leading-relaxed">
                {entry.description}
              </p>
              <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                <span>Starts: {new Date(entry.start_timestamp * 1000).toLocaleString()}</span>
                <span>Ends: {new Date(entry.end_timestamp * 1000).toLocaleString()}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function CurrentScheduleSection() {
  const { currentEntry, nextEntry, timeRemaining, isLoading, error, refresh } = useCurrentSchedule();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Current Schedule
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Current Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">Failed to load schedule</p>
            <Button onClick={refresh} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Current Schedule
          </CardTitle>
          <Button onClick={refresh} variant="ghost" size="sm">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {currentEntry ? (
          <>
            <ScheduleCard entry={currentEntry} isCurrent={true} showDate={false} />
            {timeRemaining > 0 && (
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Time remaining</div>
                <div className="text-2xl font-mono font-bold text-primary">
                  {Math.floor(timeRemaining / 3600)}:{String(Math.floor((timeRemaining % 3600) / 60)).padStart(2, '0')}:{String(Math.floor(timeRemaining % 60)).padStart(2, '0')}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No current schedule information available
          </div>
        )}
        
        {nextEntry && (
          <ScheduleCard entry={nextEntry} isNext={true} showDate={false} />
        )}
      </CardContent>
    </Card>
  );
}

function UpcomingScheduleSection() {
  const { upcomingEntries, isLoading, error, refresh } = useUpcomingSchedule();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Upcoming Shows
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Upcoming Shows
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">Failed to load upcoming shows</p>
            <Button onClick={refresh} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Upcoming Shows
          </CardTitle>
          <Button onClick={refresh} variant="ghost" size="sm">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {upcomingEntries.length > 0 ? (
          <div className="space-y-3">
            <AnimatePresence>
              {upcomingEntries.map((entry) => (
                <ScheduleCard key={entry.id} entry={entry} />
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No upcoming shows scheduled
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ScheduleView() {
  return (
    <div className="w-full max-w-4xl mx-auto p-4 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Radio Schedule</h1>
        <p className="text-muted-foreground">
          Stay tuned with our programming schedule and never miss your favorite shows
        </p>
      </div>
      
      <div className="grid gap-6 lg:grid-cols-2">
        <CurrentScheduleSection />
        <UpcomingScheduleSection />
      </div>
    </div>
  );
}