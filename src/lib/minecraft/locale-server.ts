import 'server-only';

import { cookies } from 'next/headers';
import { cache } from 'react';
import type { Locale } from './locale';

export const localeCookie = 'mod-atlas-language';

export const getLocale = cache(async (): Promise<Locale> => {
  return (await cookies()).get(localeCookie)?.value === 'en' ? 'en' : 'vi';
});
