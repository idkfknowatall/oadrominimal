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
import { useRadio } from '@/contexts/radio-context-simple';
import { ClickablePopover } from './clickable-popover';

// Mock data for demonstration - replace with actual API calls
const mockComments = [
  {
    id: '1',
    user: {
      id: 'user1',
      displayName: 'MusicLover42',
      avatar: null,
    },
    content: 'This track is absolutely amazing! The AI really nailed it.',
    timestamp: new Date(Date.now() - 2 * 60 * 1000),
  },
  {
    id: '2',
    user: {
      id: 'user2',
      displayName: 'BeatMaster',
      avatar: null,
    },
    content: 'Love the progression in this one. Suno is getting so good!',
    timestamp: new Date(Date.now() - 5 * 60 * 1000),
  },
];

const mockReactions = [
  { type: '🔥', count: 23, userReacted: true },
  { type: '💯', count: 15, userReacted: false },
  { type: '🎵', count: 8, userReacted: false },
];

interface SongTimelineDetailProps {
  song: Song;
  trigger: React.ReactNode;
}

export function SongTimelineDetail({
  song,
  trigger,
}: SongTimelineDetailProps) {
  const { user } = useRadio();
  const [comments, setComments] = useState(mockComments);
  const [reactions, setReactions] = useState(mockReactions);
  const [newComment, setNewComment] = useState('');
  const commentInputRef = useRef<HTMLTextAreaElement>(null);
  const isLoading = false; // Simplified - no loading state needed

  const handleReaction = (type: string) => {
    if (!user) return;

    setReactions(prev =>
      prev.map(reaction =>
        reaction.type === type
          ? {
              ...reaction,
              count: reaction.userReacted
                ? reaction.count - 1
                : reaction.count + 1,
              userReacted: !reaction.userReacted,
            }
          : reaction
      )
    );
  };

  const handleSubmitComment = () => {
    // User is always null in simplified context, so this function should not be called
    if (!user || !newComment.trim()) return;

    const comment = {
      id: Date.now().toString(),
      user: {
        id: 'anonymous',
        displayName: 'Anonymous',
        avatar: null,
      },
      content: newComment.trim(),
      timestamp: new Date(),
    };

    setComments(prev => [comment, ...prev]);
    setNewComment('');
  };

  const formatPlayedAt = (timestamp: string | number | Date) => {
    try {
      const date = new Date(timestamp);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return 'Recently';
    }
  };

  const totalReactions = useMemo(
    () => reactions.reduce((sum, reaction) => sum + reaction.count, 0),
    [reactions]
  );

  return (
    <ClickablePopover
      content={
        <div className="w-80 max-h-96 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              {/* Song Header */}
              <div className="space-y-2">
                <h3 className="font-semibold text-sm leading-tight">
                  {song.title}
                </h3>
                <p className="text-xs text-muted-foreground">{song.artist}</p>
                {song.played_at && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <CalendarClock className="w-3 h-3" />
                    Played {formatPlayedAt(song.played_at)}
                  </p>
                )}
              </div>

              {/* Quick Stats */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  <span>24 listeners</span>
                </div>
                <div className="flex items-center gap-1">
                  <BarChart2 className="w-3 h-3" />
                  <span>{totalReactions} reactions</span>
                </div>
                {song.duration && (
                  <div className="flex items-center gap-1">
                    <Play className="w-3 h-3" />
                    <span>{formatDuration(song.duration)}</span>
                  </div>
                )}
              </div>

              {/* Reactions */}
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Reactions
                </h4>
                <div className="flex gap-2">
                  {reactions.map(reaction => (
                    <button
                      key={reaction.type}
                      onClick={() => handleReaction(reaction.type)}
                      className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-colors ${
                        reaction.userReacted
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted hover:bg-muted/80'
                      }`}
                      disabled={!user}
                    >
                      <span>{reaction.type}</span>
                      <span>{reaction.count}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Comments Section */}
              <div className="space-y-3">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Comments ({comments.length})
                </h4>

                {isLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                ) : (
                  <>
                    {/* Comment Input */}
                    {user ? (
                      <div className="space-y-2">
                        <textarea
                          ref={commentInputRef}
                          value={newComment}
                          onChange={e => setNewComment(e.target.value)}
                          placeholder="Add a comment..."
                          className="w-full p-2 text-xs bg-muted rounded-md resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                          rows={2}
                        />
                        <button
                          onClick={handleSubmitComment}
                          disabled={!newComment.trim()}
                          className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90"
                        >
                          Comment
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-2">
                        Sign in to join the conversation
                      </p>
                    )}

                    {/* Comments List */}
                    <div className="space-y-3">
                      {comments.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-4">
                          No comments yet. Be the first to share your thoughts!
                        </p>
                      ) : (
                        comments.map(comment => (
                          <motion.div
                            key={comment.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex gap-2"
                          >
                            <Avatar className="w-6 h-6 flex-shrink-0">
                              <AvatarImage
                                src={comment.user.avatar || undefined}
                                alt={comment.user.displayName}
                              />
                              <AvatarFallback className="text-xs">
                                {comment.user.displayName
                                  .split(' ')
                                  .map(n => n[0])
                                  .join('')
                                  .toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium">
                                  {comment.user.displayName}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(comment.timestamp, {
                                    addSuffix: true,
                                  })}
                                </span>
                              </div>
                              <p className="text-xs text-foreground">
                                {comment.content}
                              </p>
                            </div>
                          </motion.div>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </ScrollArea>
        </div>
      }
    >
      {trigger}
    </ClickablePopover>
  );
}