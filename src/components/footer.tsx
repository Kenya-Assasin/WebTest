import Link from 'next/link';

export function Footer() {
  return <footer className="site-footer">
    <div className="footer-main">
      <div className="footer-brand">
        <Link href="/" className="footer-logo"><div className="footer-logo-mark">✦</div><div className="footer-logo-text"><strong>MCA</strong><span>MULTIVERSE CREATURE ARCHIVE</span></div></Link>
        <p>Cơ sở dữ liệu lưu trữ và nghiên cứu các sinh vật được phát hiện trên khắp đa vũ trụ.</p>
      </div>
      <div className="footer-column"><h3>KHÁM PHÁ</h3><Link href="/">Trang chủ</Link><Link href="/kho-du-lieu">Kho dữ liệu</Link></div>
      <div className="footer-column"><h3>ĐIỀU TRA VIÊN</h3><Link href="/tao-ho-so">Tạo hồ sơ sinh vật</Link><Link href="/dieu-tra-vien">Hồ sơ cá nhân</Link></div>
      <div className="footer-column"><h3>TÀI KHOẢN</h3><Link href="/dang-nhap">Đăng nhập</Link><Link href="/dang-ky">Đăng ký</Link></div>
    </div>
    <div className="footer-divider" />
    <div className="footer-bottom"><div className="footer-copyright"><span>© {new Date().getFullYear()} Multiverse Creature Archive</span><span className="footer-separator">•</span><span>MCA Database System</span></div></div>
  </footer>;
}


