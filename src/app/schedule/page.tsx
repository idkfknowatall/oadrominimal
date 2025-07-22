import type { Metadata } from 'next';
import ScheduleView from '@/components/schedule-view';

export const metadata: Metadata = {
  title: 'Radio Schedule - OADRO Radio',
  description: 'Stay tuned with our programming schedule and never miss your favorite shows on OADRO Radio.',
  keywords: [
    'radio schedule',
    'programming schedule',
    'oadro radio schedule',
    'radio shows',
    'music schedule',
    'playlist schedule',
    'radio programming',
    'live radio schedule'
  ],
  openGraph: {
    title: 'Radio Schedule - OADRO Radio',
    description: 'Stay tuned with our programming schedule and never miss your favorite shows on OADRO Radio.',
    type: 'website',
    url: 'https://radio.oadro.com/schedule',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Radio Schedule - OADRO Radio',
    description: 'Stay tuned with our programming schedule and never miss your favorite shows.',
  },
  alternates: {
    canonical: 'https://radio.oadro.com/schedule',
  },
};

export default function SchedulePage() {
  return <ScheduleView />;
}