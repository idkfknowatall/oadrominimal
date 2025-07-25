/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SongVoteDisplay } from '../song-vote-display';
import { useNowPlaying } from '@/lib/api-cache';
import type { DiscordUser } from '@/lib/types';

// Mock Next.js Image component
jest.mock('next/image', () => {
  return function MockImage({ src, alt, onError, ...props }: any) {
    return (
      <img
        src={src}
        alt={alt}
        onError={onError}
        {...props}
        data-testid="album-artwork"
      />
    );
  };
});

// Mock the api-cache hook
jest.mock('@/lib/api-cache', () => ({
  useNowPlaying: jest.fn(),
}));

// Mock the VotingInterface component
jest.mock('../voting-interface', () => ({
  VotingInterface: jest.fn(({ currentSong, user, isAuthenticated, onLoginRequired, className }) => (
    <div 
      data-testid="voting-interface"
      data-song-id={currentSong?.songId}
      data-authenticated={isAuthenticated}
      className={className}
    >
      Voting Interface for {currentSong?.title || 'No Song'}
      {onLoginRequired && (
        <button onClick={onLoginRequired} data-testid="login-button">
          Login
        </button>
      )}
    </div>
  )),
}));

const mockUseNowPlaying = useNowPlaying as jest.MockedFunction<typeof useNowPlaying>;

