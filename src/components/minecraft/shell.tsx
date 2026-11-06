import Link from 'next/link';
import { AtlasSigil, Icon } from './icons';

export function MinecraftHeader() {
  return <header className="mc-header"><div className="mc-wrap mc-header-inner">
    <Link href="/" className="mc-brand"><span className="mc-brand-icon"><AtlasSigil /></span>
      <span>Mod<span className="mc-brand-accent"> Atlas</span></span></Link>
    <nav aria-label="Điều hướng Minecraft">
      <Link href="/thu-vien" prefetch={false}>Thư viện</Link>
      <Link href="/vat-pham">Vật phẩm</Link>
      <Link href="/goi-mod" className="mc-nav-pack"><Icon name="modpack" size={17} /> Gói của tôi</Link>
    </nav>
  </div></header>;
}

export function MinecraftFooter() {
  return <footer className="mc-footer"><div className="mc-wrap mc-footer-inner">
    <div><strong>Mod Atlas</strong><p>Dự án cộng đồng cho Minecraft: Java Edition, không liên kết với Mojang hay Microsoft.</p></div>
    <div className="mc-footer-links"><a href="https://modrinth.com/">Nguồn Modrinth ↗</a><Link href="/vat-pham">Sổ tay vật phẩm</Link></div>
  </div></footer>;
}
