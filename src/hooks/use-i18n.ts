'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { uiLogger } from '@/lib/logger';

export type SupportedLocale = 'en' | 'es' | 'fr' | 'de' | 'ja' | 'ko' | 'zh' | 'pt' | 'ru' | 'ar';

export interface TranslationKeys {
  'nav.home': string;
  'nav.schedule': string;
  'nav.requests': string;
  'nav.about': string;
  'player.play': string;
  'player.pause': string;
  'player.volume': string;
  'player.mute': string;
  'player.unmute': string;
  'player.loading': string;
  'player.error': string;
  'player.retry': string;
  'player.nowPlaying': string;
  'player.upNext': string;
  'player.recentlyPlayed': string;
  'player.listeners': string;
  'player.offline': string;
  'time.now': string;
  'time.today': string;
  'time.tomorrow': string;
  'time.yesterday': string;
  'time.thisWeek': string;
  'time.nextWeek': string;
  'time.ago': string;
  'time.in': string;
  'time.minutes': string;
  'time.hours': string;
  'time.days': string;
  'requests.title': string;
  'requests.submit': string;
  'requests.songTitle': string;
  'requests.artist': string;
  'requests.message': string;
  'requests.success': string;
  'requests.error': string;
  'requests.pending': string;
  'requests.approved': string;
  'requests.rejected': string;
  'schedule.title': string;
  'schedule.live': string;
  'schedule.upcoming': string;
  'schedule.noEvents': string;
  'schedule.duration': string;
  'a11y.skipToContent': string;
  'a11y.skipToNavigation': string;
  'a11y.openMenu': string;
  'a11y.closeMenu': string;
  'a11y.loading': string;
  'a11y.error': string;
  'a11y.playButton': string;
  'a11y.pauseButton': string;
  'a11y.volumeSlider': string;
  'a11y.muteButton': string;
  'error.generic': string;
  'error.network': string;
  'error.notFound': string;
  'error.serverError': string;
  'error.unauthorized': string;
  'error.rateLimit': string;
  'error.audioNotSupported': string;
  'error.audioLoadFailed': string;
  'common.loading': string;
  'common.error': string;
  'common.success': string;
  'common.warning': string;
  'common.info': string;
  'common.close': string;
  'common.cancel': string;
  'common.confirm': string;
  'common.save': string;
  'common.reset': string;
  'common.settings': string;
  'common.language': string;
  'common.theme': string;
  'common.version': string;
}

export type TranslationFunction = (key: keyof TranslationKeys, params?: Record<string, string | number>) => string;

