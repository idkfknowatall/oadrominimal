/**
 * Shared keyboard shortcuts for audio player control
 * Provides consistent keyboard navigation across components
 */

export interface AudioPlayerControls {
  togglePlayPause: () => void;
  setVolume: (volume: number) => void;
  setIsMuted: (muted: boolean) => void;
  volume: number;
  isMuted: boolean;
}

/**
 * Creates a keyboard event handler for audio player controls
 * @param audioPlayer - Audio player instance with control methods
 * @returns Keyboard event handler function
 */
export function createAudioKeyboardHandler(audioPlayer: AudioPlayerControls) {
  return (event: KeyboardEvent) => {
    // Only handle keyboard shortcuts when not typing in an input
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return;
    }

    switch (event.code) {
      case 'Space':
        event.preventDefault();
        audioPlayer.togglePlayPause();
        break;
      case 'ArrowUp':
        event.preventDefault();
        audioPlayer.setVolume(Math.min(1, audioPlayer.volume + 0.1));
        break;
      case 'ArrowDown':
        event.preventDefault();
        audioPlayer.setVolume(Math.max(0, audioPlayer.volume - 0.1));
        break;
      case 'KeyM':
        event.preventDefault();
        audioPlayer.setIsMuted(!audioPlayer.isMuted);
        break;
    }
  };
}

/**
 * Hook to set up keyboard shortcuts for audio player
 * @param audioPlayer - Audio player instance with control methods
 */
export function useAudioKeyboardShortcuts(audioPlayer: AudioPlayerControls) {
  const handleKeyDown = createAudioKeyboardHandler(audioPlayer);
  
  return { handleKeyDown };
}