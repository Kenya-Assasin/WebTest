import Image from 'next/image';
import Link from 'next/link';
import { GuideCard, ProjectCard } from '@/components/minecraft/cards';
import { AtlasSigil, Icon, VoxelRelic } from '@/components/minecraft/icons';
import { featured, guides } from '@/lib/minecraft/guides';

const categories = [
  { kind: 'mod', chapter: 'I', title: 'Mod', description: 'Thêm cơ chế, vật phẩm và tính năng.' },
  { kind: 'modpack', chapter: 'II', title: 'Modpack', description: 'Khám phá các gói mod đã được tuyển chọn.' },
  { kind: 'resourcepack', chapter: 'III', title: 'Resource pack', description: 'Đổi texture và diện mạo của thế giới.' },
] as const;

export default function MinecraftHome() {
  return <main className="mc-wrap mc-home">
    <section className="mc-hero">
      <div className="mc-hero-art" aria-hidden="true">
        <Image src="/atlas/sky-archive.webp" alt="" fill preload unoptimized />
      </div>
      <div className="mc-hero-frame" aria-hidden="true" />
      <div className="mc-hero-copy">
        <span className="mc-eyebrow"><Icon name="spark" size={15} /> MINECRAFT JAVA · THƯ VIỆN TIẾNG VIỆT</span>
        <h1>Khám phá mod.<br /><em>Ghép gói của bạn.</em></h1>
        <p>Mỗi thế giới bắt đầu từ một khối vuông. Tìm mod, modpack và resource pack, tra cách dùng vật phẩm và xem cần cài thêm gì cho cuộc phiêu lưu của bạn.</p>
        <form action="/thu-vien" className="mc-hero-search">
          <Icon name="search" /><input name="q" aria-label="Tìm dự án Minecraft" maxLength={100} placeholder="Thử Create, Sodium, Faithful…" />
          <button type="submit" className="mc-button mc-primary">Tìm kiếm <Icon name="arrow" size={16} /></button>
        </form>
        <div className="mc-hero-links"><Link href="/thu-vien" prefetch={false}>Duyệt thư viện <Icon name="arrow" size={16} /></Link><Link href="/vat-pham">Tra cứu vật phẩm</Link></div>
      </div>
      <div className="mc-hero-caption" aria-hidden="true"><AtlasSigil size={26} /> THƯ VIỆN TRÊN MÂY</div>
    </section>
    <section className="mc-category-grid" aria-label="Nhóm dự án">
      {categories.map(category => <Link href={'/thu-vien?kind=' + category.kind} prefetch={false} key={category.kind} className={'mc-category mc-category-' + category.kind}>
        <span className="mc-category-mark"><VoxelRelic kind={category.kind} /></span>
        <span><strong>{category.title}</strong><small>{category.description}</small></span>
        <span className="mc-chapter" aria-hidden="true">{category.chapter}<Icon name="arrow" size={16} /></span>
      </Link>)}
    </section>
    <section className="mc-home-section">
      <div className="mc-section-head"><div><span className="mc-eyebrow">KHỞI ĐẦU</span><h2>Dự án gợi ý</h2></div>
        <Link href="/thu-vien" prefetch={false} className="mc-text-link">Xem thư viện <Icon name="arrow" size={16} /></Link></div>
      <div className="mc-project-grid">{featured.map(project => <ProjectCard key={project.id} project={project} />)}</div>
    </section>
    <section className="mc-home-section">
      <div className="mc-section-head"><div><span className="mc-eyebrow">SỔ TAY CREATE</span><h2>Vật phẩm dùng thế nào?</h2></div>
        <Link href="/vat-pham" className="mc-text-link">Mở sổ tay <Icon name="arrow" size={16} /></Link></div>
      <div className="mc-project-grid">{guides.map(guide => <GuideCard key={guide.id} guide={guide} />)}</div>
    </section>
    <section className="mc-invitation"><div><span className="mc-eyebrow">LẮP GHÉP</span><h2>Lập danh sách trước khi tải</h2>
      <p>Chọn bản phát hành trên từng trang dự án, sau đó xem gói của bạn còn thiếu gì.</p></div>
      <Link className="mc-button mc-primary" href="/goi-mod">Mở gói của tôi <Icon name="arrow" size={16} /></Link></section>
  </main>;
}
