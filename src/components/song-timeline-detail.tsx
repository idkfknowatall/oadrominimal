'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Loader2,
  Users,
  Play,
  CalendarClock,
  BarChart2,
  ServerCrash,
} from 'lucide-react';
import { formatDuration } from '@/lib/utils';
import type {
  Comment,
  TopRatedSong,
  Reaction,
  UserInfo,
  Song,
} from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from './ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { formatDistanceToNow } from 'date-fns';
import { useRadio } from '@/contexts/radio-context';
import { ClickablePopover } from './clickable-popover';

interface ReactionGroupTooltipContentProps {
  reactions: Reaction[];
  songTimestamp: number;
}

const ReactionGroupTooltipContent = ({
  reactions,
  songTimestamp,
}: ReactionGroupTooltipContentProps) => (
  <div className="flex flex-col gap-2 p-1">
    <p className="px-1 text-xs text-muted-foreground">
      {reactions.length} reaction{reactions.length > 1 ? 's' : ''} at{' '}
      {formatDuration(songTimestamp)}
    </p>
    {reactions.map((reaction) => (
      <div key={reaction.id} className="flex items-center gap-2">
        <Avatar className="h-6 w-6">
          <AvatarImage
            src={reaction.user.avatar ?? ''}
            alt={reaction.user.name ?? 'User'}
          />
          <AvatarFallback>
            {reaction.user.name?.charAt(0).toUpperCase() ?? 'R'}
          </AvatarFallback>
        </Avatar>
        <span className="font-semibold">{reaction.user.name ?? 'Someone'}</span>
        <span className="text-lg">{reaction.emoji}</span>
      </div>
    ))}
    {reactions[0]?.createdAt && (
      <p className="text-xs text-muted-foreground/80 mt-1 px-1">
        {formatDistanceToNow(new Date(reactions[0].createdAt), {
          addSuffix: true,
        })}
      </p>
    )}
  </div>
);

