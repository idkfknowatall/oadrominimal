import { renderHook } from '@testing-library/react';
import { useRadio, RadioProvider, RadioContextType } from './radio-context';
import React from 'react';

describe('useRadio', () => {
  it('throws an error when used outside of a RadioProvider', () => {
    // Suppress the expected error from appearing in the console
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    expect(() => renderHook(() => useRadio())).toThrow(
      'useRadio must be used within a RadioProvider'
    );

    consoleErrorSpy.mockRestore();
  });

  it('does not throw an error when used within a RadioProvider', () => {
    const mockValue: RadioContextType = {
      liveSong: {
        id: 1,
        songId: 'test-song',
        title: 'Test Song',
        artist: 'Test Artist',
        albumArt: '',
        genre: 'test',
        duration: 180,
      },
      recentlyPlayed: [],
      upNext: [],
      listenerCount: 0,
      allReactions: [],
      allComments: [],
      isPlaying: false,
      volume: 1,
      isMuted: false,
      streamUrl: '',
      togglePlayPause: jest.fn(),
      setVolume: jest.fn(),
      setIsMuted: jest.fn(),
      setStreamUrl: jest.fn(),
      hasReactedThisSong: false,
      userReaction: null,
      userComment: null,
      hasReportedThisSong: false,
      userReportId: null,
      postReaction: jest.fn(),
      deleteReaction: jest.fn(),
      postComment: jest.fn(),
      updateComment: jest.fn(),
      deleteComment: jest.fn(),
      handleReactionTrigger: jest.fn(),
      postReport: jest.fn(),
      retractReport: jest.fn(),
      comment: '',
      setComment: jest.fn(),
      commentTimestamp: null,
      setCommentTimestamp: jest.fn(),
      setFlashyCommentQueue: jest.fn(),
      user: null,
      isVip: false,
      isModerator: false,
      isGuildMember: false,
      isLoggedIn: false,
      isRefreshing: false,
      forceRefreshStatus: jest.fn(),
      activeView: 'radio',
      setActiveView: jest.fn(),
      openUserProfile: jest.fn(),
      navigateToSongInLibrary: jest.fn(),
      progress: 0,
      historicalWaveform: [],
      visualizerEnabled: false,
      setVisualizerEnabled: jest.fn(),
      commentInputRef: React.createRef(),
      librarySearchInputRef: React.createRef(),
      toast: jest.fn() as any,
      isDatabaseInitialized: true,
    };
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RadioProvider value={mockValue}>{children}</RadioProvider>
    );

    const { result } = renderHook(() => useRadio(), { wrapper });

    expect(result.current).toBe(mockValue);
  });
});
