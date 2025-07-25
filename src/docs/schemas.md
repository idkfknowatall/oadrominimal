# Data Schemas

This document outlines the primary data structures used throughout the OADRO Radio application, including the Firestore database schema and API endpoints.

## Firestore Collections

### `users`

Stores user profile information. A user document is created or updated upon login.

- **Document ID**: `userId` (string, from Firebase Authentication UID)
- **Data**:
  ```typescript
  interface UserDocument {
    name: string | null;
    avatar: string | null;
    discordId?: string; // The user's unique Discord ID
    updatedAt: string; // ISO 8601 timestamp
    isGuildMember?: boolean; // Is the user in the official Discord server
    isVip?: boolean; // Does the user have the VIP role in the Discord server
    isModerator?: boolean; // Does the user have the Moderator role
    firstLoginAt?: string; // ISO 8601 timestamp, set on first login
    lastLoginAt?: string; // ISO 8601 timestamp, updated on every login
    lastHeartbeatAt?: Timestamp; // Firestore server timestamp, for presence
    totalListeningSeconds?: number; // Aggregate of active listening time
    commentCount?: number; // Denormalized counter for SUPER Reactions
    reactionCount?: number; // Denormalized counter for reactions
  }
  ```

### `songs`

Stores metadata for each unique song that has had an interaction or has been processed by the backend listener.

- **Document ID**: `songId` (string)
- **Data**:
  ```typescript
  interface Song {
    songId: string;
    title: string;
    artist: string;
    albumArt: string;
    genre: string;
    duration: number;
    played_at?: number; // Unix timestamp for when the song was last played
    firstPlayedAt?: number; // Unix timestamp for when the song was first played
    playCount?: number; // Total number of times the song has been played
    interactionCount?: number; // Denormalized counter for reactions + SUPER Reactions
    creatorDiscordId?: string | null; // The Discord ID of the song's creator, captured from stream
    creatorId?: string | null; // The Firebase UID of the creator, looked up from creatorDiscordId
    creatorName?: string | null; // Denormalized creator name
    creatorAvatar?: string | null; // Denormalized creator avatar URL
    playlists?: string[]; // Array of playlist names this song has appeared in.
  }
  ```

### `playlists` (New)

Stores metadata for each unique playlist encountered by the radio listener.

- **Document ID**: `playlistId` (string, a URL-friendly slug of the playlist name)
- **Data**:
  ```typescript
  interface PlaylistDocument {
    name: string; // The original, full name of the playlist from the stream
    songCount: number; // A counter for how many songs have been played from it
    lastPlayedAt: Timestamp; // Firestore server timestamp of the last play
    plsUrl: string | null; // URL to the .pls file for the station
    m3uUrl: string | null; // URL to the .m3u file for the station
    hidden?: boolean; // If true, this playlist will not be shown in filters or on cards.
  }
  ```

### `reactions`

Stores each individual reaction from a user.

- **Document ID**: Auto-generated by Firestore
- **Data**:
  ```typescript
  interface ReactionDocument {
    songId: string; // Foreign key to the 'songs' collection
    userId: string; // Foreign key to the 'users' collection
    emoji: string;
    timestamp: number; // The point in the song (in seconds)
    createdAt: Timestamp; // Firestore server timestamp
  }
  ```

### `comments`

Stores each individual SUPER Reaction from a user.

- **Document ID**: Auto-generated by Firestore
- **Data**:
  ```typescript
  interface CommentDocument {
    songId: string; // Foreign key to the 'songs' collection
    userId: string; // Foreign key to the 'users' collection
    text: string; // The content of the SUPER Reaction
    timestamp: number; // The point in the song (in seconds)
    createdAt: Timestamp; // Firestore server timestamp
  }
  ```

### `reports`

Stores a report submitted by a user for a specific song.

- **Document ID**: Auto-generated by Firestore
- **Data**:
  ```typescript
  interface ReportDocument {
    songId: string; // Foreign key to the 'songs' collection
    userId: string; // Foreign key to the 'users' collection
    reason: string; // A short key for the report reason (e.g., "low_quality")
    createdAt: Timestamp; // Firestore server timestamp
  }
  ```

### `services`

Stores metadata for internal backend services, such as locks.

- **Document ID**: Service name (e.g., `radio-listener-lock`)
- **Data**:
  ```typescript
  interface ServiceLock {
    updatedAt: Timestamp; // Firestore server timestamp, used to check if the lock is stale
  }
  ```

---

## API & Client-Side Schemas

### API Endpoints

A summary of the application's primary API endpoints.

