import { translator } from '@/lib/minecraft/locale';
import { getLocale } from '@/lib/minecraft/locale-server';

import Link from 'next/link';

export default async function NotFound() {
  const t = translator(await getLocale());
  return <main className="mc-wrap mc-subpage"><div className="mc-empty">
    <span className="mc-eyebrow">404</span><h1>{t('Không tìm thấy trang', 'Page not found')}</h1>
    <p>{t('Bạn có thể tìm dự án và hướng dẫn trong thư viện.', 'Find projects and guides in the library.')}</p>
    <Link href="/" className="mc-button mc-primary">{t('Về trang chủ', 'Back to home')}</Link>
  </div></main>;
}
