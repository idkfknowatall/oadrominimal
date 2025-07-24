import { renderHook, act } from '@testing-library/react';
import { useAudioPlayer } from '@/hooks/use-audio-player';

// Mock the mobile detection hook
jest.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false,
}));

// Mock the mobile audio optimization hook
jest.mock('@/hooks/use-mobile-audio-optimization', () => ({
  useMobileAudioOptimization: jest.fn(),
}));

// Mock the config
jest.mock('@/lib/config', () => ({
  HLS_STREAM_URL: 'https://test.example.com/stream.m3u8',
  VISUALIZER_FFT_SIZE: 512,
}));

describe('useAudioPlayer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useAudioPlayer());

    expect(result.current.isPlaying).toBe(false);
    expect(result.current.volume).toBe(1);
    expect(result.current.isMuted).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.streamUrl).toBe('https://test.example.com/stream.m3u8');
  });

  it('should toggle play/pause state', () => {
    const { result } = renderHook(() => useAudioPlayer());

    act(() => {
      result.current.togglePlayPause();
    });

    expect(result.current.isPlaying).toBe(true);
    expect(result.current.isLoading).toBe(true);

    act(() => {
      result.current.togglePlayPause();
    });

    expect(result.current.isPlaying).toBe(false);
  });

  it('should update volume', () => {
    const { result } = renderHook(() => useAudioPlayer());

    act(() => {
      result.current.setVolume(0.5);
    });

    expect(result.current.volume).toBe(0.5);
  });

  it('should toggle mute state', () => {
    const { result } = renderHook(() => useAudioPlayer());

    act(() => {
      result.current.setIsMuted(true);
    });

    expect(result.current.isMuted).toBe(true);

    act(() => {
      result.current.setIsMuted(false);
    });

    expect(result.current.isMuted).toBe(false);
  });

  it('should update stream URL', () => {
    const { result } = renderHook(() => useAudioPlayer());
    const newUrl = 'https://new.example.com/stream.m3u8';

    act(() => {
      result.current.setStreamUrl(newUrl);
    });

    expect(result.current.streamUrl).toBe(newUrl);
  });

  it('should clear error state', () => {
    const { result } = renderHook(() => useAudioPlayer());

    // Simulate an error state
    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBe(null);
  });

  it('should provide audio and analyser refs', () => {
    const { result } = renderHook(() => useAudioPlayer());

    expect(result.current.audioRef).toBeDefined();
    expect(result.current.analyserRef).toBeDefined();
    expect(typeof result.current.audioRef).toBe('object');
    expect(typeof result.current.analyserRef).toBe('object');
  });

  it('should persist stream URL to localStorage', () => {
    const { result } = renderHook(() => useAudioPlayer());
    const newUrl = 'https://persistent.example.com/stream.m3u8';

    act(() => {
      result.current.setStreamUrl(newUrl);
    });

    expect(localStorage.setItem).toHaveBeenCalledWith('oadro_stream_url', newUrl);
  });

  it('should load stream URL from localStorage on mount', () => {
    const savedUrl = 'https://saved.example.com/stream.m3u8';
    (localStorage.getItem as jest.Mock).mockReturnValue(savedUrl);

    const { result } = renderHook(() => useAudioPlayer());

    expect(localStorage.getItem).toHaveBeenCalledWith('oadro_stream_url');
    expect(result.current.streamUrl).toBe(savedUrl);
  });
});