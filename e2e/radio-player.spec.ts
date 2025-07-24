import { test, expect } from '@playwright/test';

test.describe('Radio Player', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load the radio player interface', async ({ page }) => {
    // Check if the main radio interface is visible
    await expect(page.locator('[data-testid="radio-player"]')).toBeVisible();
    
    // Check for essential UI elements
    await expect(page.locator('button[aria-label*="play"]')).toBeVisible();
    await expect(page.locator('[data-testid="volume-control"]')).toBeVisible();
  });

  test('should toggle play/pause functionality', async ({ page }) => {
    const playButton = page.locator('button[aria-label*="play"]');
    
    // Initial state should be paused
    await expect(playButton).toBeVisible();
    
    // Click play button
    await playButton.click();
    
    // Button should change to pause state
    await expect(page.locator('button[aria-label*="pause"]')).toBeVisible();
    
    // Click pause button
    await page.locator('button[aria-label*="pause"]').click();
    
    // Should return to play state
    await expect(playButton).toBeVisible();
  });

  test('should display current song information', async ({ page }) => {
    // Wait for song metadata to load
    await page.waitForSelector('[data-testid="current-song"]', { timeout: 10000 });
    
    // Check if song title and artist are displayed
    const songTitle = page.locator('[data-testid="song-title"]');
    const songArtist = page.locator('[data-testid="song-artist"]');
    
    await expect(songTitle).toBeVisible();
    await expect(songArtist).toBeVisible();
    
    // Verify they contain text
    await expect(songTitle).not.toBeEmpty();
    await expect(songArtist).not.toBeEmpty();
  });

  test('should control volume', async ({ page }) => {
    const volumeSlider = page.locator('[data-testid="volume-slider"]');
    
    // Volume slider should be visible
    await expect(volumeSlider).toBeVisible();
    
    // Get initial volume value
    const initialVolume = await volumeSlider.getAttribute('aria-valuenow');
    
    // Change volume
    await volumeSlider.fill('50');
    
    // Verify volume changed
    const newVolume = await volumeSlider.getAttribute('aria-valuenow');
    expect(newVolume).not.toBe(initialVolume);
  });

  test('should mute and unmute audio', async ({ page }) => {
    const muteButton = page.locator('[data-testid="mute-button"]');
    
    await expect(muteButton).toBeVisible();
    
    // Click mute button
    await muteButton.click();
    
    // Should show muted state
    await expect(page.locator('[data-testid="mute-button"][aria-pressed="true"]')).toBeVisible();
    
    // Click again to unmute
    await muteButton.click();
    
    // Should show unmuted state
    await expect(page.locator('[data-testid="mute-button"][aria-pressed="false"]')).toBeVisible();
  });

  test('should display listener count', async ({ page }) => {
    // Wait for listener count to load
    await page.waitForSelector('[data-testid="listener-count"]', { timeout: 10000 });
    
    const listenerCount = page.locator('[data-testid="listener-count"]');
    await expect(listenerCount).toBeVisible();
    
    // Should contain a number
    const countText = await listenerCount.textContent();
    expect(countText).toMatch(/\d+/);
  });

  test('should be responsive on mobile', async ({ page, isMobile }) => {
    if (!isMobile) {
      test.skip('This test is only for mobile devices');
    }
    
    // Check if mobile layout is applied
    await expect(page.locator('[data-testid="mobile-player"]')).toBeVisible();
    
    // Verify touch-friendly controls
    const playButton = page.locator('button[aria-label*="play"]');
    const buttonSize = await playButton.boundingBox();
    
    // Button should be at least 44px for touch targets
    expect(buttonSize?.width).toBeGreaterThanOrEqual(44);
    expect(buttonSize?.height).toBeGreaterThanOrEqual(44);
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Start playing
    await page.locator('button[aria-label*="play"]').click();
    
    // Simulate network failure
    await page.route('**/*', route => route.abort());
    
    // Should show error state
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible({ timeout: 15000 });
    
    // Clear network interception
    await page.unroute('**/*');
    
    // Should allow retry
    const retryButton = page.locator('[data-testid="retry-button"]');
    if (await retryButton.isVisible()) {
      await retryButton.click();
    }
  });

  test('should persist volume settings', async ({ page, context }) => {
    // Set volume to a specific value
    await page.locator('[data-testid="volume-slider"]').fill('75');
    
    // Reload the page
    await page.reload();
    
    // Volume should be preserved
    await expect(page.locator('[data-testid="volume-slider"]')).toHaveValue('75');
  });

  test('should show recently played songs', async ({ page }) => {
    // Wait for recently played section to load
    await page.waitForSelector('[data-testid="recently-played"]', { timeout: 10000 });
    
    const recentlyPlayed = page.locator('[data-testid="recently-played"]');
    await expect(recentlyPlayed).toBeVisible();
    
    // Should contain at least one song
    const songItems = page.locator('[data-testid="recent-song-item"]');
    await expect(songItems.first()).toBeVisible();
  });

  test('should navigate between pages', async ({ page }) => {
    // Navigate to schedule page
    await page.locator('a[href="/schedule"]').click();
    await expect(page).toHaveURL('/schedule');
    
    // Navigate to requests page
    await page.locator('a[href="/requests"]').click();
    await expect(page).toHaveURL('/requests');
    
    // Navigate back to home
    await page.locator('a[href="/"]').click();
    await expect(page).toHaveURL('/');
  });
});