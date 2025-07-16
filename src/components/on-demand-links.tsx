'use client';

import React from 'react';
import { ExternalLink } from 'lucide-react';
import { OnDemandLinks as OnDemandLinksType } from '@/lib/types';
import { platformIcons, PlatformKey } from '@/components/icons/platforms';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Map platform keys to human-readable names
const platformNames: Record<string, string> = {
  song_suno: 'Suno',
  song_youtube: 'YouTube',
  song_spotify: 'Spotify',
  song_soundcloud: 'SoundCloud',
  song_bandcamp: 'Bandcamp',
};

interface OnDemandLinksProps {
  onDemand?: OnDemandLinksType | null;
}

export default function OnDemandLinks({ onDemand }: OnDemandLinksProps) {
  // If no onDemand object or all values are null, don't render anything
  if (
    !onDemand ||
    Object.values(onDemand).every((val) => val === null || val === undefined)
  ) {
    return null;
  }

  const availablePlatforms = Object.entries(onDemand)
    .filter(([, url]) => url !== null && url !== undefined && url !== '')
    .map(([platform, url]) => ({ platform, url }));

  // If no valid URLs, don't render anything
  if (availablePlatforms.length === 0) {
    return null;
  }

  return (
    <TooltipProvider>
      <div className="flex flex-wrap items-center gap-2 mt-1">
        {availablePlatforms.map(({ platform, url }) => {
          const IconComponent =
            platform in platformIcons
              ? platformIcons[platform as PlatformKey]
              : ExternalLink;
          const platformName = platformNames[platform] || 'External Link';

          return (
            <Tooltip key={platform}>
              <TooltipTrigger asChild>
                <a
                  href={url as string}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 p-1.5 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  <IconComponent className="h-3 w-3 text-primary" />
                </a>
              </TooltipTrigger>
              <TooltipContent>
                <p>Listen on {platformName}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
