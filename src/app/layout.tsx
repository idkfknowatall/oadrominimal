import type { Metadata, Viewport } from 'next';
import './globals.css';
import '@/lib/radio-simple'; // This will initialize and start the simplified radio worker
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme-provider';
import { inter, spaceGrotesk } from './fonts';
import { cn } from '@/lib/utils';
import ErrorBoundary from '@/components/error-boundary';
import AsyncBoundary from '@/components/async-boundary';

export const metadata: Metadata = {
  applicationName: 'OADRO Radio',
  title: 'OADRO Radio',
  description: 'AI-powered radio experience',
  manifest: '/site.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'OADRO',
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
              {children}
              <Toaster />
            </ThemeProvider>
          </AsyncBoundary>
        </ErrorBoundary>
      </body>
    </html>
  );
}
