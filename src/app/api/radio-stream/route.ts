/**
 * Simplified radio stream API endpoint
 */
import { NextRequest } from 'next/server';
import { getRadioWorkerSingleton } from '@/lib/radio-simple';
import { subscribe, type PubSubEvent } from '@/lib/interaction-stream';

export const dynamic = 'force-dynamic';

function writeSseEvent(
  controller: ReadableStreamDefaultController<unknown>,
  event: string,
  data: object
) {
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  try {
    controller.enqueue(message);
  } catch {
    console.warn(
      `[SSE] Failed to write event "${event}", client may have disconnected.`
    );
  }
}

export async function GET(request: NextRequest) {
  // Ensure the background worker is running
  const worker = getRadioWorkerSingleton();

  // Explicitly start the worker to ensure it's running
  const startResult = await worker.start();
  console.log(
    `[SSE] Worker start result: ${startResult} (false means worker was already running)`
  );

  const stream = new ReadableStream({
    start(controller) {
      let unsubscribe: (() => void) | null = null;
      let isStreamClosed = false;

      const handleEvent = (event: PubSubEvent) => {
        if (!event) return;
        if (isStreamClosed) {
          return;
        }
        switch (event.type) {
          case 'now_playing':
            if (event.data && event.data.liveSong) {
              const legacyFormat = {
                pub: {
                  data: {
                    np: {
                      is_online: true,
                      listeners: { current: event.data.listenerCount },
                      now_playing: {
                        sh_id: event.data.liveSong.id,
                        played_at: event.data.liveSong.played_at,
                        duration: event.data.liveSong.duration,
                        elapsed: event.data.liveSong.elapsed,
                        playlist: event.data.liveSong.playlists?.[0],
                        song: {
                          id: event.data.liveSong.songId,
                          title: event.data.liveSong.title,
                          artist: event.data.liveSong.artist,
                          art: event.data.liveSong.albumArt,
                          genre: event.data.liveSong.genre,
                          custom_fields: {
                            creator_discord_id:
                              event.data.liveSong.creatorDiscordId,
                          },
                        },
                        interaction_count: event.data.liveSong.interactionCount,
                      },
                      playing_next: event.data.upNext?.[0]
                        ? {
                            cued_at: event.data.upNext[0].id,
                            duration: event.data.upNext[0].duration,
                            song: {
                              id: event.data.upNext[0].songId,
                              title: event.data.upNext[0].title,
                              artist: event.data.upNext[0].artist,
                              art: event.data.upNext[0].albumArt,
                              genre: event.data.upNext[0].genre,
                              custom_fields: {
                                creator_discord_id:
                                  event.data.upNext[0].creatorDiscordId,
                              },
                            },
                          }
                        : null,
                      song_history:
                        event.data.recentlyPlayed?.map((song) => ({
                          sh_id: song.id,
                          played_at: song.played_at,
                          duration: song.duration,
                          song: {
                            id: song.songId,
                            title: song.title,
                            artist: song.artist,
                            art: song.albumArt,
                            genre: song.genre,
                            custom_fields: {
                              creator_discord_id: song.creatorDiscordId,
                            },
                          },
                        })) || [],
                    },
                  },
                },
              };
              
              try {
                const message = `event: now_playing\ndata: ${JSON.stringify(
                  legacyFormat
                )}\n\n`;
                controller.enqueue(message);
              } catch {
                console.warn(
                  '[SSE] Failed to send now_playing event, client may have disconnected.'
                );
                isStreamClosed = true;
              }
            }
            break;

          case 'stream_status':
            if (event.data && !event.data.isOnline) {
              const offlineFormat = {
                pub: {
                  data: {
                    np: {
                      is_online: false,
                      listeners: { current: 0 },
                      now_playing: null,
                      playing_next: null,
                      song_history: [],
                    },
                  },
                },
              };
              controller.enqueue(`data: ${JSON.stringify(offlineFormat)}\n\n`);
            }
            break;
        }
      };

      // Subscribe to live updates
      unsubscribe = subscribe(handleEvent);

      // Add periodic keep-alive to prevent connection timeout
      const keepAliveInterval = setInterval(() => {
        if (isStreamClosed) {
          clearInterval(keepAliveInterval);
          return;
        }
        try {
          controller.enqueue(`: keep-alive ${Date.now()}\n`);
        } catch {
          isStreamClosed = true;
          clearInterval(keepAliveInterval);
        }
      }, 15000);

      // Cleanup on client disconnect
      const cleanup = () => {
        isStreamClosed = true;
        clearInterval(keepAliveInterval);
        if (unsubscribe) {
          unsubscribe();
          unsubscribe = null;
        }
        try {
          controller.close();
        } catch {
          // Controller may already be closed
        }
      };

      request.signal.addEventListener('abort', cleanup);
    },
    cancel() {
      console.log('[SSE] Stream cancelled by client.');
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}