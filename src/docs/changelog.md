# Changelog

All notable changes to this project will be documented in this file.

---

## [2.3.40] - 2025-09-20 - Bug Fix & Cleanup

- **Bug Fix**: Fixed a "Failed to fetch" error on the client by removing a redundant and potentially slow playlist filtering step from the `/api/songs/batch-details` endpoint. This simplifies the API and makes it more robust.
- **Code Cleanup**: Deleted several obsolete files (`creator-avatar.tsx`, `user-activity-view.tsx`, `use-user-interactions.ts`) that were no longer needed after recent refactoring, improving overall code health.

## [2.3.39] - 2025-09-19 - Data Consistency Fix

- **Bug Fix**: Fixed a critical bug where influence scores were calculated differently between the Tastemakers leaderboard and User Profiles, causing inconsistent data. The Tastemakers API was incorrectly calculating listening points at 1 per hour instead of 1 per 10 minutes.
- **Refactor**: Centralized the influence score logic into a single `calculateInfluenceScore` utility function used by both the Tastemakers and User Stats APIs to prevent future drift.
- **Test**: Added a new unit test for the `calculateInfluenceScore` utility to ensure its correctness. The old, failing data consistency integration test was removed in favor of this more robust architectural solution.

## [2.3.38] - 2025-09-18 - Data Consistency

- **Bug Fix**: Fixed a critical bug where influence scores were calculated differently between the Tastemakers leaderboard and User Profiles, causing inconsistent data.
- **Refactor**: Centralized the influence score logic into a single utility function used by both APIs to prevent future drift.
- **Test**: Added a new API-level test suite (`data-consistency.test.ts`) to assert that the raw stats and final scores are identical between the two endpoints, preventing regressions.

## [2.3.37] - 2025-09-17 - Bug Fix & Refactor

- **Bug Fix**: Corrected an inconsistent influence score calculation between the Tastemakers leaderboard and User Profiles.
- **Refactor**: Centralized the influence score logic into a single, tested utility function to prevent future drift.

## [2.3.36] - 2025-09-16 - Refactor & Test

- **Code Cleanup**: Removed obsolete code and files (`creator-avatar.tsx`, `user-activity-view.tsx`, `use-user-interactions.ts`) that were no longer needed after architectural refactoring.
- **Test**: Added a new test suite for the `userCache` utility to verify its caching, fetching, and batching logic, improving test coverage for our server-side utilities.

## [2.3.35] - 2025-09-15 - Test Fix

- **Bug Fix**: Corrected a failing component test for `AchievementBadge` by using `findByRole('tooltip')` to uniquely identify the tooltip element, resolving an issue where multiple elements with the same text were found.

## [2.3.34] - 2025-09-14 - UI Fix

- **Bug Fix**: Fixed a z-index issue where timeline popovers within the user profile sheet would render behind the sheet's background.

## [2.3.33] - 2025-09-13 - Bug Fix & Cleanup

- **Bug Fix**: Fixed a critical "Failed to fetch" error on the client by removing a call to an obsolete function in the `/api/songs/batch-details` endpoint. The route now correctly uses the rich song data prepared by the backend listener.
- **Code Cleanup**: Deleted several obsolete files (`creator-avatar.tsx`, `user-activity-view.tsx`, `use-user-interactions.ts`) that were no longer needed after recent refactoring, improving overall code health.

## [2.3.32] - 2025-09-12 - Client-Side Performance

- **Performance**: Improved client-side performance and reduced unnecessary backend requests by implementing two key optimizations:
  1.  Debounced the search input in the Music Library to prevent firing API requests on every keystroke.
  2.  Added a simple, time-based cache to the `useActiveListeners` hook to prevent redundant fetches when the listener dropdown is opened multiple times in quick succession.

## [2.3.31] - 2025-09-11 - Code Refactor

- **Refactor**: Decomposed the monolithic `MainNav.tsx` component by extracting the user dropdown menu into its own `UserMenu.tsx` component, improving code organization and separation of concerns.

## [2.3.30] - 2025-09-10 - UX Refinement

- **UX Refinement**: Reverted the user profile activity feed from an infinite scroll back to a "Load More" button. This provides a more stable and predictable user experience, resolving several complex pagination bugs.

## [2.3.29] - 2025-09-09 - Bug Fix

- **Bug Fix**: Implemented a comprehensive, two-pronged fix for the user profile activity feed pagination. The API now correctly handles exhausted lists to prevent sending duplicate data, and the client-side hook includes additional safeguards to filter out any possible duplicates. This permanently resolves the infinite loading loop and the "duplicate key" error.

## [2.3.28] - 2025-09-08 - Bug Fix

