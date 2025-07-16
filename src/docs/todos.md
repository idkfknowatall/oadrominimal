# OADRO Radio - Development To-Do List

This document outlines a prioritized list of tasks for improving the performance, stability, and code quality of the application. The primary focus is on reducing Firestore costs and improving user experience.

---

## 💎 P0: Critical Performance & Cost Reduction

_These items address the most significant sources of Firestore reads and are critical for scalability and cost management._

1.  **[API Optimization] Replace Library Freetext Search:**
    - **Problem:** Text-based searches in the library view fetch all songs and filter them in memory, which is inefficient and costly.
    - **Solution:** Integrate a dedicated full-text search service (e.g., Algolia, Meilisearch, or Typesense). A Cloud Function will keep the search index in sync with the `songs` collection.

2.  **[API Optimization] Implement Proactive Server-Side Caching:**
    - **Problem:** The current `apiCache` is passive and TTL-based.
    - **Solution:** Implement a proactive in-memory cache on server instances for frequently accessed, slow-changing data (like top-rated songs or user profiles). This can be updated by a singleton listener, reducing database reads to near zero for common requests.

---

## ✨ P1: Refactoring & Code Health

_These items improve maintainability, reduce complexity, and make the codebase easier to work on._

3.  **[API Refactor] Deprecate `/api/top-rated` endpoint:**
    - **Problem:** The `/api/top-rated` endpoint has overlapping functionality with the more powerful `/api/library/search`.
    - **Solution:** Remove the `/api/top-rated` route and update the "Top Rated" view to use the `/api/library/search` endpoint with `sortBy=interactionCount`.

4.  **[Data Model] Persist Achievements in Firestore:**
    - **Problem:** Achievements are currently calculated on-the-fly, which is inefficient.
    - **Solution:** Create `userAchievements` and `songAchievements` collections. Use a Cloud Function triggered on new interactions to check for and award new achievements, creating a permanent record.

5.  **[Code Cleanup] Remove Obsolete API Routes:**
    - **Problem:** As the app evolves, some API routes (`/api/songs`, `/api/user/creations`, `/api/top-rated`) have become deprecated.
    - **Solution:** Physically delete the files for these routes to clean up the codebase.

6.  **[Code Cleanup] Remove `useUserInteractions.ts` hook:**
    - **Problem:** This hook is now obsolete after its logic was merged into `useRadioMetadata`.
    - **Solution:** Delete the `src/hooks/use-user-interactions.ts` file.

7.  **[Code Cleanup] Remove `user-activity-view.tsx` component:**
    - **Problem:** This component was consolidated into the `user-profile-view.tsx` and is no longer used.
    - **Solution:** Delete the `src/components/user-activity-view.tsx` file.

8.  **[Code Quality] Centralize Constants:**
    - **Problem:** Magic numbers and hardcoded strings (e.g., page limits, animation durations) are scattered throughout the codebase.
    - **Solution:** Move these values into `src/lib/config.ts` to improve maintainability.

9.  **[Code Quality] Abstract `fetch` calls into a typed utility:**
    - **Problem:** `fetch` calls are made directly in many components and hooks, with repetitive error handling and token attachment logic.
    - **Solution:** Create a single `api.ts` utility that wraps `fetch`, handles auth tokens, and provides consistent error handling and JSON parsing.

---

## 🐞 P2: Bug Fixes & UX Enhancements

_These items address known bugs, race conditions, and areas for user experience improvement._

10. **[Bug Fix] Prevent Recently Played Race Condition:**
    - **Problem:** A song sometimes doesn't appear in "Recently Played" because the client requests its details before the backend listener has saved it to Firestore.
    - **Solution:** Make the `useRadioMetadata` hook's logic more resilient. It should use the basic song data from the stream as a fallback if the full data from the database isn't available yet.

11. **[Bug Fix] Carousel Animation Direction:**
    - **Problem:** The main view carousel sometimes animates in the wrong direction.
    - **Solution:** Rework the carousel state management to explicitly track the direction of navigation (next/prev) and pass it to Framer Motion.

12. **[Bug Fix] SUPER Reaction Animation Queue:**
    - **Problem:** If multiple SUPER Reactions are posted at the same second, only the first one triggers the full-screen animation.
    - **Solution:** Implement a queue in the `AudioPlayer` component. When a SUPER Reaction animation completes, it checks the queue for the next one and displays it.

