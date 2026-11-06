import Link from 'next/link';
import { changeLanguage } from '@/app/language';
import { translator, type Locale } from '@/lib/minecraft/locale';
import { AtlasSigil, Icon } from './icons';

export function MinecraftHeader({ locale }: { locale: Locale }) {
  const t = translator(locale);
  return <header className="mc-header"><div className="mc-wrap mc-header-inner">
    <Link href="/" className="mc-brand"><span className="mc-brand-icon"><AtlasSigil /></span>
      <span>Mod<span className="mc-brand-accent"> Atlas</span></span></Link>
    <div className="mc-header-actions">
      <nav aria-label={t('Điều hướng Minecraft', 'Minecraft navigation')}>
        <Link href="/thu-vien" prefetch={false}>{t('Thư viện', 'Library')}</Link>
        <Link href="/vat-pham">{t('Vật phẩm', 'Items')}</Link>
        <Link href="/goi-mod" className="mc-nav-pack"><Icon name="modpack" size={17} /> {t('Gói của tôi', 'My Pack')}</Link>
      </nav>
      <form action={changeLanguage} className="mc-language" aria-label={t('Ngôn ngữ', 'Language')}>
        <button type="submit" name="language" value="vi" lang="vi" aria-pressed={locale === 'vi'}>Tiếng Việt</button>
        <button type="submit" name="language" value="en" lang="en" aria-pressed={locale === 'en'}>English</button>
      </form>
    </div>
  </div></header>;
}

export function MinecraftFooter({ locale }: { locale: Locale }) {
  const t = translator(locale);
  return <footer className="mc-footer"><div className="mc-wrap mc-footer-inner">
    <div><strong>Mod Atlas</strong><p>{t('Dự án cộng đồng cho Minecraft: Java Edition, không liên kết với Mojang hay Microsoft.', 'A community project for Minecraft: Java Edition, unaffiliated with Mojang or Microsoft.')}</p></div>
    <div className="mc-footer-links"><a href="https://modrinth.com/">{t('Nguồn Modrinth ↗', 'Modrinth source ↗')}</a><Link href="/vat-pham">{t('Sổ tay vật phẩm', 'Item Handbook')}</Link></div>
  </div></footer>;
}