interface I18nContextType {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  t: TranslationFunction;
  isLoading: boolean;
  availableLocales: SupportedLocale[];
  formatDate: (date: Date, options?: Intl.DateTimeFormatOptions) => string;
  formatTime: (date: Date, options?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (number: number, options?: Intl.NumberFormatOptions) => string;
  formatRelativeTime: (date: Date) => string;
  isRTL: boolean;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

const defaultTranslations: TranslationKeys = {
  'nav.home': 'Home',
  'nav.schedule': 'Schedule',
  'nav.requests': 'Requests',
  'nav.about': 'About',
  'player.play': 'Play',
  'player.pause': 'Pause',
  'player.volume': 'Volume',
  'player.mute': 'Mute',
  'player.unmute': 'Unmute',
  'player.loading': 'Loading...',
  'player.error': 'Playback Error',
  'player.retry': 'Retry',
  'player.nowPlaying': 'Now Playing',
  'player.upNext': 'Up Next',
  'player.recentlyPlayed': 'Recently Played',
  'player.listeners': 'Listeners',
  'player.offline': 'Offline',
  'time.now': 'Now',
  'time.today': 'Today',
  'time.tomorrow': 'Tomorrow',
  'time.yesterday': 'Yesterday',
  'time.thisWeek': 'This Week',
  'time.nextWeek': 'Next Week',
  'time.ago': 'ago',
  'time.in': 'in',
  'time.minutes': 'minutes',
  'time.hours': 'hours',
  'time.days': 'days',
  'requests.title': 'Song Requests',
  'requests.submit': 'Submit Request',
  'requests.songTitle': 'Song Title',
  'requests.artist': 'Artist',
  'requests.message': 'Message (optional)',
  'requests.success': 'Request submitted successfully!',
  'requests.error': 'Failed to submit request',
  'requests.pending': 'Pending',
  'requests.approved': 'Approved',
  'requests.rejected': 'Rejected',
  'schedule.title': 'Radio Schedule',
  'schedule.live': 'Live Now',
  'schedule.upcoming': 'Upcoming',
  'schedule.noEvents': 'No scheduled events',
  'schedule.duration': 'Duration',
  'a11y.skipToContent': 'Skip to main content',
  'a11y.skipToNavigation': 'Skip to navigation',
  'a11y.openMenu': 'Open menu',
  'a11y.closeMenu': 'Close menu',
  'a11y.loading': 'Loading content',
  'a11y.error': 'Error occurred',
  'a11y.playButton': 'Play radio',
  'a11y.pauseButton': 'Pause radio',
  'a11y.volumeSlider': 'Adjust volume',
  'a11y.muteButton': 'Toggle mute',
  'error.generic': 'An unexpected error occurred',
  'error.network': 'Network connection error',
  'error.notFound': 'Content not found',
  'error.serverError': 'Server error occurred',
  'error.unauthorized': 'Access denied',
  'error.rateLimit': 'Too many requests. Please try again later.',
  'error.audioNotSupported': 'Audio playback not supported',
  'error.audioLoadFailed': 'Failed to load audio stream',
  'common.loading': 'Loading',
  'common.error': 'Error',
  'common.success': 'Success',
  'common.warning': 'Warning',
  'common.info': 'Information',
  'common.close': 'Close',
  'common.cancel': 'Cancel',
  'common.confirm': 'Confirm',
  'common.save': 'Save',
  'common.reset': 'Reset',
  'common.settings': 'Settings',
  'common.language': 'Language',
  'common.theme': 'Theme',
  'common.version': 'Version',
};

const translationCache = new Map<SupportedLocale, Partial<TranslationKeys>>();
const RTL_LANGUAGES: SupportedLocale[] = ['ar'];
const AVAILABLE_LOCALES: SupportedLocale[] = ['en', 'es', 'fr', 'de', 'ja', 'ko', 'zh', 'pt', 'ru', 'ar'];

function detectBrowserLocale(): SupportedLocale {
  if (typeof window === 'undefined') return 'en';
  const browserLocale = navigator.language.split('-')[0] as SupportedLocale;
  return AVAILABLE_LOCALES.includes(browserLocale) ? browserLocale : 'en';
}

async function loadTranslations(locale: SupportedLocale): Promise<Partial<TranslationKeys>> {
  if (locale === 'en') return defaultTranslations;
  
  if (translationCache.has(locale)) {
    return translationCache.get(locale)!;
  }
  
  try {
    const translations = await simulateTranslationLoad(locale);
    translationCache.set(locale, translations);
    return translations;
  } catch (error) {
    uiLogger.error('Failed to load translations', error instanceof Error ? error : new Error('Unknown translation error'), { locale });
    return {};
  }
}

async function simulateTranslationLoad(locale: SupportedLocale): Promise<Partial<TranslationKeys>> {
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const sampleTranslations: Record<SupportedLocale, Partial<TranslationKeys>> = {
    en: defaultTranslations,
    es: {
      'nav.home': 'Inicio',
      'nav.schedule': 'Horario',
      'nav.requests': 'Solicitudes',
      'nav.about': 'Acerca de',
      'player.play': 'Reproducir',
      'player.pause': 'Pausar',
      'player.loading': 'Cargando...',
      'common.loading': 'Cargando',
      'common.error': 'Error',
    },
    fr: {
      'nav.home': 'Accueil',
      'nav.schedule': 'Programme',
      'nav.requests': 'Demandes',
      'nav.about': 'À propos',
      'player.play': 'Jouer',
      'player.pause': 'Pause',
      'player.loading': 'Chargement...',
      'common.loading': 'Chargement',
      'common.error': 'Erreur',
    },
    de: {
      'nav.home': 'Startseite',
      'nav.schedule': 'Programm',
      'nav.requests': 'Anfragen',
      'nav.about': 'Über uns',
      'player.play': 'Abspielen',
      'player.pause': 'Pausieren',
      'player.loading': 'Lädt...',
      'common.loading': 'Lädt',
      'common.error': 'Fehler',
    },
    ja: {
      'nav.home': 'ホーム',
      'nav.schedule': 'スケジュール',
      'nav.requests': 'リクエスト',
      'nav.about': 'について',
      'player.play': '再生',
      'player.pause': '一時停止',
      'player.loading': '読み込み中...',
      'common.loading': '読み込み中',
      'common.error': 'エラー',
    },
    ko: {
      'nav.home': '홈',
      'nav.schedule': '스케줄',
      'nav.requests': '요청',
      'nav.about': '소개',
      'player.play': '재생',
      'player.pause': '일시정지',
      'player.loading': '로딩 중...',
      'common.loading': '로딩 중',
      'common.error': '오류',
    },
    zh: {
      'nav.home': '首页',
      'nav.schedule': '节目表',
      'nav.requests': '点歌',
      'nav.about': '关于',
      'player.play': '播放',
      'player.pause': '暂停',
      'player.loading': '加载中...',
      'common.loading': '加载中',
      'common.error': '错误',
    },
    pt: {
      'nav.home': 'Início',
      'nav.schedule': 'Programação',
      'nav.requests': 'Pedidos',
      'nav.about': 'Sobre',
      'player.play': 'Reproduzir',
      'player.pause': 'Pausar',
      'player.loading': 'Carregando...',
      'common.loading': 'Carregando',
      'common.error': 'Erro',
    },
    ru: {
      'nav.home': 'Главная',
      'nav.schedule': 'Расписание',
      'nav.requests': 'Заявки',
      'nav.about': 'О нас',
      'player.play': 'Воспроизвести',
      'player.pause': 'Пауза',
      'player.loading': 'Загрузка...',
      'common.loading': 'Загрузка',
      'common.error': 'Ошибка',
    },
    ar: {
      'nav.home': 'الرئيسية',
      'nav.schedule': 'الجدول',
      'nav.requests': 'الطلبات',
      'nav.about': 'حول',
      'player.play': 'تشغيل',
      'player.pause': 'إيقاف مؤقت',
      'player.loading': 'جاري التحميل...',
      'common.loading': 'جاري التحميل',
      'common.error': 'خطأ',
    },
  };
  
  return sampleTranslations[locale] || {};
}

function interpolateParams(text: string, params: Record<string, string | number> = {}): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return params[key]?.toString() || match;
  });
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<SupportedLocale>('en');
  const [translations, setTranslations] = useState<Partial<TranslationKeys>>(defaultTranslations);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const savedLocale = localStorage.getItem('oadro_locale') as SupportedLocale;
    const initialLocale = savedLocale || detectBrowserLocale();
    
    if (initialLocale !== 'en') {
      setLocale(initialLocale);
    }
  }, [setLocale]);

  const t: TranslationFunction = useCallback((key: keyof TranslationKeys, params?: Record<string, string | number>) => {
    const translation = translations[key] || defaultTranslations[key] || key;
    return interpolateParams(translation, params);
  }, [translations]);

  const setLocale = useCallback(async (newLocale: SupportedLocale) => {
    if (newLocale === locale) return;
    
    setIsLoading(true);
    try {
      const newTranslations = await loadTranslations(newLocale);
      setTranslations({ ...defaultTranslations, ...newTranslations });
      setLocaleState(newLocale);
      localStorage.setItem('oadro_locale', newLocale);
      
      document.documentElement.lang = newLocale;
      document.documentElement.dir = RTL_LANGUAGES.includes(newLocale) ? 'rtl' : 'ltr';
      
      uiLogger.info('Locale changed', { locale: newLocale });
    } catch (error) {
      uiLogger.error('Failed to change locale', error instanceof Error ? error : new Error('Unknown locale error'), { locale: newLocale });
    } finally {
      setIsLoading(false);
    }
  }, [locale]);

  const formatDate = useCallback((date: Date, options?: Intl.DateTimeFormatOptions) => {
    return new Intl.DateTimeFormat(locale, options).format(date);
  }, [locale]);

  const formatTime = useCallback((date: Date, options?: Intl.DateTimeFormatOptions) => {
    return new Intl.DateTimeFormat(locale, { 
      hour: '2-digit', 
      minute: '2-digit',
      ...options 
    }).format(date);
  }, [locale]);

  const formatNumber = useCallback((number: number, options?: Intl.NumberFormatOptions) => {
    return new Intl.NumberFormat(locale, options).format(number);
  }, [locale]);

  const formatRelativeTime = useCallback((date: Date) => {
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffMinutes = Math.round(diffMs / (1000 * 60));
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    try {
      const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
      
      if (Math.abs(diffMinutes) < 60) {
        return rtf.format(diffMinutes, 'minute');
      } else if (Math.abs(diffHours) < 24) {
        return rtf.format(diffHours, 'hour');
      } else {
        return rtf.format(diffDays, 'day');
      }
    } catch (error) {
      if (Math.abs(diffMinutes) < 60) {
        return `${Math.abs(diffMinutes)} ${t('time.minutes')} ${diffMinutes > 0 ? t('time.in') : t('time.ago')}`;
      } else if (Math.abs(diffHours) < 24) {
        return `${Math.abs(diffHours)} ${t('time.hours')} ${diffHours > 0 ? t('time.in') : t('time.ago')}`;
      } else {
        return `${Math.abs(diffDays)} ${t('time.days')} ${diffDays > 0 ? t('time.in') : t('time.ago')}`;
      }
    }
  }, [locale, t]);

  const contextValue: I18nContextType = {
    locale,
    setLocale,
    t,
    isLoading,
    availableLocales: AVAILABLE_LOCALES,
    formatDate,
    formatTime,
    formatNumber,
    formatRelativeTime,
    isRTL: RTL_LANGUAGES.includes(locale),
  };

  return React.createElement(I18nContext.Provider, { value: contextValue }, children);
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}

export function useTranslation() {
  const { t } = useI18n();
  return { t };
} 