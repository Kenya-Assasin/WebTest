export type Locale = 'vi' | 'en';

export function translator(locale: Locale) {
  return (vi: string, en: string) => locale === 'en' ? en : vi;
}
