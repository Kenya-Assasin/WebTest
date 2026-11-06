'use client';

import { useLanguage } from '@/components/minecraft/language-provider';

export default function ErrorPage({ retry }: { error: Error; retry: () => void }) {
  const t = useLanguage();
  return <main className="mc-wrap mc-subpage"><div className="mc-empty" role="alert">
    <h1>{t('Không thể tải trang', 'Could not load the page')}</h1>
    <p>{t('Kiểm tra kết nối rồi thử lại.', 'Check your connection and try again.')}</p>
    <button type="button" className="mc-button mc-primary" onClick={retry}>{t('Thử lại', 'Try again')}</button>
  </div></main>;
}
