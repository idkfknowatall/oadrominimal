'use client';

import React, { useState } from 'react';
import { VotingInterface } from '../voting-interface';
import type { ClientSong, DiscordUser } from '@/lib/types';

/**
 * Demo component to showcase VotingInterface functionality
 * This component demonstrates different states and interactions
 */
export function VotingInterfaceDemo() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);

  // Mock songs for demonstration
  const mockSongs: ClientSong[] = [
    {
      id: 1,
      songId: 'song-1',
      title: 'Awesome Song',
      artist: 'Great Artist',
      albumArt: 'https://via.placeholder.com/300x300',
      genre: 'Electronic',
      duration: 240,
    },
    {
      id: 2,
      songId: 'song-2',
      title: 'Another Hit',
      artist: 'Popular Band',
      albumArt: 'https://via.placeholder.com/300x300',
      genre: 'Rock',
      duration: 180,
    },
    {
      id: 3,
      songId: 'song-3',
      title: 'Chill Vibes',
      artist: 'Ambient Collective',
      albumArt: 'https://via.placeholder.com/300x300',
      genre: 'Ambient',
      duration: 320,
    },
  ];

  // Mock user
  const mockUser: DiscordUser = {
    id: 'demo-user-123',
    username: 'DemoUser',
    avatar: 'https://via.placeholder.com/64x64',
    discriminator: '1234',
  };

  const currentSong = mockSongs[currentSongIndex];

  const handleLogin = () => {
    setIsAuthenticated(true);
    console.log('Login requested - in real app, this would trigger Discord OAuth');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
  };

  const nextSong = () => {
    setCurrentSongIndex((prev) => (prev + 1) % mockSongs.length);
  };

  const prevSong = () => {
    setCurrentSongIndex((prev) => (prev - 1 + mockSongs.length) % mockSongs.length);
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">VotingInterface Demo</h1>
        <p className="text-muted-foreground">
          Demonstrates the voting interface in different states
        </p>
      </div>

      {/* Demo Controls */}
      <div className="bg-muted/50 rounded-lg p-4 space-y-4">
        <h2 className="text-lg font-semibold">Demo Controls</h2>
        
        <div className="flex flex-wrap gap-2">
          <button
            onClick={isAuthenticated ? handleLogout : handleLogin}
            className="px-4 py-2 bg-[#5865F2] text-white rounded-md hover:bg-[#4752C4] transition-colors"
          >
            {isAuthenticated ? 'Logout' : 'Login with Discord'}
          </button>
          
          <button
            onClick={prevSong}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
          >
            Previous Song
          </button>
          
          <button
            onClick={nextSong}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
          >
            Next Song
          </button>
        </div>

        <div className="text-sm text-muted-foreground">
          <p><strong>Authentication:</strong> {isAuthenticated ? 'Logged in as DemoUser#1234' : 'Not authenticated'}</p>
          <p><strong>Current Song:</strong> {currentSong.title} by {currentSong.artist}</p>
        </div>
      </div>

      {/* Current Song Display */}
      <div className="bg-card border rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-2">Now Playing</h3>
        <div className="flex items-center gap-4">
          <img
            src={currentSong.albumArt}
            alt={`${currentSong.title} album art`}
            className="w-16 h-16 rounded-md object-cover"
          />
          <div>
            <p className="font-medium">{currentSong.title}</p>
            <p className="text-sm text-muted-foreground">{currentSong.artist}</p>
            <p className="text-xs text-muted-foreground">{currentSong.genre} • {Math.floor(currentSong.duration / 60)}:{(currentSong.duration % 60).toString().padStart(2, '0')}</p>
          </div>
        </div>
      </div>

      {/* VotingInterface Component */}
      <div className="bg-card border rounded-lg">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">Voting Interface</h3>
          <p className="text-sm text-muted-foreground">
            The main component being demonstrated
          </p>
        </div>
        
        <VotingInterface
          currentSong={currentSong}
          user={isAuthenticated ? mockUser : null}
          isAuthenticated={isAuthenticated}
          onLoginRequired={handleLogin}
          className="border-0"
        />
      </div>

      {/* State Information */}
      <div className="bg-muted/50 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-2">Component State</h3>
        <div className="text-sm space-y-1">
          <p><strong>Props passed to VotingInterface:</strong></p>
          <ul className="list-disc list-inside ml-4 space-y-1 text-muted-foreground">
            <li>currentSong: {currentSong ? `"${currentSong.title}"` : 'null'}</li>
            <li>user: {isAuthenticated ? `"${mockUser.username}#${mockUser.discriminator}"` : 'null'}</li>
            <li>isAuthenticated: {isAuthenticated.toString()}</li>
            <li>onLoginRequired: {handleLogin ? 'provided' : 'not provided'}</li>
          </ul>
        </div>
      </div>

      {/* Usage Examples */}
      <div className="bg-muted/50 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-2">Try These Scenarios</h3>
        <ul className="text-sm space-y-2 text-muted-foreground">
          <li>• <strong>Unauthenticated:</strong> Click logout to see the login prompt and disabled buttons</li>
          <li>• <strong>Authenticated:</strong> Click login to enable voting functionality</li>
          <li>• <strong>Song Changes:</strong> Use Previous/Next Song to see how voting resets</li>
          <li>• <strong>Voting:</strong> When authenticated, click like/dislike buttons to see state changes</li>
          <li>• <strong>Responsive:</strong> Resize the window to see mobile/desktop layouts</li>
        </ul>
      </div>
    </div>
  );
}

export default VotingInterfaceDemo;