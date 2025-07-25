'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Music2, Play, Pause, Volume2, Volume1, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { useRadio } from '@/contexts/radio-context-simple';
import PlayerTimeline from './player-timeline-simple';
import { SongVoteDisplay } from '@/components/ui/song-vote-display';
import { useAuth } from '@/hooks/use-auth';

export default function AudioPlayer() {
  const {
    liveSong,
    isPlaying,
    volume,
    isMuted,
    progress,
    togglePlayPause,
    setVolume,
    setIsMuted,
  } = useRadio();

  const { user, isAuthenticated, signIn } = useAuth();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getVolumeIcon = () => {
    if (isMuted || volume === 0) return VolumeX;
    if (volume < 0.5) return Volume1;
    return Volume2;
  };

  const VolumeIcon = getVolumeIcon();

  return (
    <Card className="w-full max-w-md mx-auto bg-card/95 backdrop-blur-sm border-border/50 shadow-2xl">
      <CardContent className="p-6">
        {/* Album Art */}
        <div className="relative mb-4 group mx-auto w-48">
          <div className="aspect-square rounded-lg overflow-hidden bg-muted/50 border border-border/30">
            {liveSong.albumArt ? (
              <Image
                src={liveSong.albumArt}
                alt={`${liveSong.title} by ${liveSong.artist}`}
                width={192}
                height={192}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                priority
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                <Music2 className="w-16 h-16 text-muted-foreground/50" />
              </div>
            )}
          </div>
        </div>

        {/* Song Info */}
        <div className="text-center mb-4">
          <motion.h3 
            className="font-semibold text-lg text-foreground mb-1 leading-tight"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={liveSong.title}
          >
            {liveSong.title}
          </motion.h3>
          <motion.p 
            className="text-muted-foreground text-sm"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={liveSong.artist}
          >
            {liveSong.artist}
          </motion.p>
        </div>

        {/* Timeline */}
        <div className="mb-6">
          <PlayerTimeline 
            progress={progress}
            duration={liveSong.duration}
            currentTime={progress * liveSong.duration}
          />
        </div>

        {/* Voting Interface */}
        <div className="mb-6">
          <SongVoteDisplay 
            user={user} 
            isAuthenticated={isAuthenticated} 
            onLoginRequired={() => {
              signIn();
            }}
          />
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between mb-6">
          {/* Play/Pause Button */}
          <div className="flex-1 flex justify-center">
            <Button
              onClick={togglePlayPause}
              size="lg"
              className="w-16 h-16 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              aria-label={isPlaying ? `Pause ${liveSong.title} by ${liveSong.artist}` : `Play ${liveSong.title} by ${liveSong.artist}`}
              aria-pressed={isPlaying}
            >
              {isPlaying ? (
                <Pause className="w-6 h-6" />
              ) : (
                <Play className="w-6 h-6 ml-1" />
              )}
            </Button>
          </div>
        </div>

        {/* Volume Control */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMuted(!isMuted)}
            className="p-2 hover:bg-muted/50 transition-colors"
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            <VolumeIcon className="w-4 h-4" />
          </Button>
          
          <div className="flex-1">
            <Slider
              value={[isMuted ? 0 : volume]}
              onValueChange={([value]) => {
                setVolume(value);
                if (value > 0 && isMuted) {
                  setIsMuted(false);
                }
              }}
              max={1}
              step={0.01}
              className="w-full"
              aria-label="Volume"
            />
          </div>
          
          <span className="text-xs text-muted-foreground min-w-[3ch] text-right">
            {Math.round((isMuted ? 0 : volume) * 100)}
          </span>
        </div>

        {/* Now Playing Label */}
        <div className="mt-4 pt-4 border-t border-border/30">
          <p className="text-xs text-muted-foreground text-center">
            Live on OADRO Radio
          </p>
        </div>
      </CardContent>
    </Card>
  );
}