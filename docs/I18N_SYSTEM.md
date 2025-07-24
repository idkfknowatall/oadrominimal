# Internationalization (i18n) System

## Overview

The OADRO Radio Next.js application now includes a comprehensive internationalization system that supports 10 languages with full RTL (Right-to-Left) support, locale-aware formatting, and persistent user preferences.

## Features

### Multi-Language Support
- **10 Supported Locales**: English (en), Spanish (es), French (fr), German (de), Japanese (ja), Korean (ko), Chinese (zh), Portuguese (pt), Russian (ru), Arabic (ar)
- **RTL Support**: Automatic layout direction switching for Arabic
- **Browser Detection**: Automatically detects user's preferred language from browser settings
- **Persistent Preferences**: Stores user language choice in localStorage

### Translation System
- **Comprehensive Translation Keys**: Covers navigation, audio player, time/date, requests, schedule, accessibility, errors, and common UI elements
- **Parameter Interpolation**: Support for dynamic content with `{{parameter}}` syntax
- **Fallback Mechanism**: Falls back to English if translation is missing
- **Async Loading**: Translations are loaded asynchronously with caching for performance

### Formatting Utilities
- **Date Formatting**: Locale-aware date formatting with multiple styles
- **Time Formatting**: 24/12-hour format based on locale preferences
- **Number Formatting**: Currency, percentage, and decimal formatting
- **Relative Time**: Human-readable relative time (e.g., "2 hours ago", "in 5 minutes")

## Implementation

### Core Hook: `useI18n`

```typescript
import { useI18n } from '@/hooks/use-i18n';

function MyComponent() {
  const { 
    locale,           // Current locale (e.g., 'en', 'es')
    setLocale,        // Function to change locale
    t,                // Translation function
    isLoading,        // Loading state for locale changes
    availableLocales, // Array of supported locales
    formatDate,       // Date formatting function
    formatTime,       // Time formatting function
    formatNumber,     // Number formatting function
    formatRelativeTime, // Relative time formatting
    isRTL             // Boolean indicating RTL layout
  } = useI18n();

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'}>
      <h1>{t('nav.home')}</h1>
      <p>{formatDate(new Date())}</p>
      <p>{formatNumber(1234)} {t('player.listeners')}</p>
    </div>
  );
}
```

### Translation Function

The `t` function supports parameter interpolation:

```typescript
// Simple translation
t('nav.home') // "Home" (English) or "Inicio" (Spanish)

// With parameters
t('time.minutesAgo', { minutes: 5 }) // "5 minutes ago"
```

### Provider Setup

Wrap your application with the `I18nProvider`:

```typescript
import { I18nProvider } from '@/hooks/use-i18n';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <I18nProvider>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
```

## Components

### LanguageSelector

A comprehensive language selector component with multiple variants:

```typescript
import { LanguageSelector } from '@/components/ui/language-selector';

// Dropdown variant (default)
<LanguageSelector variant="dropdown" />

// Inline variant (shows all languages as buttons)
<LanguageSelector variant="inline" />

// Customization options
<LanguageSelector 
  variant="dropdown"
  showFlags={true}
  showNativeNames={true}
  className="custom-class"
/>
```

### LanguageToggle

A simple toggle for switching between two languages:

```typescript
import { LanguageToggle } from '@/components/ui/language-selector';

<LanguageToggle className="header-lang-toggle" />
```

## Translation Keys Structure

### Navigation
- `nav.home`, `nav.schedule`, `nav.requests`, `nav.about`, `nav.services`

### Audio Player
- `player.play`, `player.pause`, `player.volume`, `player.mute`, `player.unmute`
- `player.loading`, `player.error`, `player.retry`, `player.nowPlaying`
- `player.upNext`, `player.recentlyPlayed`, `player.listeners`, `player.offline`

### Time and Date
- `time.now`, `time.today`, `time.tomorrow`, `time.yesterday`
- `time.thisWeek`, `time.nextWeek`, `time.ago`, `time.in`
- `time.minutes`, `time.hours`, `time.days`

### Requests
- `requests.title`, `requests.submit`, `requests.songTitle`, `requests.artist`
- `requests.message`, `requests.success`, `requests.error`
- `requests.pending`, `requests.approved`, `requests.rejected`

