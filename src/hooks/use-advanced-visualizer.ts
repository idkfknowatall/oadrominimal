'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { featureFlags } from '@/lib/feature-flags';
import { usePerformanceMonitoring } from '@/hooks/use-performance-monitoring';
import { uiLogger } from '@/lib/logger';

export interface VisualizerConfig {
  type: 'bars' | 'wave' | 'circular' | 'particles' | 'spectrum';
  sensitivity: number;
  smoothing: number;
  colorScheme: 'rainbow' | 'monochrome' | 'gradient' | 'reactive';
  particleCount?: number;
  barCount?: number;
  lineWidth?: number;
  amplitude?: number;
  responsive: boolean;
  showFPS: boolean;
}

export interface AudioData {
  frequencyData: Uint8Array;
  timeData: Uint8Array;
  volume: number;
  peak: number;
  bassLevel: number;
  midsLevel: number;
  trebleLevel: number;
}

const DEFAULT_CONFIG: VisualizerConfig = {
  type: 'bars',
  sensitivity: 1.0,
  smoothing: 0.8,
  colorScheme: 'rainbow',
  particleCount: 100,
  barCount: 64,
  lineWidth: 2,
  amplitude: 1.0,
  responsive: true,
  showFPS: false,
};

/**
 * Advanced audio visualizer with multiple visualization types and performance optimization
 */
