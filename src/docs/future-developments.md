# Future Developments

This document tracks planned features, enhancements, and ideas for the future of this application.

## High Priority

- **AI DJ (Genkit Integration)**: The primary planned AI feature is an **AI DJ**. This would involve creating a Genkit flow that analyzes real-time listener interactions (reactions, SUPER Reactions), historical song data (play counts, top-rated songs), and community sentiment to intelligently select the next song to play. This would create a dynamic and responsive playlist that truly reflects the community's mood.
- **Persisted Achievements**: The current achievement system calculates awards on-the-fly. A more robust solution would be to create `userAchievements` and `songAchievements` collections in Firestore. A server-side function (e.g., a Cloud Function triggered on interaction) would award achievements and store them. This would be more performant at scale, allow for time-based awards (e.g., "First reaction of the day"), and create a permanent record of accomplishments.
- **Discord Bot Live Updates**: Leverage the existing Discord bot to post real-time updates to a dedicated channel in the Discord server, creating a bridge between the app and the community. This could include "Now Playing" updates and announcements for when a song or user earns a new achievement.
  - **Backend Plan**:
    1.  **Configuration**: Add a `DISCORD_UPDATES_CHANNEL_ID` environment variable.
    2.  **Discord Service**: Create a new server-side service (`src/lib/discord-service.ts`) to encapsulate the logic for sending messages via the bot token.
    3.  **Trigger Integration**: Modify the `radio-listener.ts` to call this new service whenever a new song begins playing.
  - **Bot Permissions Update**:
    - The bot will require `Send Messages` and `Embed Links` permissions in the designated channel.
- **Proactive Server-Side Caching**: While the current API cache helps, it's still passive (TTL-based). The ideal architecture is for the backend to _proactively_ listen to Firestore changes (`onSnapshot`) for collections like comments and reactions. This would keep an in-memory cache on all server instances updated in real-time, providing instant API responses and maximum database efficiency without needing an external service like Redis.

## Medium Priority

### Component Refactoring Opportunities (Code Health)

- **Decompose `AudioPlayer.tsx`**: This is the largest component and could be broken down.
  - The song report `AlertDialog` logic is complex and could be extracted into its own self-contained `ReportSongDialog.tsx` component.
  - The logic for handling SUPER Reaction submission and editing could be moved into a `SongCommentBox.tsx` component.
- **Decompose `UserProfileView.tsx`**:
  - The data fetching, pagination, and search filtering logic for the activity feed is complex. This could be extracted into a custom hook, e.g., `useUserActivity(userId)`, to significantly simplify the main view component.
- **Decompose `MainNav.tsx`**:
  - The logic for rendering the user dropdown menu, including role badges and the logout button, could be extracted into a dedicated `UserMenu.tsx` component to make the main nav cleaner.

### Other Medium Priority Items

- **Visualizer Presets (Engagement)**: Add pre-configured settings profiles to the visualizer controls (e.g., "Reactive", "Ambient", "Pulse") that adjust all sensitivity, speed, and color values at once for a different feel.
- **Replace Library Search with Full-Text Search**: The current library search API is not scalable as it fetches all songs from Firestore and filters them in memory. This should be replaced with a dedicated full-text search service like Algolia or Meilisearch, with a backend function to keep the index in sync.

## Low Priority

- **Comprehensive User Guide**: Create a dedicated, multi-step tour or a more detailed help page that explains all application features in one place, building upon the new contextual help dialogs.
- **Distributed Rate Limiting**: The API rate limiting in `middleware.ts` uses an in-memory store, which is ineffective in a multi-instance environment. It should be migrated to a distributed store like Redis to ensure rate limits are applied globally and consistently.

---

### ===Completed Items===

_(Move items here as they are completed)_

- **API Performance: Server-Side Caching**: Implemented a comprehensive server-side, in-memory caching layer for all major read-only API endpoints to improve performance and significantly reduce Firestore costs.
- **Moderator Playlist Management Tools**: Build a dedicated interface for moderators to see playlist analytics and easily move successful songs from one playlist to another (e.g., from "New Discoveries" to "Community Favorites").
- **Connect Songs with their Creators**: The `creatorDiscordId` is now captured from the stream, and the backend listener attempts to find the corresponding user's Firebase UID (`creatorId`). This UID is then stored on the song document, allowing for efficient queries to show a user's creations on their profile. The UI has been updated to display the creator's avatar and link to their profile on song cards.
- **Filter and Search by Playlist**: Enhanced the Library view to allow users to filter the song list by one or more playlists. This includes filtering by date range and advanced sorting options.
- **Playlist-Specific Charts**: Created a new view or a filter on the "Top Rated" view to see the most popular songs within a specific playlist.
- **Shared `useActiveListeners` Hook**: The `ActiveListenersDialog` and `ActiveListenersDropdown` components both fetched the same data from `/api/listeners/active`. This logic has now been consolidated into a shared custom hook `useActiveListeners()` to avoid code duplication.
- **Community Leaderboards (Engagement)**: Implemented a "Tastemakers" leaderboard that ranks users based on a holistic "influence score." This score combines a user's total interactions with points awarded for listening time.
- **User Profiles & Sharing**: Implemented public user profile pages that are accessible by clicking on any user avatar. These pages show a user's name, avatar, achievements, and a searchable/paginated list of their activity.
- **Paginate User Interactions (Scalability)**: The "My Activity" and public profile views now fetch a user's interaction history in pages instead of all at once.
- **Gamification: Achievements & Badges (Engagement)**: Introduced a system to reward user and song milestones.
- **Song Reporting Feature (Community Management)**: Implemented a full-featured song reporting system with a dedicated moderator review view.
- **Moderator SUPER Reaction Deletion**: Implemented the initial moderator feature, allowing deletion of "SUPER Reactions."
- **Architectural Rework: Centralized State and Data Fetching**: Rearchitected the entire client application to use a centralized React Context (`RadioProvider`) and decoupled all major logic into dedicated custom hooks (`useAuth`, `useAudioPlayer`, etc.).
- **Architectural Rework: Server-Side Data Ingestion & SSE**: Implemented a client-independent backend listener that connects directly to the radio's metadata stream and uses a server-side proxy with Server-Sent Events (SSE) to push real-time updates to all clients.
- **API Performance: Unified Song Detail Endpoint**: Optimized the expandable song detail view by fetching all required data in a single, efficient API call.
- **UI Responsiveness: User Song Status Endpoint**: Created a dedicated endpoint to efficiently fetch a user's interaction status for a given song.
- **Data Model Denormalization & Simplification**: Added denormalized counters to user documents to speed up profile and leaderboard loads; removed the obsolete `lastPlayId` field from songs.
- **Security Hardening**: Hardened all API endpoints with server-side Firebase ID token verification, input sanitization, and rate limiting.
