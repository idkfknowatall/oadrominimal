# OADRO Radio: Application Features

This document provides a comprehensive overview of every feature available in the OADRO Radio application. It serves as the source of truth for understanding application behavior, user interactions, and core functionality.

## 1. Core Radio Experience

The heart of the application is a live, continuous audio stream with rich, real-time interactivity.

### 1.1. Audio Playback & Controls

- **Live Stream**: The application provides a high-quality, uninterrupted HLS audio stream. It is designed to be "always on."
- **Player Controls**: The central audio player allows users to:
  - **Play/Pause**: Start and stop the audio stream. On mobile, pausing and playing is handled by the native OS media controls.
  - **Volume Control**: Adjust the volume using a slider.
  - **Mute**: Instantly mute or unmute the audio.
- **Stream Quality**: Users can select their preferred stream quality from a dropdown menu, including HLS (default, adaptive quality) and direct MP3 streams at 320kbps and 192kbps for compatibility.
- **Background Playback (Media Session API)**: On compatible devices (especially mobile), the application integrates with the operating system's native media controls. When the app is in the background, users can see the current song's title, artist, and album art on their lock screen or notification shade and use the native controls to play or pause the stream.

### 1.2. Metadata Display

- **Live Song Information**: The player prominently displays the currently playing song's **title**, **artist**, **album art**, and **genre**.
- **Live Listener Count**: The main header shows a real-time count of total listeners. Clicking it opens a dropdown listing up to 10 authenticated users who have been active in the last 5 minutes.
- **Recently Played**: A list shows the last 5 songs that have played.
- **Up Next**: A list shows the next song queued to play.

## 2. Real-Time Interactivity

Users can directly influence and engage with the music as it plays. All interactions are pushed to clients in real-time via Server-Sent Events (SSE).

### 2.1. Reactions & SUPER Reactions

- **Emoji Reactions**: Any logged-in user can react to the currently playing song by clicking one of five emojis (`🔥`, `🤯`, `💖`, `🕺`, `😭`).
  - **Behavior**: A user can only react once per song.
  - **Animation**: When a user reacts, an animated version of the emoji flies from the button towards the center of the screen, accompanied by a shower of sparks, providing visual feedback.
  - **Deletion**: Users can retract their reaction from their "My Profile" view.
- **SUPER Reactions (VIP Feature)**:
  - **Eligibility**: This feature is exclusive to users with a "VIP" role, granted via Discord.
  - **Functionality**: VIP users can post a short text message (up to 50 characters) on the currently playing song.
  - **Animation**: When a SUPER Reaction is posted, it triggers a large, animated overlay that appears for **all** users currently listening. The card, featuring the user's avatar and name, bounces into view with a spring-like animation. After a few seconds, it "explodes" in a shower of particles before disappearing.
  - **Timeline**: The SUPER Reaction is also permanently added to the song's interaction timeline.
- **Interaction Lock**: If a user reports a song, they are blocked from reacting or posting a SUPER Reaction on it unless they retract the report.

### 2.2. The Interactive Timeline

The timeline is a core visual feature that maps all interactions to their precise point in the song's duration.

- **Live Player Timeline**: The progress bar in the main audio player is augmented with icons representing interactions.
  - **Display**: As the song plays, icons for reactions and user avatars for SUPER Reactions appear only **after** the playback head has passed their timestamp, creating a sense of live discovery.
  - **Hover/Click**: Hovering over or clicking an icon reveals a popover with details about the interaction (who reacted, the SUPER Reaction text, etc.).
- **Song Detail Timeline**: When a song is expanded in any view, a more detailed, static timeline is shown.
  - **Scanner Animation**: A scanner bar animates across the timeline, and as it passes each interaction marker, it triggers a brief pop-up of the interaction details, providing a dynamic playback of the song's social history.
  - **Pinning**: Users can click on any interaction marker to "pin" its popover open for closer inspection.

## 3. Main Views & Navigation

The application is organized into several distinct views, accessible via a main navigation carousel.

- **Navigation**: Users can switch between views by:
  - Clicking the navigation buttons in the header (icons on mobile, text on desktop).
  - Using the large chevron arrow buttons on the left and right of the main content area.
  - Swiping left or right on touch-screen devices.
- **Views**:
  - **Radio View**: The default and central view, containing the `AudioPlayer`, `Recently Played` list, and `Up Next` list.
  - **Top Rated View**: A leaderboard of songs ranked by their total interaction count (reactions + SUPER Reactions).
  - **Tastemakers View**: A leaderboard of the most influential users. The ranking is based on a weighted "influence score" that combines the user's total interaction count and their total listening time (1 point per 10 minutes). This view is searchable by username.
  - **Library View**: A full database of every song that has been played. Users can explicitly search by song title/artist, a specific Song ID, or a specific Creator ID. The library also supports advanced filtering by playlist and date range.
  - **About View**: A static page providing information about the application, its mission, and its core features.
  - **Reports View (Moderator Only)**: A secure view accessible only to users with the "Moderator" role. See section 6 for details.
  - **Playlist Management View (Moderator Only)**: A secure view for moderators to control the visibility of playlists. See section 6.3.

## 4. User System & Social Features

### 4.1. Song Details & Fan Lists