export function useAdvancedVisualizer(
  analyserRef: React.RefObject<AnalyserNode>,
  config: Partial<VisualizerConfig> = {}
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const [isActive, setIsActive] = useState(false);
  const [fps, setFps] = useState(0);
  const [visualizerConfig, setVisualizerConfig] = useState<VisualizerConfig>({
    ...DEFAULT_CONFIG,
    ...config,
  });

  const performance = usePerformanceMonitoring();
  const lastFrameTime = useRef(0);
  const frameCount = useRef(0);
  const fpsUpdateTime = useRef(0);

  // Particle system for particle visualizer
  const particlesRef = useRef<Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
    size: number;
    color: string;
  }>>([]);

  // Smoothed frequency data for better visualization
  const smoothedDataRef = useRef<Float32Array>();

  // Color generation utilities
  const getColor = useCallback((index: number, total: number, intensity: number): string => {
    const { colorScheme } = visualizerConfig;
    
    switch (colorScheme) {
      case 'rainbow':
        const hue = (index / total) * 360;
        return `hsl(${hue}, 70%, ${30 + intensity * 40}%)`;
      
      case 'monochrome':
        const brightness = 30 + intensity * 60;
        return `hsl(240, 90%, ${brightness}%)`;
      
      case 'gradient':
        const ratio = index / total;
        const r = Math.floor(255 * (1 - ratio) + 138 * ratio);
        const g = Math.floor(0 * (1 - ratio) + 43 * ratio);
        const b = Math.floor(255 * (1 - ratio) + 226 * ratio);
        const alpha = 0.3 + intensity * 0.7;
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
      
      case 'reactive':
        const bassHue = 0; // Red for bass
        const midsHue = 120; // Green for mids
        const trebleHue = 240; // Blue for treble
        
        if (index < total * 0.33) {
          return `hsl(${bassHue}, 70%, ${30 + intensity * 40}%)`;
        } else if (index < total * 0.66) {
          return `hsl(${midsHue}, 70%, ${30 + intensity * 40}%)`;
        } else {
          return `hsl(${trebleHue}, 70%, ${30 + intensity * 40}%)`;
        }
      
      default:
        return `hsl(240, 90%, ${30 + intensity * 40}%)`;
    }
  }, [visualizerConfig.colorScheme, visualizerConfig]);

  // Process audio data
  const processAudioData = useCallback((analyser: AnalyserNode): AudioData => {
    const bufferLength = analyser.frequencyBinCount;
    const frequencyData = new Uint8Array(bufferLength);
    const timeData = new Uint8Array(bufferLength);
    
    analyser.getByteFrequencyData(frequencyData);
    analyser.getByteTimeDomainData(timeData);

    // Calculate audio metrics
    const volume = frequencyData.reduce((sum, value) => sum + value, 0) / bufferLength / 255;
    const peak = Math.max(...frequencyData) / 255;
    
    // Calculate frequency band levels
    const bassEnd = Math.floor(bufferLength * 0.1);
    const midsEnd = Math.floor(bufferLength * 0.4);
    
    const bassLevel = frequencyData.slice(0, bassEnd).reduce((sum, value) => sum + value, 0) / bassEnd / 255;
    const midsLevel = frequencyData.slice(bassEnd, midsEnd).reduce((sum, value) => sum + value, 0) / (midsEnd - bassEnd) / 255;
    const trebleLevel = frequencyData.slice(midsEnd).reduce((sum, value) => sum + value, 0) / (bufferLength - midsEnd) / 255;

    return {
      frequencyData,
      timeData,
      volume,
      peak,
      bassLevel,
      midsLevel,
      trebleLevel,
    };
  }, []);

  // Smooth frequency data
  const smoothFrequencyData = useCallback((newData: Uint8Array): Float32Array => {
    if (!smoothedDataRef.current) {
      smoothedDataRef.current = new Float32Array(newData.length);
    }

    const smoothing = visualizerConfig.smoothing;
    const sensitivity = visualizerConfig.sensitivity;

    for (let i = 0; i < newData.length; i++) {
      const value = newData[i] ?? 0;
      const targetValue = (value / 255) * sensitivity;
      smoothedDataRef.current[i] = (smoothedDataRef.current[i] ?? 0) * smoothing + targetValue * (1 - smoothing);
    }

    return smoothedDataRef.current;
  }, [visualizerConfig.smoothing, visualizerConfig.sensitivity]);

  // Bar visualizer
  const drawBars = useCallback((
    ctx: CanvasRenderingContext2D,
    audioData: AudioData,
    width: number,
    height: number
  ) => {
    const { barCount } = visualizerConfig;
    const smoothedData = smoothFrequencyData(audioData.frequencyData);
    const barWidth = width / (barCount ?? 64);
    const maxBarHeight = height * 0.8;

    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < (barCount ?? 64); i++) {
      const dataIndex = Math.floor((i / (barCount ?? 64)) * smoothedData.length);
      const barHeight = (smoothedData[dataIndex] ?? 0) * maxBarHeight;
      
      const x = i * barWidth;
      const y = height - barHeight;
      
      ctx.fillStyle = getColor(i, barCount ?? 64, smoothedData[dataIndex] ?? 0);
      ctx.fillRect(x, y, barWidth - 1, barHeight);
      
      // Add glow effect
      if ((smoothedData[dataIndex] ?? 0) > 0.5) {
        ctx.shadowBlur = 10;
        ctx.shadowColor = ctx.fillStyle;
        ctx.fillRect(x, y, barWidth - 1, barHeight);
        ctx.shadowBlur = 0;
      }
    }
  }, [visualizerConfig, smoothFrequencyData, getColor]);

  // Wave visualizer
  const drawWave = useCallback((
    ctx: CanvasRenderingContext2D,
    audioData: AudioData,
    width: number,
    height: number
  ) => {
    const { lineWidth, amplitude } = visualizerConfig;
    const centerY = height / 2;
    const smoothedData = smoothFrequencyData(audioData.timeData);

    ctx.clearRect(0, 0, width, height);
    ctx.lineWidth = lineWidth || 2;
    ctx.strokeStyle = getColor(0, 1, audioData.volume);

    ctx.beginPath();
    for (let i = 0; i < smoothedData.length; i++) {
      const x = (i / smoothedData.length) * width;
      const y = centerY + (smoothedData[i] - 0.5) * centerY * (amplitude || 1);
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  }, [visualizerConfig, smoothFrequencyData, getColor]);

  // Circular visualizer
  const drawCircular = useCallback((
    ctx: CanvasRenderingContext2D,
    audioData: AudioData,
    width: number,
    height: number
  ) => {
    const { barCount } = visualizerConfig;
    const smoothedData = smoothFrequencyData(audioData.frequencyData);
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.3;
    const maxBarLength = Math.min(width, height) * 0.2;

    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < (barCount ?? 64); i++) {
      const angle = (i / barCount) * Math.PI * 2;
      const dataIndex = Math.floor((i / (barCount ?? 64)) * smoothedData.length);
      const barLength = smoothedData[dataIndex] * maxBarLength;
      
      const startX = centerX + Math.cos(angle) * radius;
      const startY = centerY + Math.sin(angle) * radius;
      const endX = centerX + Math.cos(angle) * (radius + barLength);
      const endY = centerY + Math.sin(angle) * (radius + barLength);
      
      ctx.strokeStyle = getColor(i, barCount, smoothedData[dataIndex]);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    }

    // Draw center circle
    ctx.fillStyle = getColor(0, 1, audioData.volume);
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.1, 0, Math.PI * 2);
    ctx.fill();
  }, [visualizerConfig, smoothFrequencyData, getColor]);

  // Particle visualizer
  const drawParticles = useCallback((
    ctx: CanvasRenderingContext2D,
    audioData: AudioData,
    width: number,
    height: number
  ) => {
    const { particleCount } = visualizerConfig;
    const particles = particlesRef.current;

    // Add new particles based on audio intensity
    if (audioData.peak > 0.7 && particles.length < particleCount!) {
      for (let i = 0; i < Math.floor(audioData.peak * 10); i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 4,
          vy: (Math.random() - 0.5) * 4,
          life: 0,
          maxLife: 60 + Math.random() * 60,
          size: 2 + Math.random() * 4,
          color: getColor(Math.floor(Math.random() * 10), 10, audioData.peak),
        });
      }
    }

    ctx.clearRect(0, 0, width, height);

    // Update and draw particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const particle = particles[i];
      
      // Update particle
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.life++;
      
      // Remove dead particles
      if (particle.life > particle.maxLife) {
        particles.splice(i, 1);
        continue;
      }
      
      // Draw particle
      const alpha = 1 - (particle.life / particle.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.globalAlpha = 1;
  }, [visualizerConfig, getColor]);

  // Spectrum analyzer
  const drawSpectrum = useCallback((
    ctx: CanvasRenderingContext2D,
    audioData: AudioData,
    width: number,
    height: number
  ) => {
    const smoothedData = smoothFrequencyData(audioData.frequencyData);
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    // Create spectrogram-style visualization
    for (let x = 0; x < width; x++) {
      const freqIndex = Math.floor((x / width) * smoothedData.length);
      const intensity = smoothedData[freqIndex];
      
      for (let y = 0; y < height; y++) {
        const pixelIndex = (y * width + x) * 4;
        const heightRatio = 1 - (y / height);
        
        if (heightRatio < intensity) {
          const color = getColor(freqIndex, smoothedData.length, intensity);
          const rgb = color.match(/\d+/g);
          
          if (rgb) {
            data[pixelIndex] = parseInt(rgb[0]);     // R
            data[pixelIndex + 1] = parseInt(rgb[1]); // G
            data[pixelIndex + 2] = parseInt(rgb[2]); // B
            data[pixelIndex + 3] = 255;              // A
          }
        } else {
          data[pixelIndex + 3] = 0; // Transparent
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }, [visualizerConfig, smoothFrequencyData, getColor]);

  // Main render function
  const render = useCallback(() => {
    if (!canvasRef.current || !analyserRef.current || !isActive) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Performance monitoring
    const frameStart = performance.now();
    
    // Update canvas size if responsive
    if (visualizerConfig.responsive) {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      
      if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
      }
    }

    const audioData = processAudioData(analyserRef.current);
    const { width, height } = canvas;

    // Draw based on visualizer type
    switch (visualizerConfig.type) {
      case 'bars':
        drawBars(ctx, audioData, width, height);
        break;
      case 'wave':
        drawWave(ctx, audioData, width, height);
        break;
      case 'circular':
        drawCircular(ctx, audioData, width, height);
        break;
      case 'particles':
        drawParticles(ctx, audioData, width, height);
        break;
      case 'spectrum':
        drawSpectrum(ctx, audioData, width, height);
        break;
    }

    // FPS calculation
    if (visualizerConfig.showFPS) {
      frameCount.current++;
      const now = performance.now();
      
      if (now - fpsUpdateTime.current >= 1000) {
        setFps(Math.round((frameCount.current * 1000) / (now - fpsUpdateTime.current)));
        frameCount.current = 0;
        fpsUpdateTime.current = now;
      }
      
      // Draw FPS
      ctx.fillStyle = 'white';
      ctx.font = '16px monospace';
      ctx.fillText(`FPS: ${fps}`, 10, 25);
    }

    // Performance monitoring
    const frameTime = performance.now() - frameStart;
    if (featureFlags.enablePerformanceMonitoring) {
      performance.reportMetric('visualizer_frame_time', frameTime);
    }

    animationFrameRef.current = requestAnimationFrame(render);
  }, [
    isActive,
    visualizerConfig,
    analyserRef,
    processAudioData,
    drawBars,
    drawWave,
    drawCircular,
    drawParticles,
    drawSpectrum,
    fps,
    performance,
  ]);

  // Start/stop visualizer
  const start = useCallback(() => {
    if (!featureFlags.enableAdvancedVisualizer) {
      uiLogger.warn('Advanced visualizer is disabled by feature flag');
      return;
    }
    
    setIsActive(true);
    uiLogger.info('Advanced visualizer started', { type: visualizerConfig.type });
  }, [visualizerConfig.type]);

  const stop = useCallback(() => {
    setIsActive(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    uiLogger.info('Advanced visualizer stopped');
  }, []);

  // Update configuration
  const updateConfig = useCallback((newConfig: Partial<VisualizerConfig>) => {
    setVisualizerConfig(prev => ({ ...prev, ...newConfig }));
  }, []);

  // Effect to start/stop rendering
  useEffect(() => {
    if (isActive) {
      render();
    } else if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isActive, render]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return {
    canvasRef,
    isActive,
    fps,
    config: visualizerConfig,
    start,
    stop,
    updateConfig,
  };
}