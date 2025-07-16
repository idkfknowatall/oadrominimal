'use client';

import React from 'react';
import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  socialIcons,
  socialPlatformNames,
  SocialPlatform,
} from './icons/socials';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';

export interface SocialLinksData {
  twitter?: string | null;
  instagram?: string | null;
  twitch?: string | null;
  youtube?: string | null;
  github?: string | null;
  website?: string | null;
  [key: string]: string | null | undefined; // Allow for future platforms
}

interface SocialLinksProps {
  socialLinks?: SocialLinksData | null;
  variant?: 'default' | 'compact';
  className?: string;
}

export function SocialLinks({
  socialLinks,
  variant = 'default',
  className,
}: SocialLinksProps) {
  if (!socialLinks || Object.keys(socialLinks).length === 0) {
    return null;
  }

  const availablePlatforms = Object.entries(socialLinks)
    .filter(([, url]) => url !== null && url !== undefined && url !== '')
    .map(([platform, url]) => ({ platform, url }));

  if (availablePlatforms.length === 0) {
    return null;
  }

  return (
    <TooltipProvider>
      <div className={cn('flex flex-wrap items-center gap-2', className)}>
        {availablePlatforms.map(({ platform, url }) => {
          const IconComponent =
            platform in socialIcons
              ? socialIcons[platform as SocialPlatform]
              : ExternalLink;

          const platformName =
            platform in socialPlatformNames
              ? socialPlatformNames[platform as SocialPlatform]
              : 'Website';

          return (
            <Tooltip key={platform}>
              <TooltipTrigger asChild>
                <a
                  href={url as string}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    'inline-flex items-center justify-center transition-colors',
                    variant === 'default'
                      ? 'rounded-md bg-secondary p-2 hover:bg-secondary/80'
                      : 'rounded-full bg-white/5 p-1.5 hover:bg-white/10'
                  )}
                  onClick={(e) => e.stopPropagation()}
                  aria-label={`Visit ${platformName}`}
                >
                  <IconComponent
                    className={cn(
                      variant === 'default' ? 'h-4 w-4' : 'h-3 w-3',
                      platform === 'twitter' && 'text-sky-500',
                      platform === 'instagram' && 'text-pink-500',
                      platform === 'twitch' && 'text-purple-500',
                      platform === 'youtube' && 'text-red-500',
                      platform === 'github' && 'text-gray-500',
                      platform === 'website' && 'text-blue-500'
                    )}
                  />
                </a>
              </TooltipTrigger>
              <TooltipContent>
                <p>{platformName}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