export default function SongTimelineDetail({
  songId,
  initialSongData,
}: {
  songId: string;
  initialSongData?: Song;
}) {
  const {
    openUserProfile,
    liveSong,
    allComments: liveComments,
    allReactions: liveReactions,
  } = useRadio();

  const [staticData, setStaticData] = useState<{
    song: TopRatedSong;
    comments: Comment[];
    reactions: Reaction[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openPopoverIds, setOpenPopoverIds] = useState<Set<string>>(new Set());
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
  const [scanCompleted, setScanCompleted] = useState(false);
  const animationScheduledRef = useRef(false);
  const initialSongDataRef = useRef(initialSongData);

  const isLive = useMemo(
    () => liveSong?.songId === songId,
    [liveSong?.songId, songId]
  );

  useEffect(() => {
    // Reset all animation trackers whenever the song ID changes.
    animationScheduledRef.current = false;
    setPinnedIds(new Set());
    setOpenPopoverIds(new Set());
    setScanCompleted(false);
  }, [songId]);

  useEffect(() => {
    if (!songId || songId === 'initial') {
      setIsLoading(false);
      setError(null);
      setStaticData(null);
      return;
    }

    if (isLive) {
      setIsLoading(false);
      setError(null);
      setStaticData(null);
      return;
    }

    let isMounted = true;
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      setStaticData(null);

      try {
        const response = await fetch(`/api/song-details/${songId}`);
        if (!isMounted) return;
        if (!response.ok) {
          if (response.status === 404 && initialSongDataRef.current) {
            setStaticData({
              song: initialSongDataRef.current as TopRatedSong,
              comments: [],
              reactions: [],
            });
            setError(null);
          } else {
            if (response.status === 404)
              throw new Error('Song data not found.');
            throw new Error('Failed to load song details.');
          }
        } else {
          const data = await response.json();
          if (isMounted) {
            setStaticData(data);
          }
        }
      } catch (err) {
        if (isMounted) {
          console.error(`Error fetching details for song ${songId}:`, err);
          setError(
            err instanceof Error ? err.message : 'Failed to load song details.'
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [songId, isLive]);

  const currentSong = useMemo(
    () => (isLive ? liveSong : staticData?.song),
    [isLive, liveSong, staticData?.song]
  );
  const currentComments = useMemo(
    () => (isLive ? liveComments : (staticData?.comments ?? [])),
    [isLive, liveComments, staticData?.comments]
  );
  const currentReactions = useMemo(
    () => (isLive ? liveReactions : (staticData?.reactions ?? [])),
    [isLive, liveReactions, staticData?.reactions]
  );

  const reactionGroups = useMemo(() => {
    if (!currentReactions || currentReactions.length === 0) return [];
    const sortedReactions = [...currentReactions].sort(
      (a, b) => a.timestamp - b.timestamp
    );
    const groups: { timestamp: number; reactions: Reaction[] }[] = [];
    if (sortedReactions.length === 0) return [];

    let currentGroup: Reaction[] = [sortedReactions[0]];
    for (let i = 1; i < sortedReactions.length; i++) {
      const reaction = sortedReactions[i];
      const groupStartTime = currentGroup[0].timestamp;
      if (reaction.timestamp - groupStartTime <= 10) {
        currentGroup.push(reaction);
      } else {
        groups.push({ timestamp: groupStartTime, reactions: currentGroup });
        currentGroup = [reaction];
      }
    }
    groups.push({
      timestamp: currentGroup[0].timestamp,
      reactions: currentGroup,
    });
    return groups;
  }, [currentReactions]);

  const interactingUsers = useMemo(() => {
    const allUsers = new Map<string, UserInfo>();
    [...currentReactions, ...currentComments].forEach((interaction) => {
      if (interaction.user && !allUsers.has(interaction.user.id)) {
        allUsers.set(interaction.user.id, interaction.user);
      }
    });
    return Array.from(allUsers.values());
  }, [currentReactions, currentComments]);

  const allSortedInteractionsWithLanes = useMemo(() => {
    if (!currentSong?.duration || isLoading) return [];

    const combined = [
      ...reactionGroups.map((group, index) => ({
        id: `reaction-${group.timestamp}-${index}`,
        type: 'reaction-group' as const,
        position: group.timestamp / currentSong.duration,
        data: group,
      })),
      ...currentComments.map((comment) => ({
        id: `comment-${comment.id}`,
        type: 'comment' as const,
        position: comment.timestamp / currentSong.duration,
        data: comment,
      })),
    ].sort((a, b) => a.position - b.position);

    const laneAssignments = new Map<string, number>();
    const lastInteractionPositionInLane = [-Infinity, -Infinity, -Infinity];
    const POPOVER_WIDTH_PERCENTAGE = 0.1;

    combined.forEach((interaction) => {
      let assignedLane = -1;
      for (let i = 0; i < lastInteractionPositionInLane.length; i++) {
        if (
          interaction.position >
          lastInteractionPositionInLane[i] + POPOVER_WIDTH_PERCENTAGE
        ) {
          assignedLane = i;
          break;
        }
      }
      if (assignedLane === -1) {
        let earliestLane = 0;
        for (let i = 1; i < lastInteractionPositionInLane.length; i++) {
          if (
            lastInteractionPositionInLane[i] <
            lastInteractionPositionInLane[earliestLane]
          ) {
            earliestLane = i;
          }
        }
        assignedLane = earliestLane;
      }
      lastInteractionPositionInLane[assignedLane] = interaction.position;
      laneAssignments.set(interaction.id, assignedLane);
    });

    return combined.map((item) => ({
      ...item,
      lane: laneAssignments.get(item.id) || 0,
    }));
  }, [reactionGroups, currentComments, currentSong?.duration, isLoading]);

  const scanDuration = useMemo(() => {
    if (!currentSong?.duration || currentSong.duration <= 0) return 3.0;
    return Math.max(3.0, currentSong.duration / 20);
  }, [currentSong?.duration]);

  const handlePopoverTriggerClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setPinnedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  useEffect(() => {
    if (
      !isLoading &&
      allSortedInteractionsWithLanes.length > 0 &&
      !animationScheduledRef.current
    ) {
      animationScheduledRef.current = true;
      const timeouts: NodeJS.Timeout[] = [];

      allSortedInteractionsWithLanes.forEach((interaction) => {
        const openTime = interaction.position * scanDuration * 1000;
        const closeTime = openTime + 2000;

        timeouts.push(
          setTimeout(() => {
            setOpenPopoverIds((prev) => new Set(prev).add(interaction.id));
          }, openTime)
        );

        timeouts.push(
          setTimeout(() => {
            setPinnedIds((currentPinnedIds) => {
              if (!currentPinnedIds.has(interaction.id)) {
                setOpenPopoverIds((prev) => {
                  const newSet = new Set(prev);
                  newSet.delete(interaction.id);
                  return newSet;
                });
              }
              return currentPinnedIds;
            });
          }, closeTime)
        );
      });

      return () => timeouts.forEach(clearTimeout);
    }
  }, [isLoading, allSortedInteractionsWithLanes, scanDuration]);

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className="flex items-center justify-center p-4"
      >
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </motion.div>
    );
  }

  if (error || !currentSong) {
    return (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className="flex flex-col items-center justify-center p-4 text-destructive gap-2"
      >
        <ServerCrash className="h-6 w-6" />
        <p className="text-sm font-semibold">
          {error || 'Could not load song details.'}
        </p>
      </motion.div>
    );
  }

  const getPopoverPropsForLane = (lane: number) => {
    const props: { side: 'top' | 'bottom'; align: 'center' | 'start' | 'end' } =
      {
        side: 'top',
        align: 'center',
      };
    switch (lane) {
      case 0:
        props.side = 'top';
        props.align = 'center';
        break;
      case 1:
        props.side = 'bottom';
        props.align = 'center';
        break;
      case 2:
        props.side = 'top';
        props.align = 'start';
        break;
      default:
        props.side = lane % 2 === 0 ? 'top' : 'bottom';
        props.align = 'center';
    }
    return props;
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="overflow-hidden"
    >
      <div className="flex flex-col gap-4 p-2 md:p-4 bg-black/10 rounded-b-lg">
        {/* Timeline Section */}
        <div>
          <div className="relative h-6 w-full">
            <div className="absolute top-1/2 -translate-y-1/2 w-full h-1 bg-muted/50 rounded-full" />

            {!scanCompleted && (
              <motion.div
                key={songId}
                className="absolute top-0 bottom-0 w-1 bg-primary/80 rounded-full shadow-[0_0_8px_hsl(var(--primary))]"
                initial={{ left: '0%', x: '-50%' }}
                animate={{ left: '100%', x: '50%' }}
                transition={{ duration: scanDuration, ease: 'linear' }}
                onAnimationComplete={() => setScanCompleted(true)}
              />
            )}

            {allSortedInteractionsWithLanes.map((interaction) => {
              const leftPosition = `${interaction.position * 100}%`;
              const content =
                interaction.type === 'reaction-group' ? (
                  <ReactionGroupTooltipContent
                    reactions={interaction.data.reactions}
                    songTimestamp={interaction.data.timestamp}
                  />
                ) : (
                  <div className="flex items-start gap-2 max-w-xs">
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={interaction.data.user?.avatar ?? ''}
                        alt={interaction.data.user?.name ?? 'User'}
                      />
                      <AvatarFallback>
                        {interaction.data.user?.name?.charAt(0).toUpperCase() ??
                          'C'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-semibold truncate">
                        {interaction.data.user?.name ?? 'Someone'}
                      </p>
                      <p className="break-words">
                        &quot;{interaction.data.text}&quot;
                      </p>
                      <p className="text-xs text-muted-foreground">
                        at {formatDuration(interaction.data.timestamp)}
                        {interaction.data.createdAt &&
                          ` · ${formatDistanceToNow(new Date(interaction.data.createdAt), { addSuffix: true })}`}
                      </p>
                    </div>
                  </div>
                );

              const popoverProps = getPopoverPropsForLane(interaction.lane);

              return (
                <Popover
                  key={interaction.id}
                  open={
                    openPopoverIds.has(interaction.id) ||
                    pinnedIds.has(interaction.id)
                  }
                >
                  <PopoverTrigger asChild>
                    <div
                      className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-pointer"
                      style={{ left: leftPosition }}
                      onClick={(e) =>
                        handlePopoverTriggerClick(e, interaction.id)
                      }
                    >
                      {interaction.type === 'reaction-group' ? (
                        <div className="h-6 w-6 flex items-center justify-center">
                          <span className="text-lg drop-shadow-md">
                            {interaction.data.reactions[0].emoji}
                          </span>
                          {interaction.data.reactions.length > 1 && (
                            <span className="absolute -top-1 -right-1 text-xs font-bold text-white bg-primary rounded-full w-4 h-4 flex items-center justify-center leading-none">
                              {interaction.data.reactions.length}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div
                          className="h-5 w-5"
                          onClick={(e) => {
                            e.stopPropagation();
                            openUserProfile(interaction.data.user.id);
                          }}
                        >
                          <Avatar className="h-full w-full border border-primary">
                            <AvatarImage
                              src={interaction.data.user?.avatar ?? ''}
                              alt={interaction.data.user?.name ?? 'User'}
                            />
                            <AvatarFallback>
                              {interaction.data.user?.name
                                ?.charAt(0)
                                .toUpperCase() ?? 'C'}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                      )}
                    </div>
                  </PopoverTrigger>
                  <PopoverContent
                    side={popoverProps.side}
                    align={popoverProps.align}
                    className="w-auto p-2"
                  >
                    {content}
                  </PopoverContent>
                </Popover>
              );
            })}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>0:00</span>
            <span>{formatDuration(currentSong.duration)}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-white/10">
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-2">
              <BarChart2 className="h-3 w-3" />
              Stats
            </h4>
            <div className="space-y-1.5 text-xs text-muted-foreground">
              <div className="flex items-start gap-1.5">
                <Play className="h-3 w-3 mt-0.5 flex-shrink-0" />
                {(currentSong.playCount as number) ? (
                  <span>
                    Played {currentSong.playCount as number} time
                    {(currentSong.playCount as number) > 1 ? 's' : ''}
                  </span>
                ) : (
                  <span className="italic">No play count data</span>
                )}
              </div>
              <div className="flex items-start gap-1.5">
                <CalendarClock className="h-3 w-3 mt-0.5 flex-shrink-0" />
                {currentSong.firstPlayedAt ? (
                  <span>
                    First seen{' '}
                    {formatDistanceToNow(
                      new Date(currentSong.firstPlayedAt * 1000),
                      { addSuffix: true }
                    )}
                  </span>
                ) : (
                  <span className="italic">Lost in time...</span>
                )}
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-2">
              <Users className="h-3 w-3" />
              Fans
            </h4>
            <ScrollArea className="h-12">
              <div className="flex flex-wrap gap-1">
                {interactingUsers.map((user) => (
                  <ClickablePopover
                    key={user.id}
                    content={<p>{user.name}</p>}
                    contentProps={{ className: 'p-2 text-sm' }}
                  >
                    <div
                      className="h-6 w-6 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        openUserProfile(user.id);
                      }}
                    >
                      <Avatar className="h-full w-full">
                        <AvatarImage
                          src={user.avatar ?? ''}
                          alt={user.name ?? 'User'}
                        />
                        <AvatarFallback>
                          {user.name?.charAt(0).toUpperCase() ?? 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  </ClickablePopover>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
