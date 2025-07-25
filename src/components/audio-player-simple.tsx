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
              <div className="w-full h-full flex items-center justify-center">
                <Music2 className="w-12 h-12 text-muted-foreground/50" />
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

        {/* Discord Link */}
        <div className="mt-4 pt-4 border-t border-border/30">
          <a
            href="https://discord.gg/oadro"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center p-3 rounded-lg bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 hover:border-indigo-500/40 transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/10 group"
          >
            <div className="flex items-center justify-center gap-2 mb-1">
              <svg className="w-5 h-5 text-indigo-400 group-hover:text-indigo-300 transition-colors" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
              <span className="text-sm font-semibold text-foreground group-hover:text-indigo-300 transition-colors">
                Join Oadro AI Radio
              </span>
            </div>
            <p className="text-xs text-muted-foreground group-hover:text-muted-foreground/80 transition-colors leading-relaxed">
              Join our AI-community! Add your AI-generated songs from Suno, Udio, Riffusion, MusicGPT & more. Come and chill!
            </p>
            <div className="text-xs text-indigo-400 group-hover:text-indigo-300 transition-colors mt-1 font-mono">
              discord.gg/oadro
            </div>
          </a>
        </div>

        {/* Duplicate time display removed - timeline component above shows this */}
      </CardContent>
    </Card>
  );
}