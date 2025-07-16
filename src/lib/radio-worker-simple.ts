/**
 * @fileoverview Simplified radio stream connection manager
 * that only handles SSE connection without database operations.
 */

import { publish } from './interaction-stream';
import EventSource from 'eventsource';
import { AZURACAST_BASE_URL, AZURACAST_STATION_NAME } from './config';

// Static counter to track instances
let instanceCounter = 0;

interface SimpleRadioState {
  isStarted: boolean;
  eventSource: EventSource | null;
  instanceId: number;
}

export class SimpleRadioWorker {
  private state: SimpleRadioState;

  constructor() {
    this.state = {
      isStarted: false,
      eventSource: null,
      instanceId: ++instanceCounter,
    };

    console.log(`[SimpleRadioWorker] Instance #${this.state.instanceId} created.`);
  }

  public isStarted(): boolean {
    return this.state.isStarted;
  }

  public async start(): Promise<boolean> {
    if (this.isStarted()) {
      console.log(`[SimpleRadioWorker] Instance #${this.state.instanceId} already started.`);
      return false;
    }

    console.log(`[SimpleRadioWorker] Starting instance #${this.state.instanceId}`);
    this.state.isStarted = true;

    // Handle process termination gracefully
    process.on('SIGINT', this.stop.bind(this));
    process.on('SIGTERM', this.stop.bind(this));

    // Connect to SSE stream
    this.connectToSSE();

    return true;
  }

  private connectToSSE(): void {
    console.log('[SimpleRadioWorker] Connecting to SSE stream...');
    
    const sseUrl = `${AZURACAST_BASE_URL}/api/live/nowplaying/sse?cf_connect=%7B%22subs%22%3A%7B%22station%3A${AZURACAST_STATION_NAME}%22%3A%7B%7D%7D%7D`;
    
    console.log(`[SimpleRadioWorker] SSE URL: ${sseUrl}`);

    const eventSource = new EventSource(sseUrl);
    this.state.eventSource = eventSource;

    eventSource.onopen = () => {
      console.log('[SimpleRadioWorker] SSE connection opened');
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Handle different message types
        if (data.channel && data.pub && data.pub.data && data.pub.data.np) {
          // This is a now playing update
          console.log(`[SimpleRadioWorker] Now playing: "${data.pub.data.np.now_playing?.song?.title}" by ${data.pub.data.np.now_playing?.song?.artist}`);
          
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
          console.log('[SimpleRadioWorker] SSE connection acknowledged');
        } else if (Object.keys(data).length === 0) {
          // Heartbeat
          console.log('[SimpleRadioWorker] SSE heartbeat received');
        } else {
          console.log('[SimpleRadioWorker] Unknown SSE message type:', Object.keys(data));
        }
      } catch (error) {
        console.error('[SimpleRadioWorker] Error parsing SSE message:', error);
        console.log('[SimpleRadioWorker] Raw message:', event.data.substring(0, 200));
      }
    };

    eventSource.onerror = (error) => {
      console.warn('[SimpleRadioWorker] SSE connection error:', error);
      
      // Attempt to reconnect after a delay
      setTimeout(() => {
        if (this.state.isStarted && this.state.eventSource?.readyState === EventSource.CLOSED) {
          console.log('[SimpleRadioWorker] Attempting to reconnect...');
          this.connectToSSE();
        }
      }, 5000);
    };
  }

  private transformSong(songData: any): any {
    if (!songData || !songData.song) {
      return null;
    }

    return {
      id: songData.sh_id || songData.cued_at || Date.now(),
      songId: songData.song.id,
      title: songData.song.title,
      artist: songData.song.artist,
      albumArt: songData.song.art,
      genre: songData.song.genre,
      duration: songData.duration,
      elapsed: songData.elapsed || 0,
      played_at: songData.played_at,
      interactionCount: songData.interaction_count || 0,
      creatorDiscordId: songData.song.custom_fields?.creator_discord_id || null,
      playlists: songData.playlist ? [songData.playlist] : [],
    };
  }

  public stop(): void {
    console.log('[SimpleRadioWorker] Cleaning up resources...');
    
    if (this.state.eventSource) {
      this.state.eventSource.close();
      this.state.eventSource = null;
    }

    this.state.isStarted = false;

    // Remove listeners
    process.removeListener('SIGINT', this.stop.bind(this));
    process.removeListener('SIGTERM', this.stop.bind(this));
  }

  public getState() {
    return {
      isStarted: this.state.isStarted,
      hasConnection: !!this.state.eventSource,
    };
  }
}