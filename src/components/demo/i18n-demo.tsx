'use client';

import { useI18n } from '@/hooks/use-i18n';
import { LanguageSelector } from '@/components/ui/language-selector';
import { useState, useEffect } from 'react';

export function I18nDemo() {
  const { t, formatDate, formatTime, formatNumber, formatRelativeTime, locale, isRTL } = useI18n();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const sampleDate = new Date('2024-07-24T16:30:00');
  const futureDate = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours from now
  const pastDate = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago

  return (
    <div className={`max-w-4xl mx-auto p-6 space-y-8 ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          {t('common.language')} & Internationalization Demo
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Current locale: <span className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{locale}</span>
        </p>
        <LanguageSelector variant="dropdown" className="mx-auto" />
      </div>

      {/* Navigation Translations */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          Navigation Translations
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {(['nav.home', 'nav.schedule', 'nav.requests', 'nav.about', 'nav.services'] as const).map((key) => (
            <div key={key} className="text-center">
              <div className="bg-blue-50 dark:bg-blue-900 px-3 py-2 rounded text-blue-700 dark:text-blue-300">
                {t(key)}
              </div>
              <div className="text-xs text-gray-500 mt-1">{key}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Audio Player Translations */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          Audio Player Controls
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(['player.play', 'player.pause', 'player.volume', 'player.loading'] as const).map((key) => (
            <div key={key} className="text-center">
              <div className="bg-green-50 dark:bg-green-900 px-3 py-2 rounded text-green-700 dark:text-green-300">
                {t(key)}
              </div>
              <div className="text-xs text-gray-500 mt-1">{key}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Date and Time Formatting */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          Date & Time Formatting
        </h2>
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Current Time</h3>
              <div className="space-y-2 text-sm">
                <div>Full: {formatDate(currentTime, { dateStyle: 'full', timeStyle: 'medium' })}</div>
                <div>Date: {formatDate(currentTime, { dateStyle: 'long' })}</div>
                <div>Time: {formatTime(currentTime)}</div>
                <div>Short: {formatDate(currentTime, { dateStyle: 'short' })}</div>
              </div>
            </div>
            <div>
              <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Sample Date</h3>
              <div className="space-y-2 text-sm">
                <div>Full: {formatDate(sampleDate, { dateStyle: 'full' })}</div>
                <div>Medium: {formatDate(sampleDate, { dateStyle: 'medium' })}</div>
                <div>Weekday: {formatDate(sampleDate, { weekday: 'long' })}</div>
                <div>Month: {formatDate(sampleDate, { month: 'long' })}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Relative Time Formatting */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          Relative Time Formatting
        </h2>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-sm text-gray-500 mb-1">30 minutes ago</div>
            <div className="bg-yellow-50 dark:bg-yellow-900 px-3 py-2 rounded text-yellow-700 dark:text-yellow-300">
              {formatRelativeTime(pastDate)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-500 mb-1">Now</div>
            <div className="bg-blue-50 dark:bg-blue-900 px-3 py-2 rounded text-blue-700 dark:text-blue-300">
              {formatRelativeTime(currentTime)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-500 mb-1">2 hours from now</div>
            <div className="bg-purple-50 dark:bg-purple-900 px-3 py-2 rounded text-purple-700 dark:text-purple-300">
              {formatRelativeTime(futureDate)}
            </div>
          </div>
        </div>
      </div>

      {/* Number Formatting */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          Number Formatting
        </h2>
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Listeners Count</h3>
            <div className="bg-red-50 dark:bg-red-900 px-3 py-2 rounded text-red-700 dark:text-red-300 text-lg font-mono">
              {formatNumber(1234)} {t('player.listeners')}
            </div>
          </div>
          <div>
            <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Currency</h3>
            <div className="bg-green-50 dark:bg-green-900 px-3 py-2 rounded text-green-700 dark:text-green-300 text-lg font-mono">
              {formatNumber(99.99, { style: 'currency', currency: 'USD' })}
            </div>
          </div>
          <div>
            <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Percentage</h3>
            <div className="bg-blue-50 dark:bg-blue-900 px-3 py-2 rounded text-blue-700 dark:text-blue-300 text-lg font-mono">
              {formatNumber(0.756, { style: 'percent' })}
            </div>
          </div>
        </div>
      </div>

      {/* Error Messages */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          Error Messages
        </h2>
        <div className="space-y-2">
          {(['error.network', 'error.audioLoadFailed', 'error.rateLimit'] as const).map((key) => (
            <div key={key} className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900 rounded border-l-4 border-red-400">
              <div className="text-red-600 dark:text-red-400">⚠️</div>
              <div>
                <div className="text-red-700 dark:text-red-300">{t(key)}</div>
                <div className="text-xs text-red-500 dark:text-red-400">{key}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Common Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          Common Actions
        </h2>
        <div className="flex flex-wrap gap-3">
          {(['common.save', 'common.cancel', 'common.confirm', 'common.close', 'common.reset'] as const).map((key) => (
            <button
              key={key}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              {t(key)}
            </button>
          ))}
        </div>
      </div>

      {/* RTL Support Indicator */}
      {isRTL && (
        <div className="bg-orange-50 dark:bg-orange-900 rounded-lg p-4 border border-orange-200 dark:border-orange-700">
          <div className="flex items-center gap-2">
            <span className="text-orange-600 dark:text-orange-400">🔄</span>
            <span className="text-orange-700 dark:text-orange-300 font-medium">
              RTL (Right-to-Left) layout is active for this language
            </span>
          </div>
        </div>
      )}

      {/* Language Selector Variants */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          Language Selector Variants
        </h2>
        <div className="space-y-6">
          <div>
            <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Inline Variant</h3>
            <LanguageSelector variant="inline" />
          </div>
          <div>
            <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Dropdown Variant</h3>
            <LanguageSelector variant="dropdown" />
          </div>
        </div>
      </div>
    </div>
  );
}