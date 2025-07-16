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
  USER_INTERACTIONS: '/api/user/interactions',
  USER_HEARTBEAT: '/api/user/heartbeat',
  USER_STATUS: '/api/user/status',
  USER_SONG_STATUS: '/api/user/song-status',
  SONG_DETAILS: '/api/song-details',
  SONGS_BATCH_DETAILS: '/api/songs/batch-details',
  REACTIONS: '/api/reactions',
  COMMENTS: '/api/comments',
  REPORTS: '/api/songs/report',
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

  // Reaction proximity threshold (in seconds)
  REACTION_PROXIMITY_THRESHOLD: 5,

  // Swipe gesture threshold
  SWIPE_THRESHOLD: 10000,

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
