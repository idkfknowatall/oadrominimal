'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { ThumbsUp, ThumbsDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { DislikeFeedbackModal } from './dislike-feedback-modal';
import type { SongVotes, VoteType, VotingErrorResponse } from '@/lib/voting-types';

interface VotingButtonsProps {
  songId: string;
  initialVotes?: SongVotes;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showCounts?: boolean;
  disabled?: boolean;
}

export function VotingButtons({
  songId,
  initialVotes,
  className = '',
  size = 'md',
  showCounts = true,
  disabled = false,
}: VotingButtonsProps) {
  const { data: session, status } = useSession();
  const { toast } = useToast();
  
  const [votes, setVotes] = useState<SongVotes>(
    initialVotes || {
      songId,
      likeCount: 0,
      dislikeCount: 0,
      totalVotes: 0,
      userVote: null,
    }
  );
  
  const [isLoading, setIsLoading] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [pendingDislikeVoteId, setPendingDislikeVoteId] = useState<number | null>(null);

  // Fetch initial vote data
  useEffect(() => {
    if (!songId) return;

    const fetchVotes = async () => {
      try {
        const response = await fetch(`/api/songs/${songId}/votes`);
        const data = await response.json();
        
        if (data.success) {
          setVotes(data.votes);
        }
      } catch (error) {
        console.error('Failed to fetch votes:', error);
      }
    };

    fetchVotes();
  }, [songId]);

  const handleVote = async (voteType: VoteType) => {
    if (!session) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in with Discord to vote on songs.',
        variant: 'destructive',
      });
      return;
    }

    if (disabled || isLoading) return;

    // If user is switching to dislike or voting dislike for first time
    if (voteType === 'dislike') {
      setIsLoading(true);
      
      try {
        const response = await fetch(`/api/songs/${songId}/vote`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ voteType }),
        });

        const data = await response.json();

        if (data.success) {
          setVotes(data.votes);
          setPendingDislikeVoteId(data.vote.id);
          setShowFeedbackModal(true);
          
          toast({
            title: 'Vote Recorded',
            description: 'Please provide feedback about why you disliked this song.',
          });
        } else {
          handleVoteError(data);
        }
      } catch (error) {
        console.error('Vote error:', error);
        toast({
          title: 'Vote Failed',
          description: 'Failed to record your vote. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    } else {
      // Handle like vote normally
      await submitVote(voteType);
    }
  };

  const submitVote = async (voteType: VoteType) => {
    setIsLoading(true);

    try {
      const response = await fetch(`/api/songs/${songId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ voteType }),
      });

      const data = await response.json();

      if (data.success) {
        setVotes(data.votes);
        
        toast({
          title: 'Vote Recorded',
          description: `You ${voteType}d this song!`,
        });
      } else {
        handleVoteError(data);
      }
    } catch (error) {
      console.error('Vote error:', error);
      toast({
        title: 'Vote Failed',
        description: 'Failed to record your vote. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveVote = async () => {
    if (!session || disabled || isLoading) return;

    setIsLoading(true);

    try {
      const response = await fetch(`/api/songs/${songId}/vote`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setVotes(data.votes);
        
        toast({
          title: 'Vote Removed',
          description: 'Your vote has been removed.',
        });
      } else {
        handleVoteError(data);
      }
    } catch (error) {
      console.error('Remove vote error:', error);
      toast({
        title: 'Failed to Remove Vote',
        description: 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoteError = (error: VotingErrorResponse) => {
    let title = 'Vote Failed';
    let description = error.message;

    switch (error.error) {
      case 'RATE_LIMIT_EXCEEDED':
        title = 'Too Many Votes';
        break;
      case 'UNAUTHORIZED':
        title = 'Authentication Required';
        description = 'Please sign in with Discord to vote.';
        break;
      case 'VALIDATION_ERROR':
        title = 'Invalid Vote';
        break;
    }

    toast({
      title,
      description,
      variant: 'destructive',
    });
  };

  const handleFeedbackSubmitted = () => {
    setShowFeedbackModal(false);
    setPendingDislikeVoteId(null);
    
    toast({
      title: 'Feedback Submitted',
      description: 'Thank you for your feedback! It has been sent to the administrators.',
    });
  };

  const handleFeedbackSkipped = () => {
    setShowFeedbackModal(false);
    setPendingDislikeVoteId(null);
  };

  const buttonSizes = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const isAuthenticated = status === 'authenticated';
  const canVote = isAuthenticated && !disabled && !isLoading;

  return (
    <>
      <div className={`flex items-center justify-center gap-4 ${className}`}>
        {/* Like Button */}
        <div className="flex items-center gap-1">
          <Button
            variant={votes.userVote === 'like' ? 'default' : 'outline'}
            size="sm"
            className={`${buttonSizes[size]} transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2`}
            onClick={() => {
              if (votes.userVote === 'like') {
                handleRemoveVote();
              } else {
                handleVote('like');
              }
            }}
            disabled={!canVote}
            aria-label={`${votes.userVote === 'like' ? 'Remove like' : 'Like this song'} (${votes.likeCount} likes)`}
            aria-pressed={votes.userVote === 'like'}
          >
            <AnimatePresence mode="wait">
              {isLoading && votes.userVote !== 'dislike' ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.15 }}
                >
                  <Loader2 className={`${iconSizes[size]} animate-spin`} />
                </motion.div>
              ) : (
                <motion.div
                  key="like"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.15 }}
                >
                  <ThumbsUp 
                    className={`${iconSizes[size]} ${votes.userVote === 'like' ? 'fill-current' : ''}`}
                    aria-hidden="true"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </Button>
          
          {showCounts && (
            <motion.span
              key={votes.likeCount}
              initial={{ scale: 1.2, opacity: 0.7 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-sm font-medium text-muted-foreground min-w-[1.5rem] text-center"
              aria-live="polite"
            >
              {votes.likeCount}
            </motion.span>
          )}
        </div>

        {/* Dislike Button */}
        <div className="flex items-center gap-1">
          <Button
            variant={votes.userVote === 'dislike' ? 'destructive' : 'outline'}
            size="sm"
            className={`${buttonSizes[size]} transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-destructive focus:ring-offset-2`}
            onClick={() => {
              if (votes.userVote === 'dislike') {
                handleRemoveVote();
              } else {
                handleVote('dislike');
              }
            }}
            disabled={!canVote}
            aria-label={`${votes.userVote === 'dislike' ? 'Remove dislike' : 'Dislike this song'} (${votes.dislikeCount} dislikes)`}
            aria-pressed={votes.userVote === 'dislike'}
          >
            <AnimatePresence mode="wait">
              {isLoading && votes.userVote !== 'like' ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.15 }}
                >
                  <Loader2 className={`${iconSizes[size]} animate-spin`} />
                </motion.div>
              ) : (
                <motion.div
                  key="dislike"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.15 }}
                >
                  <ThumbsDown 
                    className={`${iconSizes[size]} ${votes.userVote === 'dislike' ? 'fill-current' : ''}`}
                    aria-hidden="true"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </Button>
          
          {showCounts && (
            <motion.span
              key={votes.dislikeCount}
              initial={{ scale: 1.2, opacity: 0.7 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-sm font-medium text-muted-foreground min-w-[1.5rem] text-center"
              aria-live="polite"
            >
              {votes.dislikeCount}
            </motion.span>
          )}
        </div>

        {/* Authentication prompt for unauthenticated users */}
        {!isAuthenticated && (
          <span className="text-xs text-muted-foreground ml-2">
            Sign in to vote
          </span>
        )}
      </div>

      {/* Dislike Feedback Modal */}
      <DislikeFeedbackModal
        isOpen={showFeedbackModal}
        onClose={handleFeedbackSkipped}
        voteId={pendingDislikeVoteId}
        songId={songId}
        onFeedbackSubmitted={handleFeedbackSubmitted}
      />
    </>
  );
}