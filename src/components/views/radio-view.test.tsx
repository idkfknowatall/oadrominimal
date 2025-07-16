import React from 'react';
import { render, screen } from '@testing-library/react';
import RadioView from './radio-view';
import { useRadio } from '@/contexts/radio-context';
import { Song } from '@/lib/types';

// Mock the useRadio hook
jest.mock('@/contexts/radio-context');

// Mock child components
jest.mock('@/components/audio-player', () => {
  const AudioPlayer = () => <div data-testid="audio-player" />;
  AudioPlayer.displayName = 'AudioPlayer';
  return AudioPlayer;
});
jest.mock('@/components/playlist-view', () => {
  const PlaylistView = ({ title, songs }: { title: string; songs: Song[] }) => (
    <div data-testid={`playlist-view-${title.toLowerCase().replace(' ', '-')}`}>
      <h2>{title}</h2>
      <ul>
        {songs.map((song) => (
          <li key={song.songId}>{song.title}</li>
        ))}
      </ul>
    </div>
  );
  PlaylistView.displayName = 'PlaylistView';
  return PlaylistView;
});

const mockUseRadio = useRadio as jest.Mock;

describe('RadioView', () => {
  const recentlyPlayed: Song[] = [
    {
      id: 1,
      songId: '1',
      title: 'Recent Song 1',
      artist: 'Artist 1',
      duration: 180,
      albumArt: '',
      genre: '',
    },
    {
      id: 2,
      songId: '2',
      title: 'Recent Song 2',
      artist: 'Artist 2',
      duration: 200,
      albumArt: '',
      genre: '',
    },
  ];

  const upNext: Song[] = [
    {
      id: 3,
      songId: '3',
      title: 'Next Song 1',
      artist: 'Artist 3',
      duration: 220,
      albumArt: '',
      genre: '',
    },
  ];

  beforeEach(() => {
    mockUseRadio.mockReturnValue({
      recentlyPlayed,
      upNext,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the AudioPlayer component', () => {
    render(<RadioView />);
    expect(screen.getByTestId('audio-player')).toBeInTheDocument();
  });

  it('renders the "Recently Played" playlist with correct songs', () => {
    render(<RadioView />);
    const recentlyPlayedPlaylist = screen.getByTestId(
      'playlist-view-recently-played'
    );
    expect(recentlyPlayedPlaylist).toBeInTheDocument();
    expect(screen.getByText('Recently Played')).toBeInTheDocument();
    expect(screen.getByText('Recent Song 1')).toBeInTheDocument();
    expect(screen.getByText('Recent Song 2')).toBeInTheDocument();
  });

  it('renders the "Up Next" playlist with correct songs', () => {
    render(<RadioView />);
    const upNextPlaylist = screen.getByTestId('playlist-view-up-next');
    expect(upNextPlaylist).toBeInTheDocument();
    expect(screen.getByText('Up Next')).toBeInTheDocument();
    expect(screen.getByText('Next Song 1')).toBeInTheDocument();
  });
});