- **Bug Fix**: Implemented a comprehensive fix for the user profile activity feed pagination. The API now correctly handles exhausted lists to prevent sending duplicate data, and the client-side hook includes additional safeguards. This permanently resolves the infinite loading loop and the "duplicate key" error.

## [2.3.27] - 2025-09-07 - UX Improvement

- **UX Fix**: Improved the infinite scroll on the user profile activity feed. It now displays a clear "You've reached the beginning of the timeline" message instead of an infinite loader when all interactions have been loaded.

## [2.3.26] - 2025-09-06 - Bug Fix

- **Bug Fix**: Fixed a critical pagination bug in the user profile activity feed that caused duplicate interactions to be loaded. The API now correctly handles independent cursors for comments and reactions, and the client-side hook has been hardened to filter out any potential duplicates, resolving all `unique key` errors.

## [2.3.25] - 2025-09-05 - Bug Fix

- **Bug Fix**: Fixed a critical infinite loading bug on the user profile activity feed where paginating would repeatedly load and append the first page of one interaction type after the other type had been fully loaded. The API now correctly handles independent pagination cursors, resolving duplicate key errors.

## [2.3.24] - 2025-09-04 - Code Refactor

- **Refactor**: Decomposed the monolithic `UserProfileView.tsx` component. Extracted the complex logic for fetching, paginating, and filtering user interactions into a new `useUserActivity` custom hook. Also extracted the "Creations" tab into its own `UserCreationsTab.tsx` component. This significantly simplifies the main profile view and improves code organization and reusability.

## [2.3.23] - 2025-09-03 - UX Fix

- **Bug Fix**: Corrected the popover pinning logic on the expanded song detail timeline. Users can now click to pin/unpin interaction popovers, and they will remain visible independent of the initial scanner animation.

## [2.3.22] - 2025-09-02 - Code Refactor

- **Refactor**: Decomposed the monolithic `AudioPlayer.tsx` component into smaller, more manageable child components: `ReportSongButton.tsx` and `PlayerTimeline.tsx`. This improves code organization and maintainability by isolating distinct areas of functionality.

## [2.3.21] - 2025-09-01 - Security Hardening

- **Security**: Hardened the application by creating and deploying a `firestore.rules` file that blocks all direct client-side database reads and writes. All data access must now go through the secure, server-side API endpoints, which use Admin privileges. This significantly improves the application's security posture.

## [2.3.20] - 2025-08-31 - Architecture

- **Architecture**: Re-architected the real-time interaction stream to use a single, server-side database listener that broadcasts updates to all clients via an in-memory pub/sub system. This eliminates the previous "N listeners for N clients" problem, significantly improving performance and scalability.

## [2.3.19] - 2025-08-30 - Security Hardening

- **Security**: Hardened Firestore Security Rules to completely block all client-side database reads and writes. All data access must now go through the secure, server-side API endpoints, which use Admin privileges. This significantly improves the application's security posture.

## [2.3.18] - 2025-08-28 - Backend Performance

- **Performance**: Implemented a comprehensive server-side, in-memory caching layer for all major read-only API endpoints to improve performance and significantly reduce Firestore costs.

## [2.3.17] - 2025-08-27 - Architectural Refactor & Hardening

- **Performance**: Completed a full architectural review and confirmed that all direct client-side database reads have been eliminated. All data is now fetched through optimized, server-side API endpoints with caching, dramatically improving performance and scalability.
- **Documentation**: Updated the DevOps plan with clearer, more streamlined instructions for granting secrets access to the App Hosting backend using the Firebase CLI.

## [2.3.16] - 2025-08-27 - API Optimization

- **Performance**: Implemented server-side caching for the `/api/tastemakers` endpoint. This will dramatically reduce database reads and improve response time for the Tastemakers leaderboard.
- **Bug Fix**: Corrected the influence score calculation for listening time to match the documented rule of "1 point per 10 minutes," ensuring consistent scoring across the application.

## [2.3.15] - 2025-08-26 - Player Animation Fix

- **Bug Fix**: Fixed a bug where only one "SUPER Reaction" would trigger its full-screen animation if multiple comments were posted at the same second. The player now correctly queues and displays all comment animations.

## [2.3.14] - 2025-08-25 - Data Integrity Fix

- **Bug Fix**: Corrected the `firstPlayedAt` validation logic in the radio listener to align with specific project requirements, ensuring timestamps are only considered valid if they are after a certain date. This prevents incorrect backfills for legacy data.

## [2.3.13] - 2025-08-24 - Data Integrity Fix

- **Bug Fix**: Implemented a more robust, defensive check in the radio listener to ensure the `firstPlayedAt` timestamp is correctly backfilled or fixed if it's missing, invalid, or outside a reasonable date range. This should resolve all remaining data integrity issues.

## [2.3.12] - 2025-08-23 - Data Integrity Fix

