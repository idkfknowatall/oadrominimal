'use client';

import AudioPlayer from '@/components/audio-player';
import PlaylistView from '@/components/playlist-view';
import { useRadio } from '@/contexts/radio-context';

export default function RadioView() {
  const { recentlyPlayed, upNext } = useRadio();

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col items-start gap-8 lg:grid lg:grid-cols-4 lg:items-start lg:pt-8 lg:pb-8">
      {/* Recently Played: Order 3 on mobile, 1 on desktop */}
      <div className="w-full flex justify-center order-3 lg:order-1 lg:mt-8">
        <PlaylistView
          title="Recently Played"
          songs={recentlyPlayed}
          helpContent={
            <>
              <p>
                This list shows the last 5 songs that were played on the radio.
              </p>
              <p>
                Click on any song to expand it and see a detailed timeline of
                all reactions and comments from the community.
              </p>
            </>
          }
        />
      </div>

      {/* Audio Player: Order 1 on mobile, 2 on desktop */}
      <div className="w-full lg:col-span-2 flex justify-center order-1 lg:order-2">
        <AudioPlayer />
      </div>

      {/* Up Next: Order 2 on mobile, 3 on desktop */}
      <div className="w-full flex justify-center order-2 lg:order-3 lg:mt-[180px]">
        <PlaylistView
          title="Up Next"
          songs={upNext}
          helpContent={
            <>
              <p>This list shows the next song queued to play on the radio.</p>
              <p>
                The upcoming song is determined by our AI DJ, which takes
                community votes and interactions into account.
              </p>
            </>
          }
        />
      </div>
    </div>
  );
}
