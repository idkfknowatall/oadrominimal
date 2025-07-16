import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DiscordIcon } from '@/components/icons';
import { BrainCircuit, Check, ListMusic, Radio, Vote } from 'lucide-react';
import type { LucideProps } from 'lucide-react';

const FeatureCard = ({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<LucideProps>;
  title: string;
  description: string;
}) => (
  <div className="flex items-start gap-4">
    <div className="flex-shrink-0">
      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
        <Icon className="w-6 h-6 text-primary" />
      </div>
    </div>
    <div>
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="text-muted-foreground mt-1">{description}</p>
    </div>
  </div>
);

export default function AboutView() {
  return (
    <div className="w-full max-w-5xl mx-auto bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-4 sm:p-8 my-8">
      <h1 className="text-3xl sm:text-4xl font-bold font-headline mb-4 text-center">
        About OADRO Radio
      </h1>
      <p className="text-muted-foreground mb-12 text-center max-w-2xl mx-auto">
        Welcome to OADRO Radio - where artificial intelligence meets
        community-driven music discovery. Our AI-powered radio station curates
        an endless stream of diverse music while giving you the power to shape
        what plays next through our real-time voting system.
      </p>

      <div className="grid md:grid-cols-2 gap-8 mb-12">
        <FeatureCard
          icon={Radio}
          title="Live Streaming"
          description="Enjoy high-quality audio streaming with multiple format options. Choose from HLS for the best quality or MP3 for broader compatibility."
        />
        <FeatureCard
          icon={Vote}
          title="Community Voting"
          description="Vote on songs in real-time! Your likes and dislikes help shape the music selection and influence what gets played more often."
        />
        <FeatureCard
          icon={BrainCircuit}
          title="AI-Powered"
          description="Our intelligent system learns from community preferences to discover and queue music that matches listener tastes while introducing new discoveries."
        />
        <FeatureCard
          icon={ListMusic}
          title="Music Discovery"
          description="Explore top-rated tracks, browse recently played songs, and discover new favorites through our community-driven recommendation system."
        />
      </div>

      <Card className="bg-gradient-to-br from-indigo-900/50 via-purple-900/40 to-pink-900/50 border-purple-400/20 mb-12">
        <CardContent className="p-6 sm:p-8 grid md:grid-cols-2 gap-8 items-center">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold font-headline mb-2">
              Join Our Community
            </h2>
            <p className="text-muted-foreground mb-4">
              Want to share your favorite tracks with the community? Join us on
              Discord and become part of the OADRO family!
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Check /> All music genres welcome
              </li>
              <li className="flex items-center gap-2">
                <Check /> Community moderated
              </li>
              <li className="flex items-center gap-2">
                <Check /> Free to join
              </li>
            </ul>
          </div>
          <div className="text-center">
            <Button
              size="lg"
              className="h-auto py-3 bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 whitespace-normal"
              asChild
            >
              <a
                href="https://discord.gg/oadro"
                target="_blank"
                rel="noopener noreferrer"
              >
                <DiscordIcon />
                Join Discord & Share Music
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-2xl sm:text-3xl font-bold font-headline mb-6 text-center">
          Technical Features
        </h2>
        <div className="grid md:grid-cols-2 gap-8">
          <Card className="bg-black/20">
            <CardHeader>
              <CardTitle>Audio Quality</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>HLS adaptive streaming</li>
                <li>MP3 320k/192k options</li>
                <li>Low-latency playback</li>
              </ul>
            </CardContent>
          </Card>
          <Card className="bg-black/20">
            <CardHeader>
              <CardTitle>Real-time Features</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Live voting system</li>
                <li>Real-time listener count</li>
                <li>Instant song updates</li>
              </ul>
            </CardContent>
          </Card>
        </div>
        <p className="text-center text-muted-foreground mt-12">
          Built with ❤️ for music lovers everywhere
        </p>
      </div>
    </div>
  );
}
