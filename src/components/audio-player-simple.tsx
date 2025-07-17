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
        <div className="relative mb-6 group">
          <div className="aspect-square rounded-lg overflow-hidden bg-muted/50 border border-border/30">
            {liveSong.albumArt ? (
              <Image
                src={liveSong.albumArt}
                alt={`${liveSong.title} by ${liveSong.artist}`}
                width={400}
                height={400}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                priority
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Music2 className="w-16 h-16 text-muted-foreground/50" />
              </div>
            )}
          </div>
        </div>

        {/* Song Info - Simplified */}
        <div className="text-center mb-6 space-y-2">
          <motion.h2
            key={liveSong.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xl font-bold text-foreground leading-tight"
          >
            {liveSong.title}
          </motion.h2>
          <motion.p
            key={liveSong.artist}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground"
          >
            {liveSong.artist}
          </motion.p>
          {liveSong.played_at && (
            <motion.p
              key={liveSong.played_at}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xs text-muted-foreground/70"
            >
              Last played: {new Date(liveSong.played_at * 1000).toLocaleTimeString()}
            </motion.p>
          )}
        </div>

        {/* Timeline */}
        <div className="mb-6">
          <PlayerTimeline />
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
                <Pause className="w-6 h-6" aria-hidden="true" />
              ) : (
                <Play className="w-6 h-6 ml-0.5" aria-hidden="true" />
              )}
            </Button>
          </div>
        </div>

        {/* Volume Control */}
        <div className="flex items-center gap-3 mb-4" role="group" aria-label="Volume controls">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMuted(!isMuted)}
            className="p-2 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
            aria-pressed={isMuted}
          >
            <VolumeIcon className="w-4 h-4" aria-hidden="true" />
          </Button>
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
            className="flex-1"
            aria-label="Volume level"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round((isMuted ? 0 : volume) * 100)}
            aria-valuetext={`Volume ${Math.round((isMuted ? 0 : volume) * 100)} percent`}
          />
          <span
            className="text-xs text-muted-foreground w-8 text-right"
            aria-live="polite"
            aria-label="Current volume percentage"
          >
            {Math.round((isMuted ? 0 : volume) * 100)}%
          </span>
        </div>

        {/* Duplicate time display removed - timeline component above shows this */}
      </CardContent>
    </Card>
  );
}