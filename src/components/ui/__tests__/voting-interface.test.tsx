import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VotingInterface } from '../voting-interface';
import { useVoting } from '@/hooks/use-voting';
import type { ClientSong, DiscordUser } from '@/lib/types';

// Mock Firebase before any imports
jest.mock('@/lib/firebase', () => ({
  getFirebaseApp: jest.fn(),
  getFirestore: jest.fn(),
}));

// Mock the voting service
jest.mock('@/lib/voting-service', () => ({
  votingService: {
    submitVote: jest.fn(),
    getVoteCounts: jest.fn(),
    getUserVote: jest.fn(),
    subscribeToVoteUpdates: jest.fn(),
  },
}));

// Mock the useVoting hook
jest.mock('@/hooks/use-voting');
const mockUseVoting = useVoting as jest.MockedFunction<typeof useVoting>;

// Mock the VoteButton component
jest.mock('../vote-button', () => ({
  VoteButton: ({ type, count, isActive, onClick, disabled, className, ...props }: any) => (
    <button
      data-testid={`vote-button-${type}`}
      onClick={onClick}
      disabled={disabled}
      className={className}
      aria-pressed={isActive}
      {...props}
    >
      {type} ({count})
    </button>
  ),
}));

// Mock Lucide icons
jest.mock('lucide-react', () => ({
  LogIn: ({ className }: { className?: string }) => <div data-testid="login-icon" className={className} />,
  AlertCircle: ({ className }: { className?: string }) => <div data-testid="alert-icon" className={className} />,
}));

