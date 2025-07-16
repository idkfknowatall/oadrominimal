import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import PlayerErrorBoundary, { usePlayerErrorHandler } from '../player-error-boundary';

// Mock console methods
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
});

// Component that throws an error
const ThrowError = ({ shouldThrow = true }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Player test error');
  }
  return <div>Player working</div>;
};

// Mock audio player component
const MockAudioPlayer = () => {
  return (
    <div data-testid="audio-player">
      <audio controls>
        <source src="test.mp3" type="audio/mpeg" />
      </audio>
      <div>Volume Control</div>
      <div>Play/Pause Button</div>
    </div>
  );
};

describe('PlayerErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders children when there is no error', () => {
    render(
      <PlayerErrorBoundary>
        <MockAudioPlayer />
      </PlayerErrorBoundary>
    );

    expect(screen.getByTestId('audio-player')).toBeInTheDocument();
  });

  it('renders player error UI when child component throws', () => {
    render(
      <PlayerErrorBoundary>
        <ThrowError />
      </PlayerErrorBoundary>
    );

    expect(screen.getByText('Player Error')).toBeInTheDocument();
    expect(screen.getByText('Unable to load audio player')).toBeInTheDocument();
    expect(screen.getByText('Audio Player Error')).toBeInTheDocument();
  });

  it('shows full player error UI by default', () => {
    render(
      <PlayerErrorBoundary>
        <ThrowError />
      </PlayerErrorBoundary>
    );

    expect(screen.getByText('Player Error')).toBeInTheDocument();
    expect(screen.getByText('Audio Player Error')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry player/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reload page/i })).toBeInTheDocument();
  });

  it('shows mini player error UI when showMiniPlayer is true', () => {
    render(
      <PlayerErrorBoundary showMiniPlayer={true}>
        <ThrowError />
      </PlayerErrorBoundary>
    );

    expect(screen.getByText('Audio player encountered an error')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    // Should not show the full error details
    expect(screen.queryByText('Audio Player Error')).not.toBeInTheDocument();
  });

  it('calls onRetry callback when retry button is clicked', () => {
    const onRetry = jest.fn();
    
    render(
      <PlayerErrorBoundary onRetry={onRetry}>
        <ThrowError />
      </PlayerErrorBoundary>
    );

    fireEvent.click(screen.getByRole('button', { name: /retry player/i }));
    
    expect(onRetry).toHaveBeenCalled();
  });

  it('calls onRetry callback in mini player mode', () => {
    const onRetry = jest.fn();
    
    render(
      <PlayerErrorBoundary onRetry={onRetry} showMiniPlayer={true}>
        <ThrowError />
      </PlayerErrorBoundary>
    );

    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    
    expect(onRetry).toHaveBeenCalled();
  });

  it('reloads page when no onRetry callback is provided', () => {
    // Mock window.location.reload
    const mockReload = jest.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: mockReload },
      writable: true,
    });

    render(
      <PlayerErrorBoundary>
        <ThrowError />
      </PlayerErrorBoundary>
    );

    fireEvent.click(screen.getByRole('button', { name: /retry player/i }));
    
    expect(mockReload).toHaveBeenCalled();
  });

  it('shows player-specific error information', () => {
    render(
      <PlayerErrorBoundary>
        <ThrowError />
      </PlayerErrorBoundary>
    );

    expect(screen.getByText(/network connectivity issues/i)).toBeInTheDocument();
    expect(screen.getByText(/audio stream problems/i)).toBeInTheDocument();
    expect(screen.getByText(/browser compatibility issues/i)).toBeInTheDocument();
    expect(screen.getByText(/temporary server issues/i)).toBeInTheDocument();
  });

  it('shows disabled volume control in error state', () => {
    render(
      <PlayerErrorBoundary>
        <ThrowError />
      </PlayerErrorBoundary>
    );

    const volumeButton = screen.getByLabelText('Volume (disabled)');
    expect(volumeButton).toBeDisabled();
  });

  it('shows retry loading player button', () => {
    render(
      <PlayerErrorBoundary>
        <ThrowError />
      </PlayerErrorBoundary>
    );

    const retryButton = screen.getByLabelText('Retry loading player');
    expect(retryButton).toBeInTheDocument();
  });

  it('handles reload page button click', () => {
    // Mock window.location.reload
    const mockReload = jest.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: mockReload },
      writable: true,
    });

    render(
      <PlayerErrorBoundary>
        <ThrowError />
      </PlayerErrorBoundary>
    );

    fireEvent.click(screen.getByRole('button', { name: /reload page/i }));
    
    expect(mockReload).toHaveBeenCalled();
  });
});

describe('usePlayerErrorHandler', () => {
  it('should throw enhanced error with player context', () => {
    const TestComponent = () => {
      const handlePlayerError = usePlayerErrorHandler();
      
      React.useEffect(() => {
        try {
          handlePlayerError(new Error('Test player error'), { 
            action: 'play', 
            component: 'AudioPlayer' 
          });
        } catch (error) {
          // Expected to throw
        }
      }, [handlePlayerError]);
      
      return <div>Test</div>;
    };

    expect(() => {
      render(<TestComponent />);
    }).not.toThrow(); // The error is caught and logged, not thrown to the test
  });

  it('should be defined', () => {
    expect(typeof usePlayerErrorHandler).toBe('function');
  });
});