'use client';

import { useState } from 'react';
import { useI18n, SupportedLocale } from '@/hooks/use-i18n';
import { ChevronDownIcon, GlobeIcon } from 'lucide-react';

interface LanguageOption {
  code: SupportedLocale;
  name: string;
  nativeName: string;
  flag: string;
}

const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
];

interface LanguageSelectorProps {
  variant?: 'dropdown' | 'inline';
  showFlags?: boolean;
  showNativeNames?: boolean;
  className?: string;
}

export function LanguageSelector({
  variant = 'dropdown',
  showFlags = true,
  showNativeNames = true,
  className = '',
}: LanguageSelectorProps) {
  const { locale, setLocale, isLoading, t, isRTL } = useI18n();
  const [isOpen, setIsOpen] = useState(false);

  const currentLanguage = LANGUAGE_OPTIONS.find(lang => lang.code === locale);

  const handleLanguageChange = async (newLocale: SupportedLocale) => {
    await setLocale(newLocale);
    setIsOpen(false);
  };

  if (variant === 'inline') {
    return (
      <div className={`flex flex-wrap gap-2 ${className}`}>
        {LANGUAGE_OPTIONS.map((language) => (
          <button
            key={language.code}
            onClick={() => handleLanguageChange(language.code)}
            disabled={isLoading}
            className={`
              px-3 py-1 rounded-md text-sm font-medium transition-colors
              ${locale === language.code
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              }
              ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              ${isRTL ? 'flex-row-reverse' : ''}
            `}
            aria-label={`Switch to ${language.name}`}
          >
            {showFlags && <span className="mr-2">{language.flag}</span>}
            <span>{showNativeNames ? language.nativeName : language.name}</span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-700
          hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700
          ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${isRTL ? 'flex-row-reverse' : ''}
        `}
        aria-label={t('common.language')}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <GlobeIcon className="w-4 h-4" />
        {currentLanguage && (
          <>
            {showFlags && <span>{currentLanguage.flag}</span>}
            <span className="text-sm">
              {showNativeNames ? currentLanguage.nativeName : currentLanguage.name}
            </span>
          </>
        )}
        <ChevronDownIcon 
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          
          {/* Dropdown */}
          <div
            className={`
              absolute z-20 mt-1 w-64 bg-white border border-gray-300 rounded-md shadow-lg
              dark:bg-gray-800 dark:border-gray-600
              ${isRTL ? 'right-0' : 'left-0'}
            `}
            role="listbox"
            aria-label={t('common.language')}
          >
            <div className="py-1 max-h-60 overflow-auto">
              {LANGUAGE_OPTIONS.map((language) => (
                <button
                  key={language.code}
                  onClick={() => handleLanguageChange(language.code)}
                  disabled={isLoading}
                  className={`
                    w-full flex items-center gap-3 px-4 py-2 text-left text-sm transition-colors
                    ${locale === language.code
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                    }
                    ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    ${isRTL ? 'flex-row-reverse text-right' : ''}
                  `}
                  role="option"
                  aria-selected={locale === language.code}
                >
                  {showFlags && <span className="text-lg">{language.flag}</span>}
                  <div className="flex-1">
                    <div className="font-medium">
                      {showNativeNames ? language.nativeName : language.name}
                    </div>
                    {showNativeNames && language.nativeName !== language.name && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {language.name}
                      </div>
                    )}
                  </div>
                  {locale === language.code && (
                    <div className="w-2 h-2 bg-blue-600 rounded-full" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Simple language toggle for minimal UI
export function LanguageToggle({ className = '' }: { className?: string }) {
  const { locale, setLocale, isLoading, t } = useI18n();
  
  const toggleLanguage = async () => {
    const nextLocale = locale === 'en' ? 'es' : 'en';
    await setLocale(nextLocale);
  };

  const currentLanguage = LANGUAGE_OPTIONS.find(lang => lang.code === locale);

  return (
    <button
      onClick={toggleLanguage}
      disabled={isLoading}
      className={`
        flex items-center gap-2 px-2 py-1 rounded text-sm font-medium transition-colors
        bg-gray-100 text-gray-700 hover:bg-gray-200 
        dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700
        ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
      aria-label={`${t('common.language')}: ${currentLanguage?.name}`}
      title={`Switch language (${currentLanguage?.name})`}
    >
      <GlobeIcon className="w-4 h-4" />
      <span>{currentLanguage?.flag}</span>
      <span className="sr-only">{currentLanguage?.name}</span>
    </button>
  );
}