import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AudioPlayer from './audio-player';
import { useRadio } from '@/contexts/radio-context';
import { Song, EnrichedComment, Reaction } from '@/lib/types';

// Mock the useRadio hook
jest.mock('@/contexts/radio-context');

// Mock child components
jest.mock('@/components/player-settings', () => {
  const PlayerSettings = () => <div data-testid="player-settings" />;
  PlayerSettings.displayName = 'PlayerSettings';
  return {
    __esModule: true,
    default: PlayerSettings,
  };
});
jest.mock('@/components/report-song-button', () => {
  const ReportSongButton = () => <div data-testid="report-song-button" />;
  ReportSongButton.displayName = 'ReportSongButton';
  return ReportSongButton;
});
jest.mock('@/components/player-timeline', () => {
  const PlayerTimeline = () => <div data-testid="player-timeline" />;
  PlayerTimeline.displayName = 'PlayerTimeline';
  return PlayerTimeline;
});
jest.mock('@/components/reactions', () => {
  const Reactions = ({
    onReaction,
    onDeleteReaction,
    isDisabled,
    hasReactedThisSong,
  }: {
    onReaction: (emoji: string, target: HTMLElement) => void;
    onDeleteReaction: () => void;
    isDisabled: boolean;
    hasReactedThisSong: boolean;
  }) => (
    <div>
      <button
        data-testid="react-button"
        onClick={() => onReaction('👍', document.createElement('button'))}
        disabled={isDisabled || hasReactedThisSong}
      >
        React
      </button>
      <button
        data-testid="delete-reaction-button"
        onClick={onDeleteReaction}
        disabled={isDisabled}
      >
        Delete Reaction
      </button>
    </div>
  );
  Reactions.displayName = 'Reactions';
  return Reactions;
});
jest.mock('@/components/KofiCta', () => {
  const KofiCta = () => <div data-testid="kofi-cta" />;
  KofiCta.displayName = 'KofiCta';
  return KofiCta;
});

const mockUseRadio = useRadio as jest.Mock;

const mockSong: Song = {
  id: 1,
  songId: 'test-song-1',
  title: 'Test Song',
  artist: 'Test Artist',
  duration: 200,
  albumArt: 'http://example.com/art.jpg',
  genre: 'Test Genre',
};

const mockUserComment: EnrichedComment = {
  id: 'comment-1',
  text: 'Great song!',
  timestamp: 30,
  user: {
    id: 'user-1',
    name: 'Test User',
    avatar: 'http://example.com/avatar.png',
  },
  songId: 'test-song-1',
  song: mockSong,
};

const mockUserReaction: Reaction = {
  id: 'reaction-1',
  emoji: '👍',
  songId: 'test-song-1',
  user: {
    id: 'user-1',
    name: 'Test User',
    avatar: 'http://example.com/avatar.png',
  },
  timestamp: 20,
};

const defaultRadioContext = {
  liveSong: mockSong,
  isPlaying: true,
  volume: 0.8,
  isMuted: false,
  progress: 50,
  comment: '',
  setComment: jest.fn(),
  commentTimestamp: null,
  setCommentTimestamp: jest.fn(),
  setFlashyCommentQueue: jest.fn(),
  isLoggedIn: false,
  isVip: false,
  hasReactedThisSong: false,
  userReaction: null,
  userComment: null,
  hasReportedThisSong: false,
  streamUrl: 'http://stream.url',
  setStreamUrl: jest.fn(),
  visualizerEnabled: true,
  setVisualizerEnabled: jest.fn(),
  commentInputRef: { current: null },
  togglePlayPause: jest.fn(),
  setVolume: jest.fn(),
  setIsMuted: jest.fn(),
  postReaction: jest.fn().mockResolvedValue({ success: true }),
  deleteReaction: jest.fn().mockResolvedValue({ success: true }),
  postComment: jest.fn().mockResolvedValue({
    success: true,
    comment: { ...mockUserComment, text: 'New Comment' },
  }),
  updateComment: jest.fn().mockResolvedValue({ success: true }),
  deleteComment: jest.fn().mockResolvedValue({ success: true }),
  postReport: jest.fn(),
  retractReport: jest.fn(),
  handleReactionTrigger: jest.fn(),
  toast: jest.fn(),
};

const renderComponent = (contextOverrides = {}) => {
  mockUseRadio.mockReturnValue({ ...defaultRadioContext, ...contextOverrides });
  return render(<AudioPlayer />);
};