- **Expandable Views**: In the "Top Rated," "Library," and "Recently Played" lists, any song can be expanded by clicking on it.
- **Detailed View Content**: The expanded view reveals:
  - The detailed interactive timeline with the scanner animation.
  - Song stats, including total play count and the date it was "first seen" on the radio.
  - A "Fans" section, which displays the avatars of every user who has interacted with that song.

### 4.2. User Authentication

- **Discord OAuth**: User sign-in is handled exclusively through Discord, providing a secure and seamless authentication flow.
- **Automatic Profile Creation**: Upon first login, a user profile document is automatically created in the Firestore database, storing their public Discord name, avatar, and Discord ID.
- **Role Sync**: VIP and Moderator roles are automatically synced from Discord on login and periodically refreshed. Server owners and admins are automatically granted these roles in the app.

### 4.3. Unified User Profile

- **Profile Sheet**: Instead of a separate page, user profiles are displayed in a "sheet" that slides in from the side, keeping the main radio experience active.
- **Accessing Profiles**: A user's profile can be accessed by:
  - Clicking their avatar anywhere in the app (on a timeline, in a fan list, on the Tastemakers leaderboard).
  - Selecting "My Profile" from their own user dropdown menu in the header.
- **Profile Content**:
  - **Header**: Displays the user's avatar, name, and a "You" badge if it's their own profile.
  - **Stats Card**: A summary of their influence score, total SUPER Reactions, total reactions, and total listening time.
  - **Achievements**: A gallery of all earned achievement badges.
  - **Activity Feed**: A tab that shows a filterable and searchable list of every SUPER Reaction and reaction the user has ever made, sorted by most recent. Users can delete their own interactions from this view.
  - **Creations Tab**: A tab that displays all songs the user has submitted to the radio, sorted by popularity.

## 5. Gamification: Achievements & Badges

To encourage engagement, the app features an achievement system.

- **User Achievements**: Users earn badges for reaching milestones. Examples:
  - **Interaction-based**: "Icebreaker" (1st reaction), "Tastemaker" (250 reactions).
  - **Listening-based**: "Tuned In" (1 hour), "Radio Royalty" (1 year).
- **Song Achievements**: Songs can also earn badges. Examples:
  - **Popularity-based**: "Banger Alert" (10 interactions), "Station Anthem" (100 interactions).
  - **Age-based**: "Golden Oldie" (1+ year old), "Ancient Artifact" (5+ years old).
- **Display**: Badges are prominently displayed on user profiles and on song cards throughout the app, adding visual flair and a sense of accomplishment.

## 6. Moderation & Reporting

The application includes tools for community self-moderation.

### 6.1. Song Reporting

- **Functionality**: Any logged-in user can report the currently playing song using a dedicated button in the player.
- **Report Dialog**: A dialog appears with predefined reasons (e.g., "Low audio quality," "Offensive lyrics") and an "Other" option with a text field for custom feedback.
- **Consequences**: When a user reports a song, their existing reactions/SUPER Reactions on that track are deleted, and they are blocked from interacting with it further. They can retract their report to re-enable interactions.

### 6.2. Reports View (Moderator Only)

- **Access**: This view is only visible and accessible to users with the "Moderator" role.
- **Features**:
  - **Grouped Reports**: Reports are grouped by song, making it easy to see which tracks have multiple flags.
  - **Sorting & Filtering**: The list can be sorted by "Most Recent" or "Report Count" and can be filtered by song title or artist.
  - **Detailed View**: Expanding a song shows a table of every report, including who reported it, their reason, and when.
- **SUPER Reaction Deletion**: Moderators can delete any "SUPER Reaction" directly from the user profile view of the commenter.

### 6.3. Playlist Management (Moderator Only)

- **Access**: This view is only visible and accessible to users with the "Moderator" role.
- **Features**:
  - **Playlist List**: Displays a searchable list of all playlists ever discovered from the stream.
  - **Visibility Toggle**: A switch next to each playlist allows moderators to toggle its `hidden` status. Hidden playlists will not appear in public filter dropdowns or on song cards.

## 7. UI/UX & Technical Features

### 7.1. Visuals & Animation

- **Background Visualizer**: A dynamic, generative visualizer animates in the background, reacting to the frequency data of the live audio stream.
  - **Controls**: Users can toggle the visualizer on/off and access an advanced control panel to customize the sensitivity, speed, width, and color of the waves for the bass, mids, and treble frequencies.
  - **Settings Persistence**: A user's visualizer toggle state (on/off) and custom settings are saved to their browser's local storage.
- **UI Animations**: The application uses `Framer Motion` for smooth, physics-based animations, including:
  - The main view carousel transitions.
  - The flashy SUPER Reaction entrance and explosion.
  - Flying emoji reactions.
  - The animated login button cue for new users.

### 7.2. Environment & Development

- **Environment Badge**: To prevent confusion between development, staging, and production environments, a small, non-intrusive badge is displayed next to the site title for all non-production deployments.
- **PWA Support**: The app includes a web manifest and a full set of icons, making it installable on mobile devices for a native-like experience.
- **Global Error Boundary**: A top-level error boundary ensures that if a component crashes, the entire application does not go down. Instead, a user-friendly error page is displayed with an option to retry.