- **`GET /api/radio-stream`**: SSE endpoint that pushes live radio metadata and interaction updates to clients.
- **`GET /api/user/interactions`**: Fetches a paginated list of a user's interactions (SUPER Reactions and reactions).
- **`GET /api/song-details/[songId]`**: Fetches the details, SUPER Reactions, and reactions for a single song.
- **`POST /api/songs/batch-details`**: Fetches details for multiple song IDs.
- **`GET /api/user/stats/[userId]`**: Fetches a single user's profile and influence stats.
- **`GET /api/user/by-discord/[discordId]`**: Fetches a user's public profile info by their Discord ID.
- **`POST /api/user/heartbeat`**: Receives a listening heartbeat from an authenticated user to track their listening time.
- **`GET /api/user/song-status`**: Fetches a user's interaction status (reacted, SUPER Reaction, reported) for a song.
- **`POST /api/user/refresh-status`**: Forces a re-check of a user's Discord roles (VIP, Moderator).
- **`GET /api/tastemakers`**: Fetches a ranked list of the most influential users.
- **`GET /api/playlists`**: Returns a list of all non-hidden playlists.
- **`GET /api/playlists/manage`**: Fetches all playlists, including hidden ones (moderator-only).
- **`PUT /api/playlists/manage`**: Updates a playlist's hidden status (moderator-only).
- **`GET /api/library/search`**: A powerful endpoint to search, filter, and sort songs. Handles searches by text, song ID, and creator ID.
- **`GET /api/listeners/active`**: Fetches a list of recently active listeners.
- **`POST /api/comments`**: Adds a new SUPER Reaction (requires VIP status).
- **`PUT /api/comments`**: Updates an existing SUPER Reaction.
- **`DELETE /api/comments`**: Deletes a user's SUPER Reaction.
- **`POST /api/reactions`**: Adds a new reaction.
- **`DELETE /api/reactions`**: Deletes a user's reaction.
- **`POST /api/songs/report`**: Submits a report for a song.
- **`DELETE /api/songs/report`**: Retracts a report for a song.
- **`GET /api/reports`**: Fetches all song reports (moderator-only).

### Client-Side Schemas

These schemas represent the shape of data as it's used within components after being processed by the API.

- **`UserInfo`**: Represents a user's public profile information.

  ```typescript
  interface UserInfo {
    id: string;
    name: string | null;
    avatar: string | null;
  }
  ```

- **`Song`**: Represents a song entity.
  ```typescript
  interface Song {
    id: number; // Unique ID for a specific play instance (sh_id)
    songId: string; // Unique ID for the song itself
    title: string;
    artist: string;
    albumArt: string;
    genre: string;
    duration: number;
    played_at?: number;
    elapsed?: number;
    interactionCount?: number;
    playCount?: number;
    firstPlayedAt?: number;
    creatorDiscordId?: string | null;
    creatorId?: string | null;
    creatorName?: string | null; // Denormalized creator name
    creatorAvatar?: string | null; // Denormalized creator avatar URL
    playlists?: string[];
  }
  ```
- **`Playlist`**: Represents a playlist for UI display.

  ```typescript
  interface Playlist {
    id: string; // Document ID (slug)
    name: string;
    songCount: number;
    lastPlayedAt: number; // Unix timestamp
    plsUrl: string | null;
    m3uUrl: string | null;
    hidden?: boolean;
  }
  ```

- **`Reaction` & `Comment`**: An interaction object after the user information has been joined. `Comment` represents a SUPER Reaction.

  ```typescript
  interface Reaction {
    id: string;
    songId: string;
    emoji: string;
    timestamp: number;
    user: UserInfo;
    createdAt?: number;
  }

  interface Comment {
    id: string;
    songId: string;
    text: string;
    timestamp: number;
    user: UserInfo;
    createdAt?: number;
  }
  ```

---

## Real-Time Data Flow (SSE & Snapshot Listeners)

The application achieves real-time updates through a highly efficient, server-side architecture.

### How It Works

1.  **Singleton Backend Listener**: A single, global process on the server (`radio-listener.ts`) connects to the main radio metadata stream. This listener is responsible for processing all incoming song data.
2.  **Singleton Interaction Watcher**: When a new song begins, this same backend listener attaches **a single set of Firestore snapshot listeners (`onSnapshot`)** to the `comments` (SUPER Reactions) and `reactions` collections, filtered for that specific `songId`.
3.  **In-Memory Broadcasting**: We've created an in-memory publish/subscribe system (`interaction-stream.ts`). When the `onSnapshot` listeners detect a new reaction or SUPER Reaction, they process the data and "publish" the update to all subscribers.
4.  **Client SSE Subscription**: When a client loads the application, it connects to a Server-Sent Events (SSE) endpoint at `/api/radio-stream`. This endpoint does **not** create its own database listeners. Instead, it simply "subscribes" to the central, in-memory broadcaster.
5.  **Efficient Pushing**: When the broadcaster publishes an update, the SSE endpoint receives it and pushes the `interaction_update` event down the SSE connection to every connected client.

### Lifecycle & Efficiency

This architecture ensures that no matter how many users are connected, the server only ever maintains **one** active listener for SUPER Reactions and **one** for reactions for the currently playing song. This completely decouples database reads from the number of concurrent users, making the real-time functionality highly scalable and cost-effective.

When a new song begins, the singleton listener automatically detaches the old listeners and attaches new ones for the new song.
