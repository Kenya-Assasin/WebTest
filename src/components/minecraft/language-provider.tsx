'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { translator, type Locale } from '@/lib/minecraft/locale';

const LanguageContext = createContext<Locale>('vi');

export function LanguageProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <LanguageContext.Provider value={locale}>{children}</LanguageContext.Provider>;
}

export function useLocale() {
  return useContext(LanguageContext);
}

export function useLanguage() {
  return translator(useLocale());
}
