import Twitter from './Twitter';
import Instagram from './Instagram';
import Twitch from './Twitch';
import YouTube from '../platforms/YouTube';
import Github from './Github';
import Website from './Website';
import React from 'react';

// Map platform keys to their respective icon components
export const socialIcons: Record<
  string,
  React.ComponentType<React.SVGAttributes<SVGElement>>
> = {
  twitter: Twitter,
  instagram: Instagram,
  twitch: Twitch,
  youtube: YouTube,
  github: Github,
  website: Website,
};

// Type for social platform keys to ensure type safety
export type SocialPlatform = keyof typeof socialIcons;

// Human-readable names for platforms
export const socialPlatformNames: Record<SocialPlatform, string> = {
  twitter: 'Twitter',
  instagram: 'Instagram',
  twitch: 'Twitch',
  youtube: 'YouTube',
  github: 'GitHub',
  website: 'Website',
};
