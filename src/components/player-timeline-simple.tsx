'use client';

import React from 'react';
import { useRadio } from '@/contexts/radio-context-simple';
import { Progress } from './ui/progress';
import { formatDuration } from '@/lib/utils';
import Waveform from './waveform';

export default function PlayerTimeline() {
  const { liveSong, progress, historicalWaveform } = useRadio();

  const progressPercentage = liveSong.duration
    ? (progress / liveSong.duration) * 100
    : 0;

  return (
    <div className="w-full">
      <Waveform data={historicalWaveform} duration={liveSong.duration} />
      <div className="relative h-6 mb-1">
        <Progress
          value={progressPercentage}
          className="h-2 absolute top-1/2 -translate-y-1/2 w-full"
          aria-label="Song playback progress"
        />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{formatDuration(progress)}</span>
        <span>{formatDuration(liveSong.duration)}</span>
      </div>
    </div>
  );
}