- **Bug Fix**: Rewrote the radio listener's data processing logic to be more defensive. It now guarantees that `firstPlayedAt` and `playCount` are correctly set or backfilled for all songs, resolving data inconsistencies.
- **Security**: Added a `firestore.rules` file to enforce that all database writes must come from the secure backend, blocking any potential client-side write attempts.

## [2.3.11] - 2025-08-22 - Security Fix

- **Security Fix**: Updated the `brace-expansion` dependency to version 2.0.2 to resolve a potential ReDoS vulnerability, as suggested by Dependabot.

## [2.3.10] - 2025-08-21 - Data Integrity Fix

- **Bug Fix**: Hardened the server-side radio listener to ensure all song metadata (title, artist, etc.) is refreshed on every play, and that the `firstPlayedAt` timestamp is correctly backfilled for older song documents. This guarantees data is always up-to-date.

## [2.3.9] - 2025-08-20 - Data Integrity Fix

- **Bug Fix**: Fixed a bug in the radio listener where a song's `firstPlayedAt` timestamp would not be recorded if the song document already existed but was missing the field. The listener now correctly backfills this data.

## [2.3.8] - 2025-08-19 - Rate Limiting Fix

- **Bug Fix:** Increased API rate limits to accommodate a larger concurrent user base, addressing `429 Too Many Requests` errors observed in production logs.

## [2.3.7] - 2025-08-18 - Player Fix

- **Bug Fix**: Fixed a regression where pausing and then resuming playback would fail to restart the audio. The player logic now correctly handles resuming an already-connected stream.

## [2.3.6] - 2025-08-17 - API & UI Fixes

- **Build Fix**: Finally resolved the persistent build error `Route ... used params...` by correctly using `async/await` on the `params` object in dynamic API routes, as per Next.js 15 documentation.
- **UI Fix**: Improved visibility of the "Cancel" button in confirmation dialogs by adjusting its text color.
- **UX Fix**: The delete button for interactions in the user profile view is now larger and always visible, improving usability on mobile devices.

## [2.3.5] - 2025-08-16 - API Build Fix

- **Build Fix**: Corrected the function signatures in all dynamic API routes to align with Next.js 15 standards, resolving persistent build warnings.

## [2.3.4] - 2025-08-15 - API Build Fix

- **Build Fix**: Corrected the function signatures in all dynamic API routes to align with Next.js 15 standards, resolving persistent build warnings.

## [2.3.3] - 2025-08-14 - Build & Stability Fix

- **Build Fix**: Corrected an invalid function signature in the `/api/user/stats/[userId]` route handler that could cause build failures.

## [2.3.2] - 2025-08-13 - Player Connection Management

- **UX Fix**: Removed stream disconnect logic when the player is paused. The stream now remains connected when paused, regardless of whether the browser tab is in focus. This allows for instant playback resumption from external devices (like Bluetooth headphones) and improves overall robustness.

## [2.3.1] - 2025-08-12 - PWA Installability

- **Fix**: Added a correctly configured `site.webmanifest` file to ensure the application can be properly installed as a Progressive Web App (PWA) on mobile devices, enabling the "Add to Home Screen" prompt.

## [2.3.0] - 2025-08-11 - Scaled Rate Limiting

- **Bug Fix:** Significantly increased API rate limits to accommodate a larger concurrent user base (~200 listeners per instance). This addresses persistent `429 Too Many Requests` errors observed in production logs.

## [2.2.9] - 2025-08-10 - Rate Limiting Fix

- **Bug Fix:** Increased the API rate limits in the application middleware. The previous limits were too strict for production traffic, resulting in frequent `429 Too Many Requests` errors. The new limits are more generous and specific to each API endpoint.

## [2.2.8] - 2025-08-09 - API & Build Fixes

- **Bug Fix:** Fixed a critical server error when deleting SUPER Reactions. The API was violating Firestore transaction rules by attempting to read data after initiating a write. The transaction logic has been rewritten to perform all reads before any writes, resolving the 500 Internal Server Error.
- **Build Fix**: Corrected an invalid function signature in the `/api/user/stats/[userId]` route handler that could cause build failures.

## [2.2.7] - 2025-08-08 - UI Bug Fix

- **Bug Fix:** Fixed a z-index issue where the confirmation dialog for deleting an interaction from the user profile view would appear behind the profile sheet, making it unusable. The dialog now correctly renders on top.

## [2.2.6] - 2025-08-07 - UI Bug Fix

- **Bug Fix:** Corrected an issue in the timeline popovers for grouped reactions. The popover now correctly displays each user's individual emoji instead of showing the same emoji for everyone in the group.

## [2.2.5] - 2025-08-06 - Interaction Bug Fix (Final)

