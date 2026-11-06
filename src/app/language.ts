'use server';

import { cookies } from 'next/headers';
import { localeCookie } from '@/lib/minecraft/locale-server';

export async function changeLanguage(formData: FormData) {
  const locale = formData.get('language');
  if (locale !== 'vi' && locale !== 'en') return;
  (await cookies()).set(localeCookie, locale, {
    path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax', httpOnly: true, secure: process.env.NODE_ENV === 'production',
  });
}