13. **[Bug Fix] User Profile "Creations" Tab Not Loading:**
    - **Problem:** The API endpoint for a user's creations fails due to a missing Firestore index.
    - **Solution:** Add the required composite index for `songs` collection (`creatorId` ascending, `interactionCount` descending) to `firestore.indexes.json`.

14. **[Bug Fix] Visualizer Settings Not Applying Instantly:**
    - **Problem:** Changes to visualizer controls might not be reflected immediately due to how props are passed.
    - **Solution:** Ensure the `BackgroundVisualizer` component correctly re-renders when its config props change by verifying its `useEffect` dependencies.

15. **[Bug Fix] Z-Index Fighting in UI:**
    - **Problem:** The user profile sheet, toast notifications, and dialogs can sometimes overlap incorrectly.
    - **Solution:** Conduct a z-index audit and establish a clear z-index scale in `globals.css` or the Tailwind config.

16. **[UX Enhancement] Visualizer Presets:**
    - **Problem:** The visualizer controls are powerful but complex for new users.
    - **Solution:** Add a dropdown with pre-configured presets (e.g., "Ambient", "Pulse", "Reactive") that adjust all visualizer settings at once.

17. **[UX Enhancement] Add "Load More" to Library View:**
    - **Problem:** The library view has a hardcoded limit and no way to see more results.
    - **Solution:** Implement pagination or an "infinite scroll" / "Load More" button for the library search results.

18. **[UX Enhancement] Improve Timeline Popover Behavior:**
    - **Problem:** Popovers on the interactive timeline can be finicky, sometimes closing too quickly.
    - **Solution:** Refine the `ClickablePopover` logic to have a more generous delay on mouse leave and ensure pinned popovers remain open reliably.

19. **[UX Enhancement] Add Empty States:**
    - **Problem:** Some views lack clear "empty states" when there is no data to display (e.g., no search results, no reports).
    - **Solution:** Design and implement informative empty state components for all main views.

20. **[Accessibility] Add ARIA labels to all interactive elements.**
    - **Problem:** Some buttons and controls may be missing descriptive ARIA labels for screen readers.
    - **Solution:** Audit all components in `src/components` and add `aria-label` attributes where appropriate.

21. **[Accessibility] Ensure Focus Management in Modals/Dialogs:**
    - **Problem:** When a dialog or sheet opens, focus is not always correctly trapped or returned to the trigger element on close.
    - **Solution:** Verify that all Radix-based dialog, popover, and sheet components are correctly trapping focus.

22. **[UX Enhancement] Animate Login Button:**
    - **Problem:** The login button for new users is static.
    - **Solution:** Add a subtle pulse or nudge animation to draw attention to the login button.

23. **[UX Enhancement] Add Skeletons for Loading States:**
    - **Problem:** Most views show a simple spinner while loading.
    - **Solution:** Replace spinners with skeleton loaders that mimic the final UI layout, reducing perceived loading time and layout shift.

---

## 🚀 P3: Future Features & Integrations

_These items represent new functionality to enhance the application._

24. **[Feature] AI DJ (Genkit Integration):**
    - **Description:** The primary planned AI feature. A Genkit flow would analyze real-time listener interactions and historical song data to intelligently select the next song to play.

25. **[Feature] Discord Bot Live Updates:**
    - **Description:** Leverage the Discord bot to post real-time updates (e.g., "Now Playing", new achievements) to a dedicated channel in the Discord server.

26. **[Feature] User-to-User Direct Mentions:**
    - **Description:** Allow users to @mention each other in SUPER Reactions, which would trigger a notification for the mentioned user.

27. **[Feature] Share-to-Social:**
    - **Description:** Add a "Share" button on song cards that allows users to easily post the currently playing song to social media platforms like X (Twitter) or Mastodon.

28. **[Feature] User Status / Listening Parties:**
    - **Description:** Allow users to set a temporary status or create a "listening party" that their friends can see and join.

29. **[Feature] Light Theme:**
    - **Description:** Create a light theme variant for the application and add a theme toggler.

30. **[Feature] Personal Listening Statistics:**
    - **Description:** Add a new tab to the user profile showing their personal listening history, top artists, and top genres over time.

