/**
 * @fileoverview This file centralizes application-wide configuration variables,
 * pulling from environment variables and providing sensible defaults.
 */

import type { VisualizerConfig } from './types';

// --- AzuraCast Connection ---
// Base URL and station name are the source of truth for all AzuraCast URLs.
export const AZURACAST_BASE_URL =
  process.env.NEXT_PUBLIC_AZURACAST_BASE_URL || 'https://radio.oadro.com';
export const AZURACAST_STATION_NAME =
  process.env.NEXT_PUBLIC_AZURACAST_STATION_NAME || 'oadro';

// --- Radio Stream URLs ---
// These are now derived from the base configuration for consistency.
export const HLS_STREAM_URL = `${AZURACAST_BASE_URL}/hls/${AZURACAST_STATION_NAME}/live.m3u8`;
export const MP3_320_STREAM_URL = `${AZURACAST_BASE_URL}/listen/${AZURACAST_STATION_NAME}/320kbps.mp3`;
export const MP3_192_STREAM_URL = `${AZURACAST_BASE_URL}/listen/${AZURACAST_STATION_NAME}/radio.mp3`;

// --- Audio Processing ---
/** Must be a power of 2 between 32 and 32768. Determines frequency resolution. */
export const VISUALIZER_FFT_SIZE = 512;
/**
 * The `frequencyBinCount` available to the visualizer is half the `FFT_SIZE`.
 * These indices determine which part of the frequency data is used for each band.
 * `frequencyBinCount` for an FFT of 512 is 256.
 */
export const VISUALIZER_FREQUENCY_BANDS = {
  /** Corresponds to ~0-258Hz range. */
  BASS_END_INDEX: 3,
  /** Corresponds to ~258-3715Hz range. */
  MIDS_END_INDEX: 43,
  /** The rest is considered treble. */
} as const;

// --- Visualizer Default Configurations ---
export const DEFAULT_BASS_CONFIG: VisualizerConfig = {
  sensitivity: 5.0,
  interval: 200,
  speed: 1,
  width: 8,
  color: 'hsl(240, 90%, 60%)',
};
export const DEFAULT_MIDS_CONFIG: VisualizerConfig = {
  sensitivity: 5.0,
  interval: 150,
  speed: 2,
  width: 4,
  color: 'hsl(30, 100%, 65%)',
};
export const DEFAULT_TREBLE_CONFIG: VisualizerConfig = {
  sensitivity: 5.0,
  interval: 100,
  speed: 3,
  width: 2,
  color: 'hsl(180, 90%, 55%)',
};

// --- Radio Listener Configuration ---
export const LOCK_ID = 'radio-listener-lock';
export const LOCK_COLLECTION = 'services';
export const LOCK_TTL_SECONDS = 60; // If lock isn't updated in 60s, it's considered stale.

export const DISCORD_ID_REGEX = /^\d{17,19}$/;
