import type { Metadata } from 'next';
import RequestsView from '@/components/requests-view';

export const metadata: Metadata = {
  title: 'Song Requests - OADRO Radio',
  description: 'Browse our music library and request your favorite songs to be played on OADRO Radio. Discover new music and help shape our playlist.',
  keywords: [
    'song requests',
    'music requests',
    'oadro radio requests',
    'request music',
    'radio playlist',
    'music library',
    'ai music requests',
    'radio song queue',
    'music discovery',
    'interactive radio'
  ],
  openGraph: {
    title: 'Song Requests - OADRO Radio',
    description: 'Browse our music library and request your favorite songs to be played on OADRO Radio.',
    type: 'website',
    url: 'https://radio.oadro.com/requests',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Song Requests - OADRO Radio',
    description: 'Browse our music library and request your favorite songs to be played on the radio.',
  },
  alternates: {
    canonical: 'https://radio.oadro.com/requests',
  },
};

export default function RequestsPage() {
  return <RequestsView />;
}