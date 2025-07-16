/**
 * Application-wide constants
 *
 * This file centralizes all magic values (numbers and strings) used throughout
 * the application to improve maintainability and readability.
 */

// API related constants
export const API_ROUTES = {
  RADIO_STREAM: '/api/radio-stream',
  RADIO_META: '/api/radio-meta',
  // Removed unused API routes for simplified version
};

// Time-related constants (in milliseconds)
export const TIME = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,

  // Update intervals
  UPDATE_INTERVAL: 1000, // 1 second interval for updates
};

// UI-related constants
export const UI = {
  // Volume adjustment step
  VOLUME_STEP: 0.1,

  // Number of recently played songs to display
  RECENT_SONGS_COUNT: 5,

  // Volume slider step
  VOLUME_SLIDER_STEP: 0.05,

  // Animation durations
  ANIMATION_DURATION: 0.5,
};

// Default export for easier importing of all constants
const constants = {
  API_ROUTES,
  TIME,
  UI,
};

export default constants;
