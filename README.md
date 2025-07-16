# 🎵 OADRO AI Radio - Minimal Version

A modern, streamlined web application for radio streaming. Built with Next.js and Tailwind CSS, this platform provides a clean, live radio streaming experience with a focus on simplicity and performance.

## 🌟 Features

### ✨ **Core Features**

- **Live Radio Stream**: High-quality HLS audio streaming with a clean, modern interface.
- **Dynamic Background**: Music-reactive background visualizer that responds to the audio.
- **Cross-Platform Experience**: Fully responsive design for desktop and mobile, with background playback support via the Media Session API.
- **Real-time Metadata**: Live display of currently playing song information.
- **Audio Controls**: Standard playback controls with volume adjustment and timeline scrubbing.

### 🎧 **User Experience**

- **Minimal Interface**: Clean, distraction-free design focused on the music.
- **Performance Optimized**: Fast loading and smooth playback with efficient resource usage.
- **Mobile Friendly**: Touch-optimized controls and responsive layout for all devices.
- **Accessibility**: Keyboard navigation and screen reader support.

### 🔧 **Technical Features**

- **Modern Tech Stack**: Built with Next.js 14 (App Router), TypeScript, and Tailwind CSS.
- **Lightweight Architecture**: Simplified codebase without external database dependencies.
- **Server-Sent Events**: Real-time updates for song metadata and streaming status.
- **Production Ready**: Includes PM2 configuration for reliable deployment and process management.
- **Security Focused**: Rate limiting, CORS protection, and secure headers via middleware.

## 🏗️ Architecture

This application is built with a simplified, modern architecture focused on performance and maintainability.

- **Frontend**: The user interface is a **Next.js 14** application using the **App Router**. It leverages **React Server Components** for performance and **Client Components** for interactivity. State is managed with React Context.
- **Backend API**: The backend is composed of **Next.js Route Handlers**, which provide API endpoints for streaming metadata and system status.
- **Audio Streaming**: Direct HLS audio stream integration with real-time metadata updates via Server-Sent Events.
- **Deployment**: Production deployment using **PM2** process manager for reliability and automatic restarts.
- **Security**: Middleware-based security with rate limiting, CORS protection, and secure headers.

## 🎵 Audio Streaming

The application provides a streamlined audio experience without persistent data storage.

- **Live Stream**: Direct HLS audio stream with real-time metadata
- **Song Information**: Dynamic display of currently playing track information
- **Playback Controls**: Standard audio controls with volume and timeline management
- **Background Visualization**: Audio-reactive visual effects synchronized with the stream

## 📡 API Endpoints

Simplified API structure focused on streaming functionality:

- **`/api/radio-stream`**: Server-Sent Events endpoint for real-time radio metadata
- **`/api/song/[songId]`**: Individual song information (returns unavailable message)
- **`/api/interaction-stream`**: Event stream for system status updates

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- PM2 (for production deployment)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/idkfknowatall/oadrominimal.git
   cd oadrominimal
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables** (optional):
   Create a `.env.local` file for any custom configuration:
   ```env
   # Application Configuration
   PORT=3000
   NODE_ENV=production
   ```

4. **Run the development server**:
   ```bash
   npm run dev
   ```

5. **Open your browser** and navigate to `http://localhost:3000`

### Production Deployment

1. **Build the application**:
   ```bash
   npm run build
   ```

2. **Start with PM2**:
   ```bash
   pm2 start ecosystem.config.js
   ```

3. **Monitor the application**:
   ```bash
   pm2 status
   pm2 logs oadro-radio
   ```

## 📄 Project Documentation

For more detailed information about the project, see the following documentation:

- **[Component Architecture](docs/components.md)**: Overview of the React component structure and patterns.
- **[Audio Integration](docs/audio.md)**: Documentation of the HLS streaming implementation and metadata handling.
- **[Deployment Guide](docs/deployment.md)**: Step-by-step instructions for deploying with PM2 and process management.
- **[Development Setup](docs/development.md)**: Local development environment setup and configuration.