- **Bug Fix:** Fixed a critical server error when deleting reactions. The API was violating Firestore transaction rules by attempting to read data after initiating a write. The transaction logic has been rewritten to perform all reads before any writes, resolving the 500 Internal Server Error.

## [2.2.4] - 2025-08-05 - Interaction Bug Fix

- **Bug Fix:** Fixed a critical bug where deleting a reaction would fail due to an incorrect API implementation. The API now correctly uses the specific reaction's ID for deletion, making the process reliable.

## [2.2.3] - 2025-08-04 - Interaction Bug Fix

- **Fix:** Fixed an error where deleting a reaction would fail. The API now correctly identifies and deletes the reaction by its specific ID.

## [2.2.2] - 2025-08-03 - Build & Stability Fixes

- **Build Fix**: Corrected an invalid function signature in an API route handler that was causing production builds to fail.
- **Bug Fix**: Stabilized the "Recently Played" list data to prevent the expanded song detail view from unnecessarily reloading on every metadata update from the stream.

## [2.0.0] - 2025-07-06 - The Community Update

This is a major release focused on enhancing community interaction, improving performance and scalability, and hardening the application's architecture and security.

### ✨ New Features

- **Community Leaderboards**: Introduced the "Tastemakers" view, a new leaderboard that ranks users based on a holistic "influence score." This score combines a user's total interactions (reactions and SUPER Reactions) with points awarded for their total listening time (1 point per 10 minutes), rewarding both active and passive engagement.
- **Gamification: Achievements & Badges**: Implemented a comprehensive achievement system for both users and songs. Users earn badges for reaching milestones in reaction counts and listening time, while songs earn badges for high interaction counts and age. Achievements are displayed on user profiles and song cards.
- **Moderation Tools**:
  - **Song Reporting**: Users can now report the currently playing song for reasons like low audio quality or offensive content. Reporting a song blocks the user from further interaction with it.
  - **Reports View**: Added a secure "Reports" view, visible only to moderators, which groups reports by song and allows for easy review and management.
  - **SUPER Reaction Deletion**: Moderators can now delete any user's "SUPER Reaction" from the timeline or profile views.
- **Public User Profiles**: Replaced the private "My Activity" page with a unified public profile system.
  - Profiles are displayed in a non-disruptive "sheet" view, keeping the main radio experience active.
  - Any user's profile can be viewed by clicking their avatar anywhere in the app.
  - Profiles feature a stats card, achievement gallery, and a paginated, searchable feed of all their interactions.
- **Active Listener List**: The listener count in the header is now a dropdown that shows a list of recently active authenticated users, enhancing the sense of a live community.

### 🚀 Enhancements & UX

- **Unified Profile View**: Consolidated the "My Activity" and public user profile views into a single, cohesive component. The user dropdown link is now "My Profile."
- **Direct Navigation**: Implemented navigation from user activity feeds and fan lists directly to the corresponding song in the Music Library.
- **Enhanced Library Search**: The library search now supports direct lookup by a song's unique ID, making cross-app navigation instantaneous.
- **Paginated Activity Feeds**: User profiles now load interactions in pages, dramatically improving performance for active users.
- **Accurate Listener Count**: The active listeners dropdown now accurately reflects the total listenership by showing a calculated "...and X more" message that accounts for all anonymous listeners.
- **Timeline Popover Details**: Popovers on all timelines now show the precise timestamp within the song and how long ago the interaction occurred.
- **PWA Support**: Added a full set of icons and a valid web manifest to ensure broad compatibility for PWA installation on both Android and iOS devices.

### ⚡ Performance & Architecture

- **Server-Side Data Ingestion**: Implemented a robust, client-independent backend listener for capturing song data from the radio stream. A Firestore-based lock ensures only one server instance writes to the database at a time.
- **Server-Sent Events (SSE)**: Replaced all client-side polling with a robust server-side proxy that uses SSE for real-time metadata and interaction updates. This centralizes data fetching, resolves CORS issues, and dramatically improves performance and scalability.
- **API Optimization**: All data fetching is now handled by dedicated, cached API endpoints. This resolves all known listener leaks and direct database access issues from the client.
- **Atomic Operations**: The backend APIs for creating songs, reactions, and SUPER Reactions are now fully idempotent, using atomic Firestore transactions to guarantee that each unique event is processed exactly once.

### 🐛 Bug Fixes

- **Resilient Data Stream**: Implemented an SSE-first data stream with an automatic polling fallback to ensure metadata is always available, even if the primary stream from AzuraCast is unstable.
- **Timeline Navigation**: Fixed a bug where clicking an interaction on a timeline would incorrectly navigate to a user's profile instead of showing a popover.
- **Data Integrity**: Removed the obsolete `lastPlayId` field from the database schema, as it was no longer needed with the new server-side listener architecture.
