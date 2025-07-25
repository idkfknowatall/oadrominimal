import React, { useState } from 'react';
import { VoteButton } from '../vote-button';

/**
 * Demo component showing VoteButton usage examples
 * This is for development/testing purposes only
 */
export function VoteButtonDemo() {
  const [likeCount, setLikeCount] = useState(42);
  const [dislikeCount, setDislikeCount] = useState(8);
  const [userVote, setUserVote] = useState<'like' | 'dislike' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(true);

  const handleVote = async (type: 'like' | 'dislike') => {
    if (!isAuthenticated) return;
    
    setIsLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Update counts based on previous vote
    if (userVote === type) {
      // Remove vote
      if (type === 'like') {
        setLikeCount(prev => prev - 1);
      } else {
        setDislikeCount(prev => prev - 1);
      }
      setUserVote(null);
    } else {
      // Add new vote, remove old if exists
      if (userVote === 'like') {
        setLikeCount(prev => prev - 1);
      } else if (userVote === 'dislike') {
        setDislikeCount(prev => prev - 1);
      }
      
      if (type === 'like') {
        setLikeCount(prev => prev + 1);
      } else {
        setDislikeCount(prev => prev + 1);
      }
      setUserVote(type);
    }
    
    setIsLoading(false);
  };

  return (
    <div className="p-8 space-y-8 bg-background text-foreground">
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">VoteButton Demo</h2>
        
        {/* Authentication Toggle */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">
            <input
              type="checkbox"
              checked={isAuthenticated}
              onChange={(e) => setIsAuthenticated(e.target.checked)}
              className="mr-2"
            />
            Authenticated User
          </label>
        </div>
      </div>

      {/* Interactive Voting Example */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Interactive Voting</h3>
        <div className="flex gap-4 items-center">
          <VoteButton
            type="like"
            count={likeCount}
            isActive={userVote === 'like'}
            isLoading={isLoading}
            disabled={!isAuthenticated}
            onClick={() => handleVote('like')}
          />
          <VoteButton
            type="dislike"
            count={dislikeCount}
            isActive={userVote === 'dislike'}
            isLoading={isLoading}
            disabled={!isAuthenticated}
            onClick={() => handleVote('dislike')}
          />
          {!isAuthenticated && (
            <span className="text-sm text-muted-foreground">
              Login to vote
            </span>
          )}
        </div>
      </div>

      {/* Different States */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Different States</h3>
        
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Normal State</h4>
          <div className="flex gap-2">
            <VoteButton type="like" count={15} isActive={false} />
            <VoteButton type="dislike" count={3} isActive={false} />
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-medium">Active State</h4>
          <div className="flex gap-2">
            <VoteButton type="like" count={16} isActive={true} />
            <VoteButton type="dislike" count={4} isActive={true} />
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-medium">Loading State</h4>
          <div className="flex gap-2">
            <VoteButton type="like" count={15} isActive={false} isLoading={true} />
            <VoteButton type="dislike" count={3} isActive={true} isLoading={true} />
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-medium">Disabled State</h4>
          <div className="flex gap-2">
            <VoteButton type="like" count={15} isActive={false} disabled={true} />
            <VoteButton type="dislike" count={3} isActive={false} disabled={true} />
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-medium">Without Count</h4>
          <div className="flex gap-2">
            <VoteButton type="like" count={15} isActive={false} showCount={false} />
            <VoteButton type="dislike" count={3} isActive={true} showCount={false} />
          </div>
        </div>
      </div>

      {/* High Numbers */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">High Vote Counts</h3>
        <div className="flex gap-2">
          <VoteButton type="like" count={1247} isActive={false} />
          <VoteButton type="dislike" count={89} isActive={false} />
        </div>
      </div>
    </div>
  );
}