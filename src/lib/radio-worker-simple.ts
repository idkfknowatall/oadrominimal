/**
 * @fileoverview Enhanced radio stream connection manager
 * with improved error handling, reconnection logic, and performance optimizations.
 */

import { publish } from './interaction-stream';
import EventSource from 'eventsource';
import { AZURACAST_BASE_URL, AZURACAST_STATION_NAME } from './config';

// Static counter to track instances
let instanceCounter = 0;

// Connection state tracking
interface ConnectionMetrics {
  totalConnections: number;
  successfulConnections: number;
  failedConnections: number;
  lastConnectionTime: number;
  lastSuccessfulConnection: number;
  averageReconnectTime: number;
}

interface SimpleRadioState {
  isStarted: boolean;
  eventSource: EventSource | null;
  instanceId: number;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  reconnectDelay: number;
  isReconnecting: boolean;
  lastHeartbeat: number;
  connectionMetrics: ConnectionMetrics;
}

export class SimpleRadioWorker {
  private state: SimpleRadioState;
  private reconnectTimeoutId: NodeJS.Timeout | null = null;
  private heartbeatTimeoutId: NodeJS.Timeout | null = null;

  constructor() {
    this.state = {
      isStarted: false,
      eventSource: null,
      instanceId: ++instanceCounter,
      reconnectAttempts: 0,
      maxReconnectAttempts: 10,
      reconnectDelay: 1000, // Start with 1 second
      isReconnecting: false,
      lastHeartbeat: Date.now(),
      connectionMetrics: {
        totalConnections: 0,
        successfulConnections: 0,
        failedConnections: 0,
        lastConnectionTime: 0,
        lastSuccessfulConnection: 0,
        averageReconnectTime: 0,
      },
    };

    if (process.env.NODE_ENV === 'development') {
      console.log(`[SimpleRadioWorker] Instance #${this.state.instanceId} created.`);
    }
  }

  public isStarted(): boolean {
    return this.state.isStarted;
  }

  public getConnectionMetrics(): ConnectionMetrics {
    return { ...this.state.connectionMetrics };
  }