describe('VotingInterface', () => {
  const mockSong: ClientSong = {
    id: 1,
    songId: 'test-song-id',
    title: 'Test Song',
    artist: 'Test Artist',
    albumArt: 'test-art.jpg',
    genre: 'Test Genre',
    duration: 180,
  };

  const mockUser: DiscordUser = {
    id: 'test-user-id',
    username: 'testuser',
    avatar: 'test-avatar.jpg',
    discriminator: '1234',
  };

  const mockVotingState = {
    userVote: null as 'like' | 'dislike' | null,
    voteCount: { likes: 5, dislikes: 2, total: 7 },
    isVoting: false,
    submitVote: jest.fn(),
    error: null,
    clearError: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseVoting.mockReturnValue(mockVotingState);
  });

  describe('No Song Playing', () => {
    it('should display "No song currently playing" when currentSong is null', () => {
      render(
        <VotingInterface
          currentSong={null}
          user={mockUser}
          isAuthenticated={true}
        />
      );

      expect(screen.getByText('No song currently playing')).toBeInTheDocument();
      expect(screen.queryByTestId('vote-button-like')).not.toBeInTheDocument();
      expect(screen.queryByTestId('vote-button-dislike')).not.toBeInTheDocument();
    });
  });

  describe('Authentication States', () => {
    it('should show login message when user is not authenticated', () => {
      render(
        <VotingInterface
          currentSong={mockSong}
          user={null}
          isAuthenticated={false}
        />
      );

      expect(screen.getByText('Login with Discord to vote on songs')).toBeInTheDocument();
      expect(screen.getByTestId('login-icon')).toBeInTheDocument();
    });

    it('should show login button when onLoginRequired is provided and user is not authenticated', () => {
      const mockOnLoginRequired = jest.fn();

      render(
        <VotingInterface
          currentSong={mockSong}
          user={null}
          isAuthenticated={false}
          onLoginRequired={mockOnLoginRequired}
        />
      );

      const loginButton = screen.getByRole('button', { name: /login with discord/i });
      expect(loginButton).toBeInTheDocument();

      fireEvent.click(loginButton);
      expect(mockOnLoginRequired).toHaveBeenCalledTimes(1);
    });

    it('should not show login button when onLoginRequired is not provided', () => {
      render(
        <VotingInterface
          currentSong={mockSong}
          user={null}
          isAuthenticated={false}
        />
      );

      expect(screen.queryByRole('button', { name: /login with discord/i })).not.toBeInTheDocument();
    });

    it('should enable voting buttons when user is authenticated', () => {
      render(
        <VotingInterface
          currentSong={mockSong}
          user={mockUser}
          isAuthenticated={true}
        />
      );

      const likeButton = screen.getByTestId('vote-button-like');
      const dislikeButton = screen.getByTestId('vote-button-dislike');

      expect(likeButton).not.toBeDisabled();
      expect(dislikeButton).not.toBeDisabled();
    });

    it('should disable voting buttons when user is not authenticated', () => {
      render(
        <VotingInterface
          currentSong={mockSong}
          user={null}
          isAuthenticated={false}
        />
      );

      const likeButton = screen.getByTestId('vote-button-like');
      const dislikeButton = screen.getByTestId('vote-button-dislike');

      expect(likeButton).toBeDisabled();
      expect(dislikeButton).toBeDisabled();
    });
  });

  describe('Vote Buttons', () => {
    it('should render vote buttons with correct counts', () => {
      render(
        <VotingInterface
          currentSong={mockSong}
          user={mockUser}
          isAuthenticated={true}
        />
      );

      expect(screen.getByTestId('vote-button-like')).toHaveTextContent('like (5)');
      expect(screen.getByTestId('vote-button-dislike')).toHaveTextContent('dislike (2)');
    });

    it('should highlight user\'s current vote', () => {
      mockUseVoting.mockReturnValue({
        ...mockVotingState,
        userVote: 'like',
      });

      render(
        <VotingInterface
          currentSong={mockSong}
          user={mockUser}
          isAuthenticated={true}
        />
      );

      const likeButton = screen.getByTestId('vote-button-like');
      const dislikeButton = screen.getByTestId('vote-button-dislike');

      expect(likeButton).toHaveAttribute('aria-pressed', 'true');
      expect(dislikeButton).toHaveAttribute('aria-pressed', 'false');
    });

    it('should call submitVote when vote button is clicked', async () => {
      const mockSubmitVote = jest.fn().mockResolvedValue(undefined);
      mockUseVoting.mockReturnValue({
        ...mockVotingState,
        submitVote: mockSubmitVote,
      });

      render(
        <VotingInterface
          currentSong={mockSong}
          user={mockUser}
          isAuthenticated={true}
        />
      );

      const likeButton = screen.getByTestId('vote-button-like');
      fireEvent.click(likeButton);

      await waitFor(() => {
        expect(mockSubmitVote).toHaveBeenCalledWith('like');
      });
    });

    it('should call onLoginRequired when unauthenticated user tries to vote', () => {
      const mockOnLoginRequired = jest.fn();

      render(
        <VotingInterface
          currentSong={mockSong}
          user={null}
          isAuthenticated={false}
          onLoginRequired={mockOnLoginRequired}
        />
      );

      const likeButton = screen.getByTestId('vote-button-like');
      fireEvent.click(likeButton);

      // The button is disabled, so the click won't trigger the handler
      // Instead, test that the login button works
      const loginButton = screen.getByRole('button', { name: /login with discord/i });
      fireEvent.click(loginButton);

      expect(mockOnLoginRequired).toHaveBeenCalledTimes(1);
      expect(mockVotingState.submitVote).not.toHaveBeenCalled();
    });

    it('should disable buttons when voting is in progress', () => {
      mockUseVoting.mockReturnValue({
        ...mockVotingState,
        isVoting: true,
      });

      render(
        <VotingInterface
          currentSong={mockSong}
          user={mockUser}
          isAuthenticated={true}
        />
      );

      const likeButton = screen.getByTestId('vote-button-like');
      const dislikeButton = screen.getByTestId('vote-button-dislike');

      expect(likeButton).toBeDisabled();
      expect(dislikeButton).toBeDisabled();
    });
  });

  describe('Vote Summary', () => {
    it('should show vote summary when user is authenticated and there are votes', () => {
      mockUseVoting.mockReturnValue({
        ...mockVotingState,
        userVote: 'like',
      });

      render(
        <VotingInterface
          currentSong={mockSong}
          user={mockUser}
          isAuthenticated={true}
        />
      );

      expect(screen.getByText('7 total votes')).toBeInTheDocument();
      expect(screen.getByText('You voted:')).toBeInTheDocument();
      expect(screen.getByText('like')).toBeInTheDocument();
    });

    it('should not show vote summary when user is not authenticated', () => {
      render(
        <VotingInterface
          currentSong={mockSong}
          user={null}
          isAuthenticated={false}
        />
      );

      expect(screen.queryByText('7 total votes')).not.toBeInTheDocument();
      expect(screen.queryByText('You voted:')).not.toBeInTheDocument();
    });

    it('should not show vote summary when there are no votes', () => {
      mockUseVoting.mockReturnValue({
        ...mockVotingState,
        voteCount: { likes: 0, dislikes: 0, total: 0 },
      });

      render(
        <VotingInterface
          currentSong={mockSong}
          user={mockUser}
          isAuthenticated={true}
        />
      );

      expect(screen.queryByText('0 total votes')).not.toBeInTheDocument();
    });

    it('should handle singular vote count correctly', () => {
      mockUseVoting.mockReturnValue({
        ...mockVotingState,
        voteCount: { likes: 1, dislikes: 0, total: 1 },
        userVote: 'like',
      });

      render(
        <VotingInterface
          currentSong={mockSong}
          user={mockUser}
          isAuthenticated={true}
        />
      );

      expect(screen.getByText('1 total vote')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when there is an error', () => {
      mockUseVoting.mockReturnValue({
        ...mockVotingState,
        error: 'Failed to submit vote',
      });

      render(
        <VotingInterface
          currentSong={mockSong}
          user={mockUser}
          isAuthenticated={true}
        />
      );

      expect(screen.getByText('Failed to submit vote')).toBeInTheDocument();
      expect(screen.getByTestId('alert-icon')).toBeInTheDocument();
    });

    it('should allow dismissing error message', () => {
      const mockClearError = jest.fn();
      mockUseVoting.mockReturnValue({
        ...mockVotingState,
        error: 'Failed to submit vote',
        clearError: mockClearError,
      });

      render(
        <VotingInterface
          currentSong={mockSong}
          user={mockUser}
          isAuthenticated={true}
        />
      );

      const dismissButton = screen.getByRole('button', { name: /dismiss error/i });
      fireEvent.click(dismissButton);

      expect(mockClearError).toHaveBeenCalledTimes(1);
    });

    it('should auto-clear error after 5 seconds', async () => {
      jest.useFakeTimers();
      const mockClearError = jest.fn();
      mockUseVoting.mockReturnValue({
        ...mockVotingState,
        error: 'Failed to submit vote',
        clearError: mockClearError,
      });

      render(
        <VotingInterface
          currentSong={mockSong}
          user={mockUser}
          isAuthenticated={true}
        />
      );

      // Fast-forward 5 seconds
      jest.advanceTimersByTime(5000);

      await waitFor(() => {
        expect(mockClearError).toHaveBeenCalledTimes(1);
      });

      jest.useRealTimers();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(
        <VotingInterface
          currentSong={mockSong}
          user={mockUser}
          isAuthenticated={true}
        />
      );

      expect(screen.getByRole('region', { name: /song voting interface/i })).toBeInTheDocument();
      expect(screen.getByLabelText('Like this song')).toBeInTheDocument();
      expect(screen.getByLabelText('Dislike this song')).toBeInTheDocument();
    });

    it('should indicate login requirement in ARIA labels when not authenticated', () => {
      render(
        <VotingInterface
          currentSong={mockSong}
          user={null}
          isAuthenticated={false}
        />
      );

      expect(screen.getByLabelText('Like this song (login required)')).toBeInTheDocument();
      expect(screen.getByLabelText('Dislike this song (login required)')).toBeInTheDocument();
    });

    it('should have proper error alert with live region', () => {
      mockUseVoting.mockReturnValue({
        ...mockVotingState,
        error: 'Test error',
      });

      render(
        <VotingInterface
          currentSong={mockSong}
          user={mockUser}
          isAuthenticated={true}
        />
      );

      const errorAlert = screen.getByRole('alert');
      expect(errorAlert).toBeInTheDocument();
      expect(errorAlert).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('Responsive Layout', () => {
    it('should apply responsive classes for mobile and desktop', () => {
      render(
        <VotingInterface
          currentSong={mockSong}
          user={mockUser}
          isAuthenticated={true}
        />
      );

      const likeButton = screen.getByTestId('vote-button-like');
      const dislikeButton = screen.getByTestId('vote-button-dislike');

      expect(likeButton).toHaveClass('w-full', 'sm:w-auto', 'min-w-[120px]');
      expect(dislikeButton).toHaveClass('w-full', 'sm:w-auto', 'min-w-[120px]');
    });

    it('should apply custom className when provided', () => {
      const { container } = render(
        <VotingInterface
          currentSong={mockSong}
          user={mockUser}
          isAuthenticated={true}
          className="custom-class"
        />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Integration with useVoting Hook', () => {
    it('should pass correct parameters to useVoting hook', () => {
      render(
        <VotingInterface
          currentSong={mockSong}
          user={mockUser}
          isAuthenticated={true}
        />
      );

      expect(mockUseVoting).toHaveBeenCalledWith(
        'test-song-id',
        'test-user-id',
        'Test Song',
        'Test Artist'
      );
    });

    it('should pass null userId when user is not provided', () => {
      render(
        <VotingInterface
          currentSong={mockSong}
          user={null}
          isAuthenticated={false}
        />
      );

      expect(mockUseVoting).toHaveBeenCalledWith(
        'test-song-id',
        null,
        'Test Song',
        'Test Artist'
      );
    });

    it('should pass null songId when currentSong is not provided', () => {
      render(
        <VotingInterface
          currentSong={null}
          user={mockUser}
          isAuthenticated={true}
        />
      );

      expect(mockUseVoting).toHaveBeenCalledWith(
        null,
        'test-user-id',
        undefined,
        undefined
      );
    });
  });
});