describe('AudioPlayer', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders song information correctly', () => {
    renderComponent();
    expect(screen.getByText('Test Song')).toBeInTheDocument();
    expect(screen.getByText('Test Artist')).toBeInTheDocument();
    expect(screen.getByText('Test Genre')).toBeInTheDocument();
    expect(screen.getByAltText('Album art for Test Song')).toHaveAttribute(
      'src'
    );
  });

  it('calls togglePlayPause when play/pause button is clicked', () => {
    renderComponent();
    const pauseButton = screen.getByLabelText('Pause');
    fireEvent.click(pauseButton);
    expect(defaultRadioContext.togglePlayPause).toHaveBeenCalled();
  });

  it('shows play icon when not playing', () => {
    renderComponent({ isPlaying: false });
    expect(screen.getByLabelText('Play')).toBeInTheDocument();
  });

  it('renders volume controls', () => {
    renderComponent();
    expect(screen.getByLabelText('Volume control')).toBeInTheDocument();
  });

  it('handles mute toggle', () => {
    renderComponent();
    const muteButton = screen.getByLabelText('Mute');
    fireEvent.click(muteButton);
    expect(defaultRadioContext.setIsMuted).toHaveBeenCalledWith(true);
  });

  describe('Reactions', () => {
    it('calls postReaction when a reaction is made', async () => {
      renderComponent({
        isLoggedIn: true,
        isPlaying: true,
        hasReactedThisSong: false,
      });
      const reactButton = screen.getByTestId('react-button');
      await userEvent.click(reactButton);
      expect(defaultRadioContext.handleReactionTrigger).toHaveBeenCalled();
      expect(defaultRadioContext.postReaction).toHaveBeenCalled();
    });

    it('calls deleteReaction when the delete button is clicked', async () => {
      renderComponent({ isLoggedIn: true, userReaction: mockUserReaction });
      const deleteButton = screen.getByTestId('delete-reaction-button');
      await userEvent.click(deleteButton);
      expect(defaultRadioContext.deleteReaction).toHaveBeenCalled();
    });
  });

  describe('SUPER Reactions (Comments)', () => {
    it('shows comment input for VIP users', () => {
      renderComponent({ isLoggedIn: true, isVip: true });
      expect(screen.getByLabelText('Add a SUPER Reaction')).toBeInTheDocument();
    });

    it('does not show comment input for non-VIP users', () => {
      renderComponent({ isLoggedIn: true, isVip: false });
      expect(
        screen.queryByLabelText('Add a SUPER Reaction')
      ).not.toBeInTheDocument();
    });

    it('shows Kofi CTA for non-VIP users without a comment', () => {
      renderComponent({ isLoggedIn: true, isVip: false, userComment: null });
      expect(screen.getByTestId('kofi-cta')).toBeInTheDocument();
    });

    it('posts a comment when submitted', async () => {
      const user = userEvent.setup();
      const postCommentMock = jest.fn().mockResolvedValue({
        success: true,
        comment: { ...mockUserComment, text: 'My new comment' },
      });

      const contextValue = {
        ...defaultRadioContext,
        isLoggedIn: true,
        isVip: true,
        isPlaying: true,
        comment: '',
        commentTimestamp: null,
        postComment: postCommentMock,
      };

      // Mock setComment to update the context value directly
      contextValue.setComment = jest.fn((newComment) => {
        contextValue.comment = newComment;
      });
      contextValue.setCommentTimestamp = jest.fn((newTimestamp) => {
        contextValue.commentTimestamp = newTimestamp;
      });

      mockUseRadio.mockReturnValue(contextValue);

      const { rerender } = render(<AudioPlayer />);

      const textarea = screen.getByLabelText('Add a SUPER Reaction');
      await user.type(textarea, 'My new comment');

      // Rerender with the updated context value
      mockUseRadio.mockReturnValue({
        ...contextValue,
        comment: 'My new comment',
        commentTimestamp: 50, // The component sets this on change
      });

      rerender(<AudioPlayer />);

      const sendButton = screen.getByLabelText('Send SUPER Reaction');
      await user.click(sendButton);

      expect(postCommentMock).toHaveBeenCalledWith('My new comment', 50);
    });

    it("shows the user's existing comment", () => {
      renderComponent({ isLoggedIn: true, userComment: mockUserComment });
      expect(screen.getByText(`"${mockUserComment.text}"`)).toBeInTheDocument();
      expect(screen.getByLabelText('Edit SUPER Reaction')).toBeInTheDocument();
      expect(
        screen.getByLabelText('Delete SUPER Reaction')
      ).toBeInTheDocument();
    });

    it('allows editing a comment', async () => {
      const user = userEvent.setup();
      renderComponent({
        isLoggedIn: true,
        userComment: mockUserComment,
        isPlaying: true,
      });

      // Enter edit mode
      const editButton = screen.getByLabelText('Edit SUPER Reaction');
      await user.click(editButton);

      // Check that edit UI is visible
      const editInput = screen.getByLabelText('Edit your SUPER Reaction');
      expect(editInput).toBeInTheDocument();
      expect(editInput).toHaveValue(mockUserComment.text);

      // Change text and save
      await user.clear(editInput);
      await user.type(editInput, 'Updated comment');
      const saveButton = screen.getByLabelText('Save changes');
      await user.click(saveButton);

      expect(defaultRadioContext.updateComment).toHaveBeenCalledWith(
        mockUserComment.id,
        'Updated comment'
      );
    });

    it('allows deleting a comment', async () => {
      renderComponent({
        isLoggedIn: true,
        userComment: mockUserComment,
        isPlaying: true,
      });
      const deleteButton = screen.getByLabelText('Delete SUPER Reaction');
      await userEvent.click(deleteButton);
      expect(defaultRadioContext.deleteComment).toHaveBeenCalledWith(
        mockUserComment.id
      );
    });
  });

  it('disables interactions when song has been reported', () => {
    renderComponent({
      hasReportedThisSong: true,
      isLoggedIn: true,
      isVip: true,
    });
    expect(screen.getByTestId('react-button')).toBeDisabled();
    expect(
      screen.queryByLabelText('Add a SUPER Reaction')
    ).not.toBeInTheDocument();
  });
});
