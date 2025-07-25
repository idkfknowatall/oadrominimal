'use client';

import { KofiIcon } from './icons';
import { Button } from './ui/button';

export default function KofiCta() {
  return (
    <div className="text-center text-sm p-4 rounded-lg bg-gradient-to-tr from-blue-900/30 via-background to-background border border-blue-400/30">
      <p className="font-semibold text-white/90">Enjoying the music?</p>
      <p className="text-muted-foreground mt-1">
        Support the station and get VIP perks like SUPER Reactions!
      </p>
      <div className="mt-4">
        <p className="font-medium text-white/90 mb-2">Support on</p>
        <div className="w-full max-w-[240px] mx-auto">
          <a
            href="https://ko-fi.com/oadro"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block w-full transition-transform hover:scale-105"
          >
            <Button className="bg-white text-black hover:bg-white/90 shadow-lg shadow-white/20 h-auto w-full p-2">
              <KofiIcon className="h-12 w-auto" />
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
}
