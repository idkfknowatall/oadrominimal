'use client';

import { Music, Users, Zap, Volume2, Waves, Settings, Headphones } from 'lucide-react';
import Link from 'next/link';

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-12">
      {/* Page Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">About OADRO Radio</h1>
        <p className="text-muted-foreground">
          Learn about our community-driven platform and advanced audio technology
        </p>
      </div>
        {/* Community Section */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" />
            <h2 className="text-3xl font-bold">Community Supported Radio</h2>
          </div>
          
          <div className="prose prose-neutral dark:prose-invert max-w-none">
            <p className="text-lg text-muted-foreground leading-relaxed">
              OADRO Radio is a community-driven platform that brings together music creators, listeners, and supporters 
              from around the world. We believe in the power of music to connect people and create meaningful experiences.
            </p>
            
            <p className="text-lg text-muted-foreground leading-relaxed">
              Our radio station is made possible by the incredible contributions of talented creators who share their 
              music with our community. Every track you hear represents the passion and creativity of independent artists 
              who choose to be part of the OADRO family.
            </p>
          </div>

          <div className="bg-card border border-border/40 rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Music className="w-6 h-6 text-primary" />
              Thank You to Our Creators
            </h3>
            <p className="text-muted-foreground">
              We extend our heartfelt gratitude to all the amazing artists and creators who contribute their music 
              to OADRO Radio. Your creativity and talent make our station a vibrant and diverse musical experience. 
              Thank you for sharing your art with our community and helping us build something special together.
            </p>
          </div>
        </section>

        {/* Audio Quality Section */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <Headphones className="w-8 h-8 text-primary" />
            <h2 className="text-3xl font-bold">Why Your Music Sounds Better on OADRO</h2>
          </div>
          
          <p className="text-lg text-muted-foreground leading-relaxed">
            OADRO Radio uses advanced audio processing technology to deliver the highest quality listening experience. 
            Our sophisticated audio pipeline ensures every track sounds its absolute best.
          </p>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Core Features */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <Zap className="w-6 h-6 text-primary" />
                Core Audio Enhancements
              </h3>
              
              <div className="space-y-3">
                <div className="bg-card border border-border/40 rounded-lg p-4">
                  <h4 className="font-semibold text-primary">Dehummer</h4>
                  <p className="text-sm text-muted-foreground">Eliminates electrical interference and hum for crystal-clear audio</p>
                </div>
                
                <div className="bg-card border border-border/40 rounded-lg p-4">
                  <h4 className="font-semibold text-primary">Automatic Gain Control</h4>
                  <p className="text-sm text-muted-foreground">Maintains consistent volume levels across all tracks</p>
                </div>
                
                <div className="bg-card border border-border/40 rounded-lg p-4">
                  <h4 className="font-semibold text-primary">Low Level Boost</h4>
                  <p className="text-sm text-muted-foreground">Enhances quiet details without affecting loud passages</p>
                </div>
                
                <div className="bg-card border border-border/40 rounded-lg p-4">
                  <h4 className="font-semibold text-primary">Multiband Compressors</h4>
                  <p className="text-sm text-muted-foreground">Optimizes different frequency ranges independently</p>
                </div>
                
                <div className="bg-card border border-border/40 rounded-lg p-4">
                  <h4 className="font-semibold text-primary">Stereo Effects</h4>
                  <p className="text-sm text-muted-foreground">Creates immersive spatial audio experience</p>
                </div>
                
                <div className="bg-card border border-border/40 rounded-lg p-4">
                  <h4 className="font-semibold text-primary">Immersive Bass</h4>
                  <p className="text-sm text-muted-foreground">Deep, rich bass response that you can feel</p>
                </div>
              </div>
            </div>

            {/* Advanced Features */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <Settings className="w-6 h-6 text-primary" />
                Advanced Processing
              </h3>
              
              <div className="space-y-3">
                <div className="bg-card border border-border/40 rounded-lg p-4">
                  <h4 className="font-semibold text-primary">Perfect Declipper</h4>
                  <p className="text-sm text-muted-foreground">Restores distorted incoming audio to its original quality</p>
                </div>
                
                <div className="bg-card border border-border/40 rounded-lg p-4">
                  <h4 className="font-semibold text-primary">Natural Dynamics</h4>
                  <p className="text-sm text-muted-foreground">Pulls out percussion instruments for separate boosting, adding more dynamics</p>
                </div>
                
                <div className="bg-card border border-border/40 rounded-lg p-4">
                  <h4 className="font-semibold text-primary">Adaptive Compressor</h4>
                  <p className="text-sm text-muted-foreground">Fully dynamic multiband compressor that eliminates the need for other stages</p>
                </div>
                
                <div className="bg-card border border-border/40 rounded-lg p-4">
                  <h4 className="font-semibold text-primary">Auto EQ</h4>
                  <p className="text-sm text-muted-foreground">Adjusts spectrum without compression for improved consistency</p>
                </div>
                
                <div className="bg-card border border-border/40 rounded-lg p-4">
                  <h4 className="font-semibold text-primary">Bass EQ</h4>
                  <p className="text-sm text-muted-foreground">Specialized bass frequency optimization</p>
                </div>
                
                <div className="bg-card border border-border/40 rounded-lg p-4">
                  <h4 className="font-semibold text-primary">Speech Detection</h4>
                  <p className="text-sm text-muted-foreground">Automatically adjusts processing for speech vs music content</p>
                </div>
              </div>
            </div>
          </div>

          {/* Technical Details */}
          <div className="bg-card border border-border/40 rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Waves className="w-6 h-6 text-primary" />
              The Magic Behind the Sound
            </h3>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="font-semibold text-primary mb-2">Dynamic Processing</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• AGC up to 4 bands for fine control</li>
                  <li>• Dynamic attack/release timing</li>
                  <li>• Progressive ratios for density</li>
                  <li>• Progressive release protection</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold text-primary mb-2">Intelligent Adaptation</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Faster processing for dynamic content</li>
                  <li>• Slower processing for dense content</li>
                  <li>• Less audible compression</li>
                  <li>• &ldquo;Big sound&rdquo; enhancement</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Community Support Section */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <Volume2 className="w-8 h-8 text-primary" />
            <h2 className="text-3xl font-bold">Community Support</h2>
          </div>
          
          <div className="bg-card border border-border/40 rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-4">Special Thanks</h3>
            <p className="text-muted-foreground mb-4">
              OADRO Radio is kept alive and thriving thanks to our amazing community supporters:
            </p>
            
            <div className="space-y-3">
              <div>
                <h4 className="font-semibold text-primary">VIP Supporters</h4>
                <p className="text-sm text-muted-foreground">
                  Our VIP members provide essential support that helps maintain our servers, 
                  improve our audio processing, and keep the music flowing 24/7.
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold text-primary">Top Supporters</h4>
                <p className="text-sm text-muted-foreground">
                  Special recognition goes to our top supporters in the OADRO Discord server 
                  who go above and beyond to keep this project running and growing.
                </p>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-primary/10 border border-primary/20 rounded-lg">
              <p className="text-sm text-center">
                <strong>Thank you to all our VIPs and top supporters in the OADRO Discord server!</strong>
                <br />
                Your dedication and support make OADRO Radio possible.
              </p>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="text-center space-y-4">
          <h2 className="text-2xl font-bold">Join Our Community</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Become part of the OADRO Radio family. Whether you&rsquo;re a listener, creator, or supporter, 
            there&rsquo;s a place for you in our community.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <Link 
              href="/"
              className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
            >
              Start Listening
            </Link>
          </div>
        </section>
    </div>
  );
}