describe('SongVoteDisplay', () => {
  const mockUser: DiscordUser = {
    id: 'test-user-id',
    username: 'testuser',
    avatar: 'avatar-url',
    discriminator: '1234',
  };

  const mockSong = {
    id: 123,
    songId: 'song-123',
    title: 'Test Song',
    artist: 'Test Artist',
    albumArt: 'https://example.com/artwork.jpg',
    genre: 'Electronic',
    duration: 180,
    elapsed: 60,
    played_at: Date.now(),
    interactionCount: 0,
    creatorDiscordId: null,
    playlists: [],
  };

  const mockNowPlayingData = {
    liveSong: mockSong,
    upNext: [],
    recentlyPlayed: [],
    listenerCount: 42,
    isOnline: true,
  };

  const mockRefresh = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Loading State', () => {
    it('should show loading state when data is being fetched', () => {
      mockUseNowPlaying.mockReturnValue({
        data: null,
        error: null,
        isLoading: true,
        refresh: mockRefresh,
      });

      render(
        <SongVoteDisplay
          user={mockUser}
          isAuthenticated={true}
          onLoginRequired={jest.fn()}
        />
      );

      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText('Loading current song...')).toBeInTheDocument();
      expect(screen.getByLabelText('Loading song information')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should show error state when API call fails', () => {
      const mockError = new Error('Network error');
      mockUseNowPlaying.mockReturnValue({
        data: null,
        error: mockError,
        isLoading: false,
        refresh: mockRefresh,
      });

      render(
        <SongVoteDisplay
          user={mockUser}
          isAuthenticated={true}
          onLoginRequired={jest.fn()}
        />
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Failed to load song information')).toBeInTheDocument();
      expect(screen.getByText('Network error')).toBeInTheDocument();
      expect(screen.getByLabelText('Retry loading song information')).toBeInTheDocument();
    });

    it('should call refresh when retry button is clicked', () => {
      const mockError = new Error('Network error');
      mockUseNowPlaying.mockReturnValue({
        data: null,
        error: mockError,
        isLoading: false,
        refresh: mockRefresh,
      });

      render(
        <SongVoteDisplay
          user={mockUser}
          isAuthenticated={true}
          onLoginRequired={jest.fn()}
        />
      );

      const retryButton = screen.getByLabelText('Retry loading song information');
      fireEvent.click(retryButton);

      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });

    it('should show generic error message when error has no message', () => {
      mockUseNowPlaying.mockReturnValue({
        data: null,
        error: {} as Error,
        isLoading: false,
        refresh: mockRefresh,
      });

      render(
        <SongVoteDisplay
          user={mockUser}
          isAuthenticated={true}
          onLoginRequired={jest.fn()}
        />
      );

      expect(screen.getByText('Unable to connect to the radio stream')).toBeInTheDocument();
    });
  });

  describe('No Song Playing State', () => {
    it('should show no song message when liveSong is null', () => {
      mockUseNowPlaying.mockReturnValue({
        data: {
          ...mockNowPlayingData,
          liveSong: null,
        },
        error: null,
        isLoading: false,
        refresh: mockRefresh,
      });

      render(
        <SongVoteDisplay
          user={mockUser}
          isAuthenticated={true}
          onLoginRequired={jest.fn()}
        />
      );

      expect(screen.getByText('No song currently playing')).toBeInTheDocument();
      expect(screen.getByText('The radio stream may be offline or between songs')).toBeInTheDocument();
      expect(screen.getByLabelText('Check for current song')).toBeInTheDocument();
    });

    it('should show no song message when data is null', () => {
      mockUseNowPlaying.mockReturnValue({
        data: null,
        error: null,
        isLoading: false,
        refresh: mockRefresh,
      });

      render(
        <SongVoteDisplay
          user={mockUser}
          isAuthenticated={true}
          onLoginRequired={jest.fn()}
        />
      );

      expect(screen.getByText('No song currently playing')).toBeInTheDocument();
    });

    it('should call refresh when check again button is clicked', () => {
      mockUseNowPlaying.mockReturnValue({
        data: null,
        error: null,
        isLoading: false,
        refresh: mockRefresh,
      });

      render(
        <SongVoteDisplay
          user={mockUser}
          isAuthenticated={true}
          onLoginRequired={jest.fn()}
        />
      );

      const checkButton = screen.getByLabelText('Check for current song');
      fireEvent.click(checkButton);

      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });
  });

  describe('Song Display', () => {
    beforeEach(() => {
      mockUseNowPlaying.mockReturnValue({
        data: mockNowPlayingData,
        error: null,
        isLoading: false,
        refresh: mockRefresh,
      });
    });

    it('should display song information correctly', () => {
      render(
        <SongVoteDisplay
          user={mockUser}
          isAuthenticated={true}
          onLoginRequired={jest.fn()}
        />
      );

      expect(screen.getByText('Test Song')).toBeInTheDocument();
      expect(screen.getByText('by Test Artist')).toBeInTheDocument();
      expect(screen.getByText('Genre: Electronic')).toBeInTheDocument();
    });

    it('should display album artwork when available', () => {
      render(
        <SongVoteDisplay
          user={mockUser}
          isAuthenticated={true}
          onLoginRequired={jest.fn()}
        />
      );

      const artwork = screen.getByTestId('album-artwork');
      expect(artwork).toHaveAttribute('src', 'https://example.com/artwork.jpg');
      expect(artwork).toHaveAttribute('alt', 'Album artwork for Test Song by Test Artist');
    });

    it('should show fallback icon when no album artwork', () => {
      const songWithoutArt = { ...mockSong, albumArt: '' };
      mockUseNowPlaying.mockReturnValue({
        data: {
          ...mockNowPlayingData,
          liveSong: songWithoutArt,
        },
        error: null,
        isLoading: false,
        refresh: mockRefresh,
      });

      render(
        <SongVoteDisplay
          user={mockUser}
          isAuthenticated={true}
          onLoginRequired={jest.fn()}
        />
      );

      // Should not have an img element
      expect(screen.queryByTestId('album-artwork')).not.toBeInTheDocument();
    });

    it('should not display genre when not available', () => {
      const songWithoutGenre = { ...mockSong, genre: '' };
      mockUseNowPlaying.mockReturnValue({
        data: {
          ...mockNowPlayingData,
          liveSong: songWithoutGenre,
        },
        error: null,
        isLoading: false,
        refresh: mockRefresh,
      });

      render(
        <SongVoteDisplay
          user={mockUser}
          isAuthenticated={true}
          onLoginRequired={jest.fn()}
        />
      );

      expect(screen.queryByText(/Genre:/)).not.toBeInTheDocument();
    });

    it('should have refresh button that calls refresh function', () => {
      render(
        <SongVoteDisplay
          user={mockUser}
          isAuthenticated={true}
          onLoginRequired={jest.fn()}
        />
      );

      const refreshButton = screen.getByLabelText('Refresh song information');
      fireEvent.click(refreshButton);

      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });
  });

  describe('VotingInterface Integration', () => {
    beforeEach(() => {
      mockUseNowPlaying.mockReturnValue({
        data: mockNowPlayingData,
        error: null,
        isLoading: false,
        refresh: mockRefresh,
      });
    });

    it('should pass correct props to VotingInterface when authenticated', () => {
      const mockOnLoginRequired = jest.fn();

      render(
        <SongVoteDisplay
          user={mockUser}
          isAuthenticated={true}
          onLoginRequired={mockOnLoginRequired}
        />
      );

      const votingInterface = screen.getByTestId('voting-interface');
      expect(votingInterface).toHaveAttribute('data-song-id', 'song-123');
      expect(votingInterface).toHaveAttribute('data-authenticated', 'true');
      expect(votingInterface).toHaveTextContent('Voting Interface for Test Song');
    });

    it('should pass correct props to VotingInterface when not authenticated', () => {
      const mockOnLoginRequired = jest.fn();

      render(
        <SongVoteDisplay
          user={null}
          isAuthenticated={false}
          onLoginRequired={mockOnLoginRequired}
        />
      );

      const votingInterface = screen.getByTestId('voting-interface');
      expect(votingInterface).toHaveAttribute('data-authenticated', 'false');
    });

    it('should pass onLoginRequired callback to VotingInterface', () => {
      const mockOnLoginRequired = jest.fn();

      render(
        <SongVoteDisplay
          user={null}
          isAuthenticated={false}
          onLoginRequired={mockOnLoginRequired}
        />
      );

      const loginButton = screen.getByTestId('login-button');
      fireEvent.click(loginButton);

      expect(mockOnLoginRequired).toHaveBeenCalledTimes(1);
    });

    it('should not render VotingInterface when no song is playing', () => {
      mockUseNowPlaying.mockReturnValue({
        data: null,
        error: null,
        isLoading: false,
        refresh: mockRefresh,
      });

      render(
        <SongVoteDisplay
          user={mockUser}
          isAuthenticated={true}
          onLoginRequired={jest.fn()}
        />
      );

      expect(screen.queryByTestId('voting-interface')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      mockUseNowPlaying.mockReturnValue({
        data: mockNowPlayingData,
        error: null,
        isLoading: false,
        refresh: mockRefresh,
      });
    });

    it('should have proper ARIA labels and roles', () => {
      render(
        <SongVoteDisplay
          user={mockUser}
          isAuthenticated={true}
          onLoginRequired={jest.fn()}
        />
      );

      expect(screen.getByRole('region', { name: 'Current song with voting interface' })).toBeInTheDocument();
      expect(screen.getByLabelText('Refresh song information')).toBeInTheDocument();
    });

    it('should have proper loading state accessibility', () => {
      mockUseNowPlaying.mockReturnValue({
        data: null,
        error: null,
        isLoading: true,
        refresh: mockRefresh,
      });

      render(
        <SongVoteDisplay
          user={mockUser}
          isAuthenticated={true}
          onLoginRequired={jest.fn()}
        />
      );

      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByLabelText('Loading song information')).toBeInTheDocument();
    });

    it('should have proper error state accessibility', () => {
      mockUseNowPlaying.mockReturnValue({
        data: null,
        error: new Error('Test error'),
        isLoading: false,
        refresh: mockRefresh,
      });

      render(
        <SongVoteDisplay
          user={mockUser}
          isAuthenticated={true}
          onLoginRequired={jest.fn()}
        />
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByLabelText('Error loading song information')).toBeInTheDocument();
    });
  });

  describe('Custom Props', () => {
    beforeEach(() => {
      mockUseNowPlaying.mockReturnValue({
        data: mockNowPlayingData,
        error: null,
        isLoading: false,
        refresh: mockRefresh,
      });
    });

    it('should apply custom className', () => {
      const { container } = render(
        <SongVoteDisplay
          user={mockUser}
          isAuthenticated={true}
          className="custom-class"
        />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('should work without onLoginRequired callback', () => {
      render(
        <SongVoteDisplay
          user={null}
          isAuthenticated={false}
        />
      );

      // Should render without errors
      expect(screen.getByText('Test Song')).toBeInTheDocument();
    });
  });
});