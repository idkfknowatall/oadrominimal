# 🎵 OADRO AI Radio - A Firebase Studio Project

A modern, AI-powered web application for a community-driven radio experience. Built with Next.js, Firebase, and Tailwind CSS, this platform provides a live, interactive radio stream where listener interactions shape the playlist.

## 🌟 Features

### ✨ **For Listeners**

- **Live Radio Stream**: High-quality HLS audio streaming that's always on, with a dynamic, music-reactive background visualizer.
- **Real-time Reactions & Comments**: Interact with the currently playing song using timestamped emoji reactions. VIPs can post animated "Super Comments" that appear for everyone.
- **Community-Driven Curation**: Your interactions directly influence the AI DJ's future song selections.
- **Discord-Powered Login**: Seamless and secure authentication using your Discord account.
- **Cross-Platform Experience**: Fully responsive design for desktop and mobile, with background playback support via the Media Session API.
- **Unified Profile & Activity**: View your stats, achievements, and a complete history of your interactions in a unified profile view.

### 👥 **For Community & Moderators**

- **Community Leaderboards**: See who the top "Tastemakers" are based on their influence score, and browse the "Top Rated" songs ranked by community interactions.
- **Full Music Library**: Search the entire history of played songs by artist or title.
- **Achievements & Badges**: Earn badges for listening milestones and interaction counts, adding a fun, gamified layer to the experience.
- **Moderation Tools**: Users can report songs for issues like low quality or incorrect metadata. Moderators have a dedicated view to review these reports.

### 🔧 **Technical Features**

- **Modern Tech Stack**: Built with Next.js 14 (App Router), TypeScript, and Tailwind CSS.
- **Scalable Real-time Backend**: Uses a server-side listener and Server-Sent Events (SSE) to push live data to all clients efficiently, avoiding client-side polling.
- **Serverless Architecture**: Deployed on Firebase App Hosting with a Firestore database for all persistent data.
- **Secure by Design**: Robust Firestore Security Rules and server-side validation for all actions, including rate-limiting and XSS prevention.
- **Secure Secrets Management**: All credentials managed via Google Secret Manager, with zero secrets in the repository.

## 🏗️ Architecture

This application is built on a modern, serverless Jamstack architecture.

- **Frontend**: The user interface is a **Next.js 14** application using the **App Router**. It leverages **React Server Components** for performance and **Client Components** for interactivity. State is managed with React Context.
- **Backend API**: The backend is composed of **Next.js Route Handlers**, which provide secure, serverless API endpoints for all data operations.
- **Database**: **Cloud Firestore** acts as the primary database, storing all persistent data in a NoSQL structure.
- **Authentication**: **Firebase Authentication** handles user sign-in, using a custom **Discord OIDC provider**.
- **Hosting & Deployment**: The entire application is deployed and hosted on **Firebase App Hosting**, which integrates seamlessly with Google Secret Manager for secure credential handling.

## 💾 Database Schema

The data is stored in Cloud Firestore across several main collections. For full details, see `docs/schemas.md`.

- **`users`**: Stores public user profiles (name, avatar, Discord ID) and server-managed authorization flags (`isVip`, `isModerator`). Also stores denormalized interaction counts.
- **`songs`**: Stores metadata for every song that has been interacted with, including play counts and interaction counts.
- **`reactions`**: Contains one document for every emoji reaction from a user on a song.
- **`comments`**: Contains one document for every comment from a user on a song.
- **`reports`**: Contains documents for each song report submitted by a user for moderator review.

## 📡 API Endpoints

All backend logic is handled by Next.js Route Handlers in `src/app/api/`. See `docs/schemas.md` for a full list.

## 📄 Project Documentation

This project is documented to help developers and architects understand its structure, conventions, and features. The main entry point for all documentation is the **[Documentation Hub](./docs/README.md)**.

Key documents include:

- **[Application Features](./docs/app-features.md)**: A comprehensive breakdown of every feature in the application.
- **[Data Schemas](./docs/schemas.md)**: Describes the Firestore database schema.
- **[API Specification](./docs/openapi.yml)**: A formal OpenAPI 3.0 specification for the application's API.
- **[Development Styleguide](./docs/dev-styleguide.md)**: The official style guide for the project.
- **[Changelog](./docs/changelog.md)**: A running log of all features and bug fixes implemented.
