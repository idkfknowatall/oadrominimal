import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import OnDemandLinks from './on-demand-links';

// Mock the platform icons
jest.mock('./icons/platforms', () => ({
  platformIcons: {
    song_youtube: () => <div data-testid="youtube-icon" />,
    song_spotify: () => <div data-testid="spotify-icon" />,
    song_soundcloud: () => <div data-testid="soundcloud-icon" />,
    song_bandcamp: () => <div data-testid="bandcamp-icon" />,
    song_suno: () => <div data-testid="suno-icon" />,
  },
  PlatformKey: jest.fn(),
}));

describe('OnDemandLinks Component', () => {
  it('renders nothing when onDemand is null', () => {
    const { container } = render(<OnDemandLinks onDemand={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when onDemand is an empty object', () => {
    const { container } = render(<OnDemandLinks onDemand={{}} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when all onDemand links are null', () => {
    const onDemand = {
      song_youtube: null,
      song_spotify: null,
    };
    const { container } = render(<OnDemandLinks onDemand={onDemand} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders platform links when valid links are provided', () => {
    const onDemand = {
      song_youtube: 'https://youtube.com/watch?v=123',
      song_spotify: 'https://open.spotify.com/track/123',
      song_suno: null, // This should be filtered out
    };

    render(<OnDemandLinks onDemand={onDemand} />);

    // Check that the YouTube link is rendered
    const youtubeLink = screen.getByTestId('youtube-icon').closest('a');
    expect(youtubeLink).toHaveAttribute(
      'href',
      'https://youtube.com/watch?v=123'
    );
    expect(youtubeLink).toHaveAttribute('target', '_blank');

    // Check that the Spotify link is rendered
    const spotifyLink = screen.getByTestId('spotify-icon').closest('a');
    expect(spotifyLink).toHaveAttribute(
      'href',
      'https://open.spotify.com/track/123'
    );

    // Check that there are only 2 links (Suno should be filtered out)
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(2);
  });
});
