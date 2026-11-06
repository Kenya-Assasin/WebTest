import Link from 'next/link';

export default function NotFound() {
  return <main className="mc-wrap mc-subpage"><div className="mc-empty">
    <span className="mc-eyebrow">404</span><h1>Không tìm thấy trang</h1>
    <p>Bạn có thể tìm dự án và hướng dẫn trong thư viện.</p>
    <Link href="/" className="mc-button mc-primary">Về trang chủ</Link>
  </div></main>;
}