31. **[Feature] Playlist Creation & Sharing:**
    - **Description:** Allow users to create their own playlists from songs in the library and share them with others.

32. **[Feature] Push Notifications:**
    - **Description:** Implement web push notifications to alert users when a song they love is playing or when they are mentioned.

33. **[Feature] Onboarding Tour for New Users:**
    - **Description:** Create a simple, multi-step tour that guides new users through the core features of the app (reacting, navigating views, etc.).

34. **[Feature] Moderator Song Management:**
    - **Description:** Add functionality to the "Reports" view for moderators to take action, such as temporarily removing a song from rotation or marking a report as resolved.

35. **[Feature] "For You" Recommendations:**
    - **Description:** Create a new view that uses a Genkit flow to recommend songs from the library based on a user's personal interaction history.

36. **[Feature] Keyboard Shortcut Cheatsheet:**
    - **Description:** Add a modal dialog accessible from the help tooltips that shows a list of all available keyboard shortcuts.

37. **[Feature] Global Search:**
    - **Description:** Implement a global search bar (e.g., using `Cmd+K`) that can search across songs, users, and playlists simultaneously.

38. **[Testing] Add Unit & Integration Tests:**
    - **Description:** The application currently lacks automated tests. Introduce a testing framework (like Jest and React Testing Library) and begin writing tests for critical components and hooks.

39. **[DevOps] Set Up CI/CD Pipeline for Testing:**
    - **Description:** Enhance the existing GitHub Actions workflow to run the new test suite on every push to `main`, preventing regressions.

40. **[DevOps] Implement Storybook for Component Development:**
    - **Description:** Set up Storybook to allow for isolated development and visual testing of UI components.

41. **[Monitoring] Integrate with an Error Reporting Service:**
    - **Description:** Integrate a service like Sentry or LogRocket to automatically capture and report client-side and server-side errors from production environments.

---

### ===Completed Items===

1.  **[Architectural Rework] Centralize Real-Time Interaction Stream:**
    - **Problem:** The current SSE implementation creates a new set of Firestore listeners for every connected client, causing a "read storm" (N+1 problem) and excessive costs.
    - **Solution:** Implement the "in-memory broadcaster" pattern. A single backend process (`radio-listener.ts`) will listen to Firestore changes and publish updates to a central bus. The SSE endpoint will subscribe to this bus, reducing DB listeners from N to 1.
2.  **[Security Hardening] Block All Client-Side DB Access:**
    - **Problem:** The `firestore.rules` are not restrictive enough, potentially allowing direct client-side reads/writes, bypassing API logic and security.
    - **Solution:** Update `firestore.rules` to completely block all client-side access. All data must be fetched through the secure, server-side API endpoints which use the Admin SDK.
3.  **[Component Refactor] Decompose `AudioPlayer.tsx`:**
    - **Problem:** The main audio player component is overly large and handles too many responsibilities (playback, reactions, commenting, reporting).
    - **Solution:** Extract UI and logic into smaller, focused components: `SongReportDialog.tsx` and `PlayerTimeline.tsx`.
4.  **[Component Refactor] Decompose `UserProfileView.tsx`:**
    - **Problem:** The user profile sheet contains complex logic for data fetching, pagination, and filtering.
    - **Solution:** Extract the activity feed logic into a custom hook `useUserActivity(userId)` and the "Creations" tab into its own component.
5.  **[Hook Refactor] Consolidate `useRadioMetadata` and `useUserInteractions`:**
    - **Problem:** State related to the current song's interactions is split between two hooks, which can lead to complex dependencies.
    - **Solution:** Merge all logic from `useUserInteractions` into `useRadioMetadata` to create a single source of truth for all live song and interaction data.
6.  **[Component Refactor] Decompose `MainNav.tsx`:**
    - **Problem:** The main navigation handles user state, dropdown logic, and environment badges.
    - **Solution:** Extract the user dropdown and its associated logic into a dedicated `UserMenu.tsx` component.
7.  **[UX Enhancement] Debounce Library Search:**
    - **Problem:** The library search could be triggered on every keystroke, causing unnecessary API calls.
    - **Solution:** Use the `useDebounce` hook to only trigger the search after the user has stopped typing.