### Schedule
- `schedule.title`, `schedule.live`, `schedule.upcoming`
- `schedule.noEvents`, `schedule.duration`

### Accessibility
- `a11y.skipToContent`, `a11y.skipToNavigation`, `a11y.openMenu`, `a11y.closeMenu`
- `a11y.loading`, `a11y.error`, `a11y.playButton`, `a11y.pauseButton`
- `a11y.volumeSlider`, `a11y.muteButton`

### Errors
- `error.generic`, `error.network`, `error.notFound`, `error.serverError`
- `error.unauthorized`, `error.rateLimit`, `error.audioNotSupported`, `error.audioLoadFailed`

### Common
- `common.loading`, `common.error`, `common.success`, `common.warning`, `common.info`
- `common.close`, `common.cancel`, `common.confirm`, `common.save`, `common.reset`
- `common.settings`, `common.language`, `common.theme`, `common.version`

## Formatting Examples

### Date Formatting

```typescript
const { formatDate } = useI18n();

// Full date with time
formatDate(new Date(), { dateStyle: 'full', timeStyle: 'medium' })
// English: "Wednesday, July 24, 2024 at 4:30:00 PM"
// Spanish: "miércoles, 24 de julio de 2024, 16:30:00"

// Date only
formatDate(new Date(), { dateStyle: 'long' })
// English: "July 24, 2024"
// French: "24 juillet 2024"
```

### Number Formatting

```typescript
const { formatNumber } = useI18n();

// Basic number
formatNumber(1234) // "1,234" (English) or "1.234" (German)

// Currency
formatNumber(99.99, { style: 'currency', currency: 'USD' })
// English: "$99.99"
// German: "99,99 $"

// Percentage
formatNumber(0.756, { style: 'percent' })
// "75.6%" (English) or "75,6 %" (French)
```

### Relative Time

```typescript
const { formatRelativeTime } = useI18n();

const pastDate = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
formatRelativeTime(pastDate)
// English: "30 minutes ago"
// Spanish: "hace 30 minutos"
// Japanese: "30分前"
```

## RTL Support

The system automatically handles RTL layout for Arabic:

```typescript
const { isRTL } = useI18n();

<div 
  dir={isRTL ? 'rtl' : 'ltr'}
  className={isRTL ? 'text-right' : 'text-left'}
>
  Content automatically adapts to reading direction
</div>
```

## Performance Optimizations

### Translation Caching
- Translations are cached in memory after first load
- No redundant network requests for the same locale

### Lazy Loading
- Translations are loaded only when needed
- Default English translations are always available immediately

### Memoization
- Formatting functions are memoized based on locale
- Translation function is memoized based on current translations

## Browser Compatibility

- **Modern Browsers**: Full support with native Intl API
- **Legacy Browsers**: Graceful fallback for relative time formatting
- **SSR Compatible**: Works with Next.js server-side rendering

## Demo Page

Visit `/i18n-demo` to see a comprehensive demonstration of all i18n features including:
- Live language switching
- All translation categories
- Date/time/number formatting examples
- RTL layout demonstration
- Language selector variants

## Integration with Existing Systems

The i18n system integrates seamlessly with:
- **Logger System**: All locale changes are logged via `uiLogger`
- **Feature Flags**: Compatible with the existing feature flag architecture
- **Theme System**: Works alongside dark/light theme switching
- **Accessibility**: Full ARIA support and screen reader compatibility

## Future Enhancements

Potential improvements for future versions:
- **Translation Management**: Integration with translation services (Crowdin, Lokalise)
- **Pluralization**: Advanced plural form handling
- **Regional Variants**: Support for regional language variants (en-US vs en-GB)
- **Dynamic Loading**: Load translations from external APIs
- **Translation Keys Validation**: TypeScript validation for translation keys

## Best Practices

1. **Always use translation keys** instead of hardcoded strings
2. **Provide context** in translation keys (e.g., `button.save` vs `form.save`)
3. **Test RTL layouts** when adding new UI components
4. **Use semantic HTML** for better accessibility across languages
5. **Consider text expansion** - some languages require 30-50% more space
6. **Validate number/date formats** in different locales during testing

This internationalization system provides a solid foundation for making OADRO Radio accessible to a global audience while maintaining excellent performance and user experience.