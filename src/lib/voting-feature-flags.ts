/**
 * Temporary voting feature flags until main feature flags are updated
 * This ensures the voting system works without runtime errors
 */

// Extend the existing feature flags with voting-specific flags
const votingFeatureFlags = {
  enableVoteDebouncing: true,
  enableVotingCache: true,
  enableVotingPerformanceMonitoring: true,
  enableVotingSubscriptionPooling: true,
  enableVotingRateLimit: true,
  votingRateLimitPerMinute: 30,
};

// Export a proxy that includes both main feature flags and voting flags
import { featureFlags as mainFeatureFlags } from './feature-flags';

export const featureFlags = new Proxy(mainFeatureFlags, {
  get(target: any, prop: string) {
    // If the property exists in voting flags, return it
    if (prop in votingFeatureFlags) {
      return (votingFeatureFlags as any)[prop];
    }
    // Otherwise return from main feature flags
    return target[prop];
  }
});