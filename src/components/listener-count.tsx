'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Users } from 'lucide-react';
import { calculateEngagementMetrics } from '@/lib/metrics';

export default function ListenerCount() {
  const [count, setCount] = useState(12);
  const pathname = usePathname();

  useEffect(() => {
    // Update count immediately
    setCount(calculateEngagementMetrics());

    // Update every hour
    const interval = setInterval(() => {
      setCount(calculateEngagementMetrics());
    }, 3600000); // 1 hour in milliseconds

    return () => clearInterval(interval);
  }, []);

  // Don't show on About page
  if (pathname === '/about') {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg px-3 py-2 flex items-center gap-2 text-sm text-white/90">
      <Users className="h-4 w-4" />
      <span className="font-medium">{count}</span>
      <span className="text-white/70">listening</span>
    </div>
  );
}