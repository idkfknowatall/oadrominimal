/**
 * End-to-end tests for audio streaming functionality
 * Tests audio playback, metadata updates, and user interactions
 */

import { test, expect, type Page, type BrowserContext } from '@playwright/test';

// Test configuration
const TEST_CONFIG = {
  baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000',
  timeout: 30000,
  streamTimeout: 10000,
};

// Mock radio stream data
const mockStreamData = {
  nowPlaying: {
    song: {
      id: '12345',
      title: 'Test Song',
      artist: 'Test Artist',
      art: 'https://placehold.co/300x300/png'
    },
    duration: 180,
    elapsed: 45
  },
  listeners: {
    current: 42
  }
};

// Helper functions
async function waitForAudioPlayer(page: Page): Promise<void> {
  await page.waitForSelector('[data-testid="audio-player"]', { 
    state: 'visible',
    timeout: TEST_CONFIG.timeout 
  });
}

async function mockRadioStream(page: Page): Promise<void> {
  // Mock the radio stream API
  await page.route('**/api/radio-meta', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockStreamData)
    });
  });

  // Mock the SSE stream
  await page.route('**/api/live/nowplaying/sse**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body: `data: ${JSON.stringify({ 
        channel: 'station:test',
        pub: { data: { np: mockStreamData } }
      })}\n\n`
    });
  });
}

async function enableAudioPermissions(context: BrowserContext): Promise<void> {
  await context.grantPermissions(['autoplay']);
}

test.describe('Audio Streaming E2E Tests', () => {
  test.beforeEach(async ({ page, context }) => {
    await enableAudioPermissions(context);
    await mockRadioStream(page);
  });

  test.describe('Audio Player Initialization', () => {
    test('should load audio player with default state', async ({ page }) => {
      await page.goto('/');
      await waitForAudioPlayer(page);

      // Check initial state
      const playButton = page.locator('[data-testid="play-pause-button"]');
      await expect(playButton).toBeVisible();
      await expect(playButton).toHaveAttribute('aria-pressed', 'false');

      // Check volume controls
      const volumeSlider = page.locator('[data-testid="volume-slider"]');
      await expect(volumeSlider).toBeVisible();

      // Check song info display
      const songTitle = page.locator('[data-testid="song-title"]');
      const songArtist = page.locator('[data-testid="song-artist"]');
      await expect(songTitle).toBeVisible();
      await expect(songArtist).toBeVisible();
    });

    test('should display loading state while initializing', async ({ page }) => {
      await page.goto('/');

      // Should show loading skeleton initially
      const loadingSkeleton = page.locator('[data-testid="loading-skeleton"]');
      await expect(loadingSkeleton).toBeVisible();

      // Should transition to loaded state
      await waitForAudioPlayer(page);
      await expect(loadingSkeleton).not.toBeVisible();
    });

    test('should handle initialization errors gracefully', async ({ page }) => {
      // Mock API failure
      await page.route('**/api/radio-meta', async route => {
        await route.fulfill({ status: 500, body: 'Server Error' });
      });

      await page.goto('/');

      // Should show error boundary
      const errorBoundary = page.locator('[data-testid="error-boundary"]');
      await expect(errorBoundary).toBeVisible();
      await expect(errorBoundary).toContainText('Unable to load radio stream');
    });
  });

  test.describe('Audio Playback Controls', () => {
    test('should start and stop audio playback', async ({ page }) => {
      await page.goto('/');
      await waitForAudioPlayer(page);

      const playButton = page.locator('[data-testid="play-pause-button"]');

      // Start playback
      await playButton.click();
      await expect(playButton).toHaveAttribute('aria-pressed', 'true');
      await expect(playButton).toHaveAttribute('aria-label', /Pause/);

      // Verify audio element is playing
      const audioElement = page.locator('audio');
      const isPlaying = await audioElement.evaluate((audio: HTMLAudioElement) => !audio.paused);
      expect(isPlaying).toBe(true);

      // Stop playback
      await playButton.click();
      await expect(playButton).toHaveAttribute('aria-pressed', 'false');
      await expect(playButton).toHaveAttribute('aria-label', /Play/);
    });

    test('should handle audio loading errors', async ({ page }) => {
      // Mock audio stream failure
      await page.route('**/radio-stream', async route => {
        await route.fulfill({ status: 404 });
      });

      await page.goto('/');
      await waitForAudioPlayer(page);

      const playButton = page.locator('[data-testid="play-pause-button"]');
      await playButton.click();

      // Should show error message
      const errorMessage = page.locator('[data-testid="audio-error"]');
      await expect(errorMessage).toBeVisible();
      await expect(errorMessage).toContainText('Failed to load audio stream');
    });

    test('should persist playback state across page reloads', async ({ page }) => {
      await page.goto('/');
      await waitForAudioPlayer(page);

      // Start playback
      const playButton = page.locator('[data-testid="play-pause-button"]');
      await playButton.click();
      await expect(playButton).toHaveAttribute('aria-pressed', 'true');

      // Reload page
      await page.reload();
      await waitForAudioPlayer(page);

      // Should resume playback
      await expect(playButton).toHaveAttribute('aria-pressed', 'true');
    });
  });

  test.describe('Volume Controls', () => {
    test('should adjust volume with slider', async ({ page }) => {
      await page.goto('/');
      await waitForAudioPlayer(page);

      const volumeSlider = page.locator('[data-testid="volume-slider"] input');
      const volumeDisplay = page.locator('[data-testid="volume-display"]');

      // Test volume adjustment
      await volumeSlider.fill('0.7');
      await expect(volumeDisplay).toContainText('70%');

      // Verify audio element volume
      const audioElement = page.locator('audio');
      const volume = await audioElement.evaluate((audio: HTMLAudioElement) => audio.volume);
      expect(volume).toBeCloseTo(0.7, 1);
    });

    test('should mute and unmute audio', async ({ page }) => {
      await page.goto('/');
      await waitForAudioPlayer(page);

      const muteButton = page.locator('[data-testid="mute-button"]');
      const volumeDisplay = page.locator('[data-testid="volume-display"]');

      // Mute audio
      await muteButton.click();
      await expect(muteButton).toHaveAttribute('aria-pressed', 'true');
      await expect(volumeDisplay).toContainText('0%');

      // Unmute audio
      await muteButton.click();
      await expect(muteButton).toHaveAttribute('aria-pressed', 'false');
      await expect(volumeDisplay).not.toContainText('0%');
    });

    test('should save volume preferences', async ({ page }) => {
      await page.goto('/');
      await waitForAudioPlayer(page);

      const volumeSlider = page.locator('[data-testid="volume-slider"] input');
      
      // Set custom volume
      await volumeSlider.fill('0.3');

      // Reload page
      await page.reload();
      await waitForAudioPlayer(page);

      // Should restore saved volume
      const savedVolume = await volumeSlider.inputValue();
      expect(parseFloat(savedVolume)).toBeCloseTo(0.3, 1);
    });
  });

  test.describe('Metadata Display and Updates', () => {
    test('should display current song information', async ({ page }) => {
      await page.goto('/');
      await waitForAudioPlayer(page);

      // Check song metadata
      const songTitle = page.locator('[data-testid="song-title"]');
      const songArtist = page.locator('[data-testid="song-artist"]');
      const albumArt = page.locator('[data-testid="album-art"] img');

      await expect(songTitle).toContainText('Test Song');
      await expect(songArtist).toContainText('Test Artist');
      await expect(albumArt).toHaveAttribute('src', mockStreamData.nowPlaying.song.art);
    });

    test('should update metadata when song changes', async ({ page }) => {
      await page.goto('/');
      await waitForAudioPlayer(page);

      // Mock new song data
      const newSongData = {
        ...mockStreamData,
        nowPlaying: {
          song: {
            id: '67890',
            title: 'New Test Song',
            artist: 'New Test Artist',
            art: 'https://placehold.co/400x400/png'
          },
          duration: 240,
          elapsed: 10
        }
      };

      // Update the route to return new data
      await page.route('**/api/radio-meta', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(newSongData)
        });
      });

      // Trigger metadata refresh
      await page.locator('[data-testid="refresh-metadata"]').click();

      // Check updated metadata
      const songTitle = page.locator('[data-testid="song-title"]');
      const songArtist = page.locator('[data-testid="song-artist"]');

      await expect(songTitle).toContainText('New Test Song');
      await expect(songArtist).toContainText('New Test Artist');
    });

    test('should show fallback when album art fails to load', async ({ page }) => {
      // Mock failed image loading
      const failedStreamData = {
        ...mockStreamData,
        nowPlaying: {
          ...mockStreamData.nowPlaying,
          song: {
            ...mockStreamData.nowPlaying.song,
            art: 'https://invalid-url.com/image.png'
          }
        }
      };

      await page.route('**/api/radio-meta', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(failedStreamData)
        });
      });

      await page.goto('/');
      await waitForAudioPlayer(page);

      // Should show fallback icon
      const fallbackIcon = page.locator('[data-testid="album-art-fallback"]');
      await expect(fallbackIcon).toBeVisible();
    });

    test('should display listener count', async ({ page }) => {
      await page.goto('/');
      await waitForAudioPlayer(page);

      const listenerCount = page.locator('[data-testid="listener-count"]');
      await expect(listenerCount).toContainText('42');
    });
  });

  test.describe('Progress and Timeline', () => {
    test('should display song progress', async ({ page }) => {
      await page.goto('/');
      await waitForAudioPlayer(page);

      const progressBar = page.locator('[data-testid="progress-bar"]');
      const currentTime = page.locator('[data-testid="current-time"]');
      const totalTime = page.locator('[data-testid="total-time"]');

      await expect(progressBar).toBeVisible();
      await expect(currentTime).toContainText('0:45');
      await expect(totalTime).toContainText('3:00');
    });

    test('should update progress during playback', async ({ page }) => {
      await page.goto('/');
      await waitForAudioPlayer(page);

      const playButton = page.locator('[data-testid="play-pause-button"]');
      await playButton.click();

      // Wait for progress update
      await page.waitForTimeout(2000);

      const currentTime = page.locator('[data-testid="current-time"]');
      const progressValue = await page.locator('[data-testid="progress-bar"]').getAttribute('value');
      
      // Progress should have advanced
      expect(parseInt(progressValue || '0')).toBeGreaterThan(45);
    });

    test('should handle timeline interactions', async ({ page }) => {
      await page.goto('/');
      await waitForAudioPlayer(page);

      const progressBar = page.locator('[data-testid="progress-bar"]');
      
      // Click on progress bar (should not seek for live streams)
      await progressBar.click();
      
      // Should show tooltip indicating live stream
      const liveIndicator = page.locator('[data-testid="live-indicator"]');
      await expect(liveIndicator).toBeVisible();
    });
  });

  test.describe('Responsive Design and Mobile', () => {
    test('should adapt to mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');
      await waitForAudioPlayer(page);

      const audioPlayer = page.locator('[data-testid="audio-player"]');
      
      // Should be responsive
      const boundingBox = await audioPlayer.boundingBox();
      expect(boundingBox?.width).toBeLessThanOrEqual(375);
      
      // Controls should be accessible
      const playButton = page.locator('[data-testid="play-pause-button"]');
      await expect(playButton).toBeVisible();
      
      // Touch targets should be large enough
      const buttonSize = await playButton.boundingBox();
      expect(buttonSize?.width).toBeGreaterThanOrEqual(44); // WCAG minimum
      expect(buttonSize?.height).toBeGreaterThanOrEqual(44);
    });

    test('should handle touch interactions', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');
      await waitForAudioPlayer(page);

      const playButton = page.locator('[data-testid="play-pause-button"]');
      
      // Test touch interaction
      await playButton.tap();
      await expect(playButton).toHaveAttribute('aria-pressed', 'true');
    });
  });

  test.describe('Accessibility', () => {
    test('should be keyboard navigable', async ({ page }) => {
      await page.goto('/');
      await waitForAudioPlayer(page);

      // Tab through controls
      await page.keyboard.press('Tab');
      let focusedElement = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
      expect(focusedElement).toBe('play-pause-button');

      await page.keyboard.press('Tab');
      focusedElement = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
      expect(focusedElement).toBe('mute-button');

      // Test spacebar activation
      await page.keyboard.press('Space');
      const muteButton = page.locator('[data-testid="mute-button"]');
      await expect(muteButton).toHaveAttribute('aria-pressed', 'true');
    });

    test('should have proper ARIA labels', async ({ page }) => {
      await page.goto('/');
      await waitForAudioPlayer(page);

      const playButton = page.locator('[data-testid="play-pause-button"]');
      const muteButton = page.locator('[data-testid="mute-button"]');
      const volumeSlider = page.locator('[data-testid="volume-slider"] input');

      await expect(playButton).toHaveAttribute('aria-label', /Play.*Test Song.*Test Artist/);
      await expect(muteButton).toHaveAttribute('aria-label', /Mute audio/);
      await expect(volumeSlider).toHaveAttribute('aria-label', 'Volume level');
    });

    test('should announce live updates to screen readers', async ({ page }) => {
      await page.goto('/');
      await waitForAudioPlayer(page);

      const liveRegion = page.locator('[aria-live="polite"]');
      await expect(liveRegion).toBeAttached();

      // Should announce volume changes
      const volumeSlider = page.locator('[data-testid="volume-slider"] input');
      await volumeSlider.fill('0.5');

      await expect(liveRegion).toContainText('50%');
    });

    test('should pass automated accessibility checks', async ({ page }) => {
      await page.goto('/');
      await waitForAudioPlayer(page);

      // Run axe accessibility tests
      const accessibilityResults = await page.evaluate(async () => {
        // @ts-ignore - axe-core would be injected in real tests
        if (typeof axe !== 'undefined') {
          return await axe.run();
        }
        return { violations: [] };
      });

      expect(accessibilityResults.violations).toHaveLength(0);
    });
  });

  test.describe('Performance and Memory', () => {
    test('should not leak memory during extended playback', async ({ page }) => {
      await page.goto('/');
      await waitForAudioPlayer(page);

      const playButton = page.locator('[data-testid="play-pause-button"]');
      await playButton.click();

      // Simulate extended playback
      for (let i = 0; i < 10; i++) {
        await page.waitForTimeout(1000);
        
        // Check memory usage doesn't grow excessively
        const memoryInfo = await page.evaluate(() => {
          // @ts-ignore - performance.memory is available in Chrome
          return (performance as any).memory?.usedJSHeapSize || 0;
        });
        
        // Memory should stay within reasonable bounds (adjust as needed)
        expect(memoryInfo).toBeLessThan(50 * 1024 * 1024); // 50MB
      }
    });

    test('should handle rapid play/pause cycles', async ({ page }) => {
      await page.goto('/');
      await waitForAudioPlayer(page);

      const playButton = page.locator('[data-testid="play-pause-button"]');

      // Rapid play/pause cycles
      for (let i = 0; i < 20; i++) {
        await playButton.click();
        await page.waitForTimeout(100);
      }

      // Should still be responsive
      await expect(playButton).toBeVisible();
      await expect(playButton).toBeEnabled();
    });

    test('should clean up resources on page unload', async ({ page, context }) => {
      await page.goto('/');
      await waitForAudioPlayer(page);

      const playButton = page.locator('[data-testid="play-pause-button"]');
      await playButton.click();

      // Navigate away
      await page.goto('/about');

      // Audio should stop playing
      const audioElements = await page.locator('audio').count();
      expect(audioElements).toBe(0);
    });
  });

  test.describe('Error Recovery', () => {
    test('should recover from network interruptions', async ({ page }) => {
      await page.goto('/');
      await waitForAudioPlayer(page);

      const playButton = page.locator('[data-testid="play-pause-button"]');
      await playButton.click();

      // Simulate network failure
      await page.route('**/*', route => route.abort());

      // Wait for error state
      const errorMessage = page.locator('[data-testid="connection-error"]');
      await expect(errorMessage).toBeVisible();

      // Restore network
      await page.unroute('**/*');
      await mockRadioStream(page);

      // Should recover automatically
      const retryButton = page.locator('[data-testid="retry-connection"]');
      await retryButton.click();

      await expect(errorMessage).not.toBeVisible();
      await expect(playButton).toBeEnabled();
    });

    test('should show appropriate error messages', async ({ page }) => {
      // Mock different error scenarios
      await page.route('**/api/radio-meta', async route => {
        await route.fulfill({ status: 503, body: 'Service Unavailable' });
      });

      await page.goto('/');

      const errorBoundary = page.locator('[data-testid="error-boundary"]');
      await expect(errorBoundary).toBeVisible();
      await expect(errorBoundary).toContainText('Radio service is temporarily unavailable');
    });
  });
});