  public async start(): Promise<boolean> {
    if (this.isStarted()) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[SimpleRadioWorker] Instance #${this.state.instanceId} already started.`);
      }
      return false;
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`[SimpleRadioWorker] Starting instance #${this.state.instanceId}`);
    }
    this.state.isStarted = true;

    // Handle process termination gracefully
    if (typeof process !== 'undefined') {
      process.on('SIGINT', this.stop.bind(this));
      process.on('SIGTERM', this.stop.bind(this));
    }

    // Connect to SSE stream
    this.connectToSSE();

    return true;
  }

  private connectToSSE(): void {
    if (this.state.isReconnecting) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[SimpleRadioWorker] Already attempting to reconnect, skipping...');
      }
      return;
    }

    this.state.isReconnecting = true;
    this.state.connectionMetrics.totalConnections++;
    this.state.connectionMetrics.lastConnectionTime = Date.now();

    if (process.env.NODE_ENV === 'development') {
      console.log(`[SimpleRadioWorker] Connecting to SSE stream (attempt ${this.state.reconnectAttempts + 1}/${this.state.maxReconnectAttempts})...`);
    }
    
    const sseUrl = `${AZURACAST_BASE_URL}/api/live/nowplaying/sse?cf_connect=%7B%22subs%22%3A%7B%22station%3A${AZURACAST_STATION_NAME}%22%3A%7B%7D%7D%7D`;
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[SimpleRadioWorker] SSE URL: ${sseUrl}`);
    }

    try {
      const eventSource = new EventSource(sseUrl);
      this.state.eventSource = eventSource;

      eventSource.onopen = () => {
        if (process.env.NODE_ENV === 'development') {
          console.log('[SimpleRadioWorker] SSE connection opened successfully');
        }
        this.state.isReconnecting = false;
        this.state.reconnectAttempts = 0;
        this.state.reconnectDelay = 1000; // Reset delay
        this.state.connectionMetrics.successfulConnections++;
        this.state.connectionMetrics.lastSuccessfulConnection = Date.now();
        this.state.lastHeartbeat = Date.now();
        
        // Start heartbeat monitoring
        this.startHeartbeatMonitoring();
      };

      eventSource.onmessage = (event: any) => {
        this.state.lastHeartbeat = Date.now();
        
        try {
          const data = JSON.parse(event.data);
          
          // Handle different message types
          if (data.channel && data.pub && data.pub.data && data.pub.data.np) {
            // This is a now playing update
            if (process.env.NODE_ENV === 'development') {
              console.log(`[SimpleRadioWorker] Now playing: "${data.pub.data.np.now_playing?.song?.title}" by ${data.pub.data.np.now_playing?.song?.artist}`);
            }
            
            publish({
              type: 'now_playing',
              data: {
                liveSong: this.transformSong(data.pub.data.np.now_playing),
                upNext: data.pub.data.np.playing_next ? [this.transformSong(data.pub.data.np.playing_next)] : [],
                recentlyPlayed: (data.pub.data.np.song_history || []).slice(0, 5).map((item: any) => this.transformSong(item)),
                listenerCount: data.pub.data.np.listeners?.current || 0,
              },
            });

            publish({
              type: 'stream_status',
              data: {
                isOnline: data.pub.data.np.is_online || false,
              },
            });
          } else if (data.connect) {
            // Connection acknowledgment
            if (process.env.NODE_ENV === 'development') {
              console.log('[SimpleRadioWorker] SSE connection acknowledged');
            }
          } else if (Object.keys(data).length === 0) {
            // Heartbeat
            if (process.env.NODE_ENV === 'development') {
              console.log('[SimpleRadioWorker] SSE heartbeat received');
            }
          } else {
            if (process.env.NODE_ENV === 'development') {
              console.log('[SimpleRadioWorker] Unknown SSE message type:', Object.keys(data));
            }
          }
        } catch (error) {
          console.error('[SimpleRadioWorker] Error parsing SSE message:', error);
          if (process.env.NODE_ENV === 'development') {
            console.log('[SimpleRadioWorker] Raw message:', event.data.substring(0, 200));
          }
        }
      };

      eventSource.onerror = (error: any) => {
        console.warn('[SimpleRadioWorker] SSE connection error:', error);
        this.state.connectionMetrics.failedConnections++;
        this.handleConnectionError();
      };

    } catch (error) {
      console.error('[SimpleRadioWorker] Failed to create EventSource:', error);
      this.state.connectionMetrics.failedConnections++;
      this.handleConnectionError();
    }
  }

  private startHeartbeatMonitoring(): void {
    // Clear existing timeout
    if (this.heartbeatTimeoutId) {
      clearTimeout(this.heartbeatTimeoutId);
    }

    // Set up heartbeat monitoring (expect heartbeat every 30 seconds, timeout after 60)
    this.heartbeatTimeoutId = setTimeout(() => {
      const timeSinceLastHeartbeat = Date.now() - this.state.lastHeartbeat;
      if (timeSinceLastHeartbeat > 60000) { // 60 seconds
        console.warn('[SimpleRadioWorker] Heartbeat timeout detected, reconnecting...');
        this.handleConnectionError();
      } else {
        // Continue monitoring
        this.startHeartbeatMonitoring();
      }
    }, 30000); // Check every 30 seconds
  }

  private handleConnectionError(): void {
    this.state.isReconnecting = false;
    
    // Clear heartbeat monitoring
    if (this.heartbeatTimeoutId) {
      clearTimeout(this.heartbeatTimeoutId);
      this.heartbeatTimeoutId = null;
    }

    // Close existing connection
    if (this.state.eventSource) {
      this.state.eventSource.close();
      this.state.eventSource = null;
    }

    // Check if we should attempt reconnection
    if (this.state.reconnectAttempts >= this.state.maxReconnectAttempts) {
      console.error('[SimpleRadioWorker] Max reconnection attempts reached, giving up');
      publish({
        type: 'connection_failed',
        data: {
          reason: 'Max reconnection attempts exceeded',
          metrics: this.getConnectionMetrics(),
        },
      });
      return;
    }

    // Exponential backoff with jitter
    const jitter = Math.random() * 1000;
    const delay = Math.min(this.state.reconnectDelay + jitter, 30000); // Max 30 seconds
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[SimpleRadioWorker] Attempting to reconnect in ${Math.round(delay)}ms...`);
    }
    
    // Clear existing timeout
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
    }

    this.reconnectTimeoutId = setTimeout(() => {
      if (this.state.isStarted) {
        this.state.reconnectAttempts++;
        this.state.reconnectDelay = Math.min(this.state.reconnectDelay * 2, 30000); // Exponential backoff
        this.connectToSSE();
      }
    }, delay);
  }

  private transformSong(songData: any): any {
    if (!songData || !songData.song) {
      return null;
    }

    return {
      id: songData.sh_id || songData.cued_at || Date.now(),
      songId: songData.song.id,
      title: songData.song.title || 'Unknown Title',
      artist: songData.song.artist || 'Unknown Artist',
      albumArt: songData.song.art,
      genre: songData.song.genre,
      duration: songData.duration || 0,
      elapsed: songData.elapsed || 0,
      played_at: songData.played_at,
      interactionCount: songData.interaction_count || 0,
      creatorDiscordId: songData.song.custom_fields?.creator_discord_id || null,
      playlists: songData.playlist ? [songData.playlist] : [],
    };
  }

  public forceReconnect(): void {
    if (process.env.NODE_ENV === 'development') {
      console.log('[SimpleRadioWorker] Force reconnection requested');
    }
    this.state.reconnectAttempts = 0;
    this.state.reconnectDelay = 1000;
    this.handleConnectionError();
  }

  public stop(): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[SimpleRadioWorker] Stopping instance #${this.state.instanceId}...`);
    }
    
    this.state.isStarted = false;
    this.state.isReconnecting = false;

    // Clear timeouts
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }

    if (this.heartbeatTimeoutId) {
      clearTimeout(this.heartbeatTimeoutId);
      this.heartbeatTimeoutId = null;
    }

    // Close connection
    if (this.state.eventSource) {
      this.state.eventSource.close();
      this.state.eventSource = null;
    }

    // Remove listeners (only if process is available)
    if (typeof process !== 'undefined') {
      process.removeListener('SIGINT', this.stop.bind(this));
      process.removeListener('SIGTERM', this.stop.bind(this));
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`[SimpleRadioWorker] Instance #${this.state.instanceId} stopped successfully`);
    }
  }

  public getState() {
    return {
      isStarted: this.state.isStarted,
      hasConnection: !!this.state.eventSource,
      isReconnecting: this.state.isReconnecting,
      reconnectAttempts: this.state.reconnectAttempts,
      connectionMetrics: this.getConnectionMetrics(),
      lastHeartbeat: this.state.lastHeartbeat,
      timeSinceLastHeartbeat: Date.now() - this.state.lastHeartbeat,
    };
  }

  public getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: string;
    metrics: ConnectionMetrics;
  } {
    const timeSinceLastHeartbeat = Date.now() - this.state.lastHeartbeat;
    const metrics = this.getConnectionMetrics();
    
    if (!this.state.isStarted) {
      return {
        status: 'unhealthy',
        details: 'Worker not started',
        metrics,
      };
    }

    if (this.state.isReconnecting) {
      return {
        status: 'degraded',
        details: `Reconnecting (attempt ${this.state.reconnectAttempts}/${this.state.maxReconnectAttempts})`,
        metrics,
      };
    }

    if (timeSinceLastHeartbeat > 60000) {
      return {
        status: 'unhealthy',
        details: `No heartbeat for ${Math.round(timeSinceLastHeartbeat / 1000)}s`,
        metrics,
      };
    }

    if (timeSinceLastHeartbeat > 30000) {
      return {
        status: 'degraded',
        details: `Heartbeat delayed by ${Math.round(timeSinceLastHeartbeat / 1000)}s`,
        metrics,
      };
    }

    return {
      status: 'healthy',
      details: 'Connection stable',
      metrics,
    };
  }
}