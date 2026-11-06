import { translator } from '@/lib/minecraft/locale';
import { getLocale } from '@/lib/minecraft/locale-server';

import Link from 'next/link';

export default async function MinecraftNotFound() {
  const t = translator(await getLocale());
  return <main className="mc-wrap mc-subpage"><div className="mc-empty">
    <span className="mc-eyebrow">404</span><h1>{t('Không tìm thấy dự án', 'Project not found')}</h1>
    <p>{t('Dự án có thể đã đổi địa chỉ hoặc không còn công khai trên Modrinth.', 'The project may have moved or may no longer be public on Modrinth.')}</p>
    <Link href="/thu-vien" className="mc-button mc-primary" prefetch={false}>{t('Về thư viện', 'Back to library')}</Link>
  </div></main>;
}
