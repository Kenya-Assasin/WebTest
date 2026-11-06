import Image from 'next/image';
import Link from 'next/link';
import { translator } from '@/lib/minecraft/locale';
import { getLocale } from '@/lib/minecraft/locale-server';
import { GuideCard, ProjectCard } from '@/components/minecraft/cards';
import { AtlasSigil, Icon, VoxelRelic } from '@/components/minecraft/icons';
import { featured, guides } from '@/lib/minecraft/guides';

const categories = [
  { kind: 'mod', chapter: 'I', title: 'Mod', description: ['Thêm cơ chế, vật phẩm và tính năng.', 'Add new mechanics, items and features.'] },
  { kind: 'modpack', chapter: 'II', title: 'Modpack', description: ['Khám phá các gói mod đã được tuyển chọn.', 'Discover curated collections of mods.'] },
  { kind: 'resourcepack', chapter: 'III', title: 'Resource pack', description: ['Đổi texture và diện mạo của thế giới.', 'Change textures and the look of your world.'] },
] as const;

export default async function MinecraftHome() {
  const locale = await getLocale();
  const t = translator(locale);
  return <main className="mc-wrap mc-home">
    <section className="mc-hero">
      <div className="mc-hero-art" aria-hidden="true">
        <Image src="/atlas/sky-archive.webp" alt="" fill preload unoptimized />
      </div>
      <div className="mc-hero-frame" aria-hidden="true" />
      <div className="mc-hero-copy">
        <span className="mc-eyebrow"><Icon name="spark" size={15} />{t(' MINECRAFT JAVA · THƯ VIỆN TIẾNG VIỆT', ' MINECRAFT JAVA · MOD LIBRARY')}</span>
        <h1>{t('Khám phá mod.', 'Explore mods.')}<br /><em>{t('Ghép gói của bạn.', 'Build your pack.')}</em></h1>
        <p>{t('Mỗi thế giới bắt đầu từ một khối vuông. Tìm mod, modpack và resource pack, tra cách dùng vật phẩm và xem cần cài thêm gì cho cuộc phiêu lưu của bạn.', 'Every world starts with one block. Find mods, modpacks and resource packs, learn how items work and see what else your adventure needs.')}</p>
        <form action="/thu-vien" className="mc-hero-search">
          <Icon name="search" /><input name="q" aria-label={t('Tìm dự án Minecraft', 'Find Minecraft projects')} maxLength={100} placeholder={t('Thử Create, Sodium, Faithful…', 'Try Create, Sodium or Faithful…')} />
          <button type="submit" className="mc-button mc-primary">{t('Tìm kiếm ', 'Search ')}<Icon name="arrow" size={16} /></button>
        </form>
        <div className="mc-hero-links"><Link href="/thu-vien" prefetch={false}>{t('Duyệt thư viện ', 'Browse the library ')}<Icon name="arrow" size={16} /></Link><Link href="/vat-pham">{t('Tra cứu vật phẩm', 'Look up items')}</Link></div>
      </div>
      <div className="mc-hero-caption" aria-hidden="true"><AtlasSigil size={26} />{t(' THƯ VIỆN TRÊN MÂY', ' THE SKY ARCHIVE')}</div>
    </section>
    <section className="mc-category-grid" aria-label={t('Nhóm dự án', 'Project types')}>
      {categories.map(category => <Link href={'/thu-vien?kind=' + category.kind} prefetch={false} key={category.kind} className={'mc-category mc-category-' + category.kind}>
        <span className="mc-category-mark"><VoxelRelic kind={category.kind} /></span>
        <span><strong>{category.title}</strong><small>{category.description[locale === 'en' ? 1 : 0]}</small></span>
        <span className="mc-chapter" aria-hidden="true">{category.chapter}<Icon name="arrow" size={16} /></span>
      </Link>)}
    </section>
    <section className="mc-home-section">
      <div className="mc-section-head"><div><span className="mc-eyebrow">{t('KHỞI ĐẦU', 'GET STARTED')}</span><h2>{t('Dự án gợi ý', 'Featured projects')}</h2></div>
        <Link href="/thu-vien" prefetch={false} className="mc-text-link">{t('Xem thư viện ', 'Browse all projects ')}<Icon name="arrow" size={16} /></Link></div>
      <div className="mc-project-grid">{featured.map(project => <ProjectCard key={project.id} project={project} locale={locale} />)}</div>
    </section>
    <section className="mc-home-section">
      <div className="mc-section-head"><div><span className="mc-eyebrow">{t('SỔ TAY CREATE', 'CREATE HANDBOOK')}</span><h2>{t('Vật phẩm dùng thế nào?', 'How do these items work?')}</h2></div>
        <Link href="/vat-pham" className="mc-text-link">{t('Mở sổ tay ', 'Open the handbook ')}<Icon name="arrow" size={16} /></Link></div>
      <div className="mc-project-grid">{guides.map(guide => <GuideCard key={guide.id} guide={guide} locale={locale} />)}</div>
    </section>
    <section className="mc-invitation"><div><span className="mc-eyebrow">{t('LẮP GHÉP', 'BUILD A PACK')}</span><h2>{t('Lập danh sách trước khi tải', 'Plan your pack before downloading')}</h2>
      <p>{t('Chọn bản phát hành trên từng trang dự án, sau đó xem gói của bạn còn thiếu gì.', 'Choose a release on each project page, then see what your pack still needs.')}</p></div>
      <Link className="mc-button mc-primary" href="/goi-mod">{t('Mở gói của tôi ', 'Open my pack ')}<Icon name="arrow" size={16} /></Link></section>
  </main>;
}
