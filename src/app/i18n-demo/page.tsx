import { I18nDemo } from '@/components/demo/i18n-demo';
import { I18nProvider } from '@/hooks/use-i18n';

export default function I18nDemoPage() {
  return (
    <I18nProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <I18nDemo />
      </div>
    </I18nProvider>
  );
}

export const metadata = {
  title: 'Internationalization Demo - OADRO Radio',
  description: 'Demonstration of multi-language support and formatting utilities',
};