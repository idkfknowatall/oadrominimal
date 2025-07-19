import { ArrowLeft, Server, Users, TrendingUp, MessageCircle, Zap, Shield, Headphones, Star } from 'lucide-react';
import Link from 'next/link';
import { servicesMetadata } from './metadata';

export const metadata = servicesMetadata;

export default function ServicesPage() {
  return (
    <div className="h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <div className="border-b border-border/40 p-4 flex-shrink-0">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Radio
          </Link>
          <div className="h-6 w-px bg-border/40" />
          <h1 className="text-2xl font-bold">Services</h1>
        </div>
      </div>

      {/* Main Content - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6 space-y-12 pb-20">
          
          {/* Hero Section */}
          <section className="text-center space-y-6">
            <div className="flex items-center justify-center gap-3">
              <Headphones className="w-12 h-12 text-primary" />
              <h2 className="text-4xl font-bold">AI Music Community & Radio Hosting</h2>
            </div>
            
            <p className="text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto">
              Join the premier AI music community featuring Discord AI radio, AI-assisted music generation, and professional radio hosting.
              Experience AI-generated songs from Suno, Udio, Riffusion, and connect with our vibrant Discord AI music community for AI-assisted generated songs.
            </p>

            <div className="bg-gradient-to-r from-primary/20 to-purple-500/20 border border-primary/30 rounded-lg p-6">
              <h3 className="text-2xl font-semibold mb-4 flex items-center justify-center gap-2">
                <Star className="w-8 h-8 text-primary" />
                Why Choose Our Managed Radio Services?
              </h3>
              <p className="text-lg text-muted-foreground">
                We handle all the technical complexity of running a professional radio station so you can focus on what matters most -
                creating great content and building your audience. From setup to ongoing support, we've got you covered.
              </p>
            </div>
          </section>

          {/* AI Music Community Section */}
          <section className="space-y-8">
            <h2 className="text-3xl font-bold text-center">AI Music Community Features</h2>
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {/* Suno AI Community */}
              <div className="bg-card border border-border/40 rounded-lg p-6 hover:border-primary/50 transition-colors">
                <div className="flex items-center gap-3 mb-4">
                  <Users className="w-8 h-8 text-primary" />
                  <h3 className="text-xl font-semibold">AI Community Suno</h3>
                </div>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• Dedicated Suno AI music channels</li>
                  <li>• AI-assisted music generation</li>
                  <li>• Community sharing and feedback</li>
                  <li>• Collaborative AI music projects</li>
                  <li>• Expert tips and tutorials</li>
                </ul>
              </div>

              {/* Udio AI Community */}
              <div className="bg-card border border-border/40 rounded-lg p-6 hover:border-primary/50 transition-colors">
                <div className="flex items-center gap-3 mb-4">
                  <Users className="w-8 h-8 text-primary" />
                  <h3 className="text-xl font-semibold">AI Community Udio</h3>
                </div>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• Udio AI music creation space</li>
                  <li>• AI-generated song showcases</li>
                  <li>• Community challenges and contests</li>
                  <li>• Advanced AI music techniques</li>
                  <li>• Real-time collaboration tools</li>
                </ul>
              </div>

              {/* Riffusion AI Community */}
              <div className="bg-card border border-border/40 rounded-lg p-6 hover:border-primary/50 transition-colors">
                <div className="flex items-center gap-3 mb-4">
                  <Users className="w-8 h-8 text-primary" />
                  <h3 className="text-xl font-semibold">AI Community Riffusion</h3>
                </div>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• Riffusion AI experimentation</li>
                  <li>• Spectogram-based music generation</li>
                  <li>• AI-assisted generated songs</li>
                  <li>• Community research and development</li>
                  <li>• Open-source AI music tools</li>
                </ul>
              </div>
            </div>

            <div className="bg-gradient-to-r from-primary/10 to-purple-500/10 border border-primary/20 rounded-lg p-6 text-center">
              <h3 className="text-2xl font-semibold mb-4">Discord AI Music Community</h3>
              <p className="text-lg text-muted-foreground">
                Join thousands of AI music enthusiasts in our Discord AI music community. Share your AI-assisted music,
                discover new AI-generated songs, and collaborate with fellow creators using Suno, Udio, Riffusion, and other cutting-edge AI music tools.
              </p>
            </div>
          </section>

          {/* Services Grid */}
          <section className="space-y-8">
            <h2 className="text-3xl font-bold text-center">What We Offer</h2>
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {/* Radio Hosting */}
              <div className="bg-card border border-border/40 rounded-lg p-6 hover:border-primary/50 transition-colors">
                <div className="flex items-center gap-3 mb-4">
                  <Server className="w-8 h-8 text-primary" />
                  <h3 className="text-xl font-semibold">Radio Hosting</h3>
                </div>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• High-performance dedicated servers</li>
                  <li>• 99.9% uptime guarantee</li>
                  <li>• Global CDN distribution</li>
                  <li>• Unlimited bandwidth</li>
                  <li>• Multiple streaming formats</li>
                </ul>
              </div>

              {/* Audio Processing */}
              <div className="bg-card border border-border/40 rounded-lg p-6 hover:border-primary/50 transition-colors">
                <div className="flex items-center gap-3 mb-4">
                  <Headphones className="w-8 h-8 text-primary" />
                  <h3 className="text-xl font-semibold">Professional Audio Processing</h3>
                </div>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• Advanced audio enhancement</li>
                  <li>• Automatic gain control</li>
                  <li>• Multi-band compression</li>
                  <li>• Noise reduction & cleanup</li>
                  <li>• Custom audio branding</li>
                </ul>
              </div>

              {/* Technical Management */}
              <div className="bg-card border border-border/40 rounded-lg p-6 hover:border-primary/50 transition-colors">
                <div className="flex items-center gap-3 mb-4">
                  <Shield className="w-8 h-8 text-primary" />
                  <h3 className="text-xl font-semibold">Full Technical Management</h3>
                </div>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• 24/7 server monitoring</li>
                  <li>• Automatic updates & maintenance</li>
                  <li>• Stream quality optimization</li>
                  <li>• Performance monitoring</li>
                  <li>• Security management</li>
                </ul>
              </div>

              {/* Station Setup */}
              <div className="bg-card border border-border/40 rounded-lg p-6 hover:border-primary/50 transition-colors">
                <div className="flex items-center gap-3 mb-4">
                  <Zap className="w-8 h-8 text-primary" />
                  <h3 className="text-xl font-semibold">Complete Station Setup</h3>
                </div>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• Professional radio station configuration</li>
                  <li>• Custom web player integration</li>
                  <li>• Playlist management system</li>
                  <li>• Automated scheduling</li>
                  <li>• Live DJ capabilities</li>
                </ul>
              </div>

              {/* Growth & Analytics */}
              <div className="bg-card border border-border/40 rounded-lg p-6 hover:border-primary/50 transition-colors">
                <div className="flex items-center gap-3 mb-4">
                  <TrendingUp className="w-8 h-8 text-primary" />
                  <h3 className="text-xl font-semibold">Growth & Analytics</h3>
                </div>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• Detailed listener analytics</li>
                  <li>• Audience growth strategies</li>
                  <li>• Content optimization tips</li>
                  <li>• Marketing guidance</li>
                  <li>• Performance insights</li>
                </ul>
              </div>

              {/* Discord Integration */}
              <div className="bg-card border border-border/40 rounded-lg p-6 hover:border-primary/50 transition-colors">
                <div className="flex items-center gap-3 mb-4">
                  <MessageCircle className="w-8 h-8 text-primary" />
                  <h3 className="text-xl font-semibold">Discord Server Solutions</h3>
                </div>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• Complete Discord server setup</li>
                  <li>• Radio bot integration</li>
                  <li>• Community management tools</li>
                  <li>• Automated moderation</li>
                  <li>• Member engagement features</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Pricing Section */}
          <section className="space-y-8">
            <h2 className="text-3xl font-bold text-center">Affordable Radio Hosting</h2>
            
            <div className="bg-card border border-border/40 rounded-lg p-8 text-center">
              <h3 className="text-2xl font-semibold mb-4 text-primary">Professional Radio Solutions for Every Budget</h3>
              <p className="text-lg text-muted-foreground mb-6">
                We believe everyone should have access to professional radio hosting and management. Our pricing is designed to be
                affordable for broadcasters of all sizes, from independent creators to established radio stations.
              </p>
              
              <div className="grid gap-4 md:grid-cols-3 mb-8">
                <div className="bg-background border border-border/40 rounded-lg p-4">
                  <h4 className="font-semibold text-primary mb-2">Basic Radio</h4>
                  <p className="text-sm text-muted-foreground">Perfect for new broadcasters and small audiences</p>
                </div>
                <div className="bg-background border border-primary/50 rounded-lg p-4 ring-2 ring-primary/20">
                  <h4 className="font-semibold text-primary mb-2">Professional Radio</h4>
                  <p className="text-sm text-muted-foreground">Most popular - full features with premium audio processing</p>
                </div>
                <div className="bg-background border border-border/40 rounded-lg p-4">
                  <h4 className="font-semibold text-primary mb-2">Enterprise Radio</h4>
                  <p className="text-sm text-muted-foreground">For large stations with custom requirements</p>
                </div>
              </div>
              
              <p className="text-muted-foreground">
                <strong>All packages include:</strong> Hosting, audio processing, technical management, and ongoing support
              </p>
            </div>
          </section>

          {/* Growth Tips Preview */}
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-primary" />
              <h2 className="text-3xl font-bold">Growth Tips & Tricks</h2>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2">
              <div className="bg-card border border-border/40 rounded-lg p-6">
                <h3 className="text-xl font-semibold mb-4 text-primary">User Acquisition Strategies</h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• Cross-platform promotion techniques</li>
                  <li>• Community partnership opportunities</li>
                  <li>• Social media integration strategies</li>
                  <li>• Referral program implementation</li>
                  <li>• Content marketing for Discord servers</li>
                </ul>
              </div>
              
              <div className="bg-card border border-border/40 rounded-lg p-6">
                <h3 className="text-xl font-semibold mb-4 text-primary">Engagement Optimization</h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• Interactive events and activities</li>
                  <li>• Gamification and reward systems</li>
                  <li>• Community challenges and contests</li>
                  <li>• Regular programming schedules</li>
                  <li>• Member recognition programs</li>
                </ul>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-primary/10 to-purple-500/10 border border-primary/20 rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-3 text-center">We're Here for Everything You Need</h3>
              <p className="text-muted-foreground text-center">
                From initial setup to advanced growth strategies, our team provides comprehensive support 
                to help your Discord radio community thrive. No question is too small, no goal is too big.
              </p>
            </div>
          </section>

          {/* Contact Section */}
          <section className="text-center space-y-6">
            <div className="flex items-center justify-center gap-3">
              <MessageCircle className="w-10 h-10 text-primary" />
              <h2 className="text-3xl font-bold">Get Started Today</h2>
            </div>
            
            <div className="bg-card border border-border/40 rounded-lg p-8">
              <h3 className="text-2xl font-semibold mb-4">Ready to Launch Your Radio Station?</h3>
              <p className="text-lg text-muted-foreground mb-6 max-w-2xl mx-auto">
                Join our Discord server and reach out to <strong className="text-primary">neural</strong> with your needs.
                We'll discuss your broadcasting goals, provide a custom quote, and get your professional radio station
                up and running with premium hosting and management.
              </p>
              
              <div className="space-y-4">
                <a
                  href="https://discord.gg/oadro"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 bg-primary text-primary-foreground px-8 py-4 rounded-lg font-semibold hover:bg-primary/90 transition-colors text-lg"
                >
                  <MessageCircle className="w-6 h-6" />
                  Join Discord & Contact Neural
                </a>
                
                <p className="text-sm text-muted-foreground">
                  Visit <strong>discord.gg/oadro</strong> and reach out to <strong>neural</strong> for any information you need
                </p>
              </div>
            </div>
            
            <div className="grid gap-4 md:grid-cols-3 text-sm">
              <div className="bg-card border border-border/40 rounded-lg p-4">
                <h4 className="font-semibold text-primary mb-2">Quick Response</h4>
                <p className="text-muted-foreground">We typically respond within 24 hours</p>
              </div>
              <div className="bg-card border border-border/40 rounded-lg p-4">
                <h4 className="font-semibold text-primary mb-2">Free Consultation</h4>
                <p className="text-muted-foreground">Initial discussion is always free</p>
              </div>
              <div className="bg-card border border-border/40 rounded-lg p-4">
                <h4 className="font-semibold text-primary mb-2">Custom Solutions</h4>
                <p className="text-muted-foreground">Tailored to your specific needs</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}