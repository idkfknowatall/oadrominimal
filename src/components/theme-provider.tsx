'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';

// Dynamically import ThemeProvider to avoid SSR issues
const NextThemesProvider = dynamic(
  () => import('next-themes').then((mod) => mod.ThemeProvider),
  {
    ssr: false,
    loading: () => null,
  }
);

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<any>) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return <>{children}</>;
  }

  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
