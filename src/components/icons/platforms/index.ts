import YouTube from './YouTube';
import Spotify from './Spotify';
import SoundCloud from './SoundCloud';
import Bandcamp from './Bandcamp';
import Suno from './Suno';

// Map platform keys to their respective icon components
export const platformIcons = {
  song_youtube: YouTube,
  song_spotify: Spotify,
  song_soundcloud: SoundCloud,
  song_bandcamp: Bandcamp,
  song_suno: Suno,
};

// Type for platform keys to ensure type safety
export type PlatformKey = keyof typeof platformIcons;

// Export individual icons for direct imports if needed
export { YouTube, Spotify, SoundCloud, Bandcamp, Suno };
