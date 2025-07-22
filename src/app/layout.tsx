import type { Metadata, Viewport } from 'next';
import './globals.css';
import '@/lib/radio-simple'; // This will initialize and start the simplified radio worker
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme-provider';
import { inter, spaceGrotesk } from './fonts';
import { cn } from '@/lib/utils';
import ErrorBoundary from '@/components/error-boundary';
import AsyncBoundary from '@/components/async-boundary';
import PersistentRadioProvider from '@/components/persistent-radio-provider';

export const metadata: Metadata = {
  applicationName: 'OADRO Radio',
  title: 'OADRO Radio - AI Music Community & Discord AI Radio',
  description: 'AI-powered radio experience featuring AI-assisted music, AI-generated songs, and Discord AI music community. Join our AI community for Suno, Udio, Riffusion, and AI-assisted generated songs.',
  keywords: [
    'seo ai radio community',
    'ai community suno',
    'ai community udio',
    'ai community riffusion',
    'ai-assisted music',
    'ai-assisted generated songs',
    'discord ai music community',
    'ai radio',
    'ai music',
    'artificial intelligence music',
    'ai generated music',
    'music ai community',
    'discord music bot',
    'ai music production',
    'machine learning music',
    'ai composer',
    'automated music generation'
  ],
  authors: [{ name: 'OADRO Radio Team' }],
  creator: 'OADRO Radio',
  publisher: 'OADRO Radio',
  category: 'Music & Audio',
  classification: 'AI Music Community Platform',
  manifest: '/site.webmanifest',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://radio.oadro.com',
    siteName: 'OADRO Radio',
    title: 'OADRO Radio - AI Music Community & Discord AI Radio',
    description: 'Join the premier AI music community featuring AI-assisted music, Discord AI radio, and AI-generated songs from Suno, Udio, and Riffusion.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'OADRO Radio - AI Music Community',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OADRO Radio - AI Music Community & Discord AI Radio',
    description: 'AI-powered radio with Discord AI music community. Discover AI-assisted music from Suno, Udio, Riffusion and more.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'OADRO AI Radio',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
    icon: [
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: '#7c3aed',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          'font-body antialiased',
          inter.variable,
          spaceGrotesk.variable
        )}
      >
        <ErrorBoundary
          showDetails={process.env.NODE_ENV === 'development'}
        >
          <AsyncBoundary
            showNetworkStatus={true}
            maxRetries={2}
          >
            <ThemeProvider
              attribute="class"
              defaultTheme="dark"
              enableSystem
              disableTransitionOnChange
            >
              <PersistentRadioProvider>
                {children}
              </PersistentRadioProvider>
              <Toaster />
            </ThemeProvider>
          </AsyncBoundary>
        </ErrorBoundary>
      </body>
    </html>
  );
}
