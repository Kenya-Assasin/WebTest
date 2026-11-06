import { translator } from '@/lib/minecraft/locale';
import { getLocale } from '@/lib/minecraft/locale-server';

export default async function LibraryLoading() {
  const t = translator(await getLocale());
  return <main className="mc-wrap mc-subpage"><div className="mc-empty" role="status">
    <span className="mc-eyebrow">MODRINTH</span><h1>{t('Đang tải thư viện…', 'Loading library…')}</h1>
    <p>{t('Đang lấy thông tin dự án và bản phát hành.', 'Fetching projects and releases.')}</p>
  </div></main>;
}
