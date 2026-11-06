import Link from 'next/link';

export default function MinecraftNotFound() {
  return <main className="mc-wrap mc-subpage"><div className="mc-empty">
    <span className="mc-eyebrow">404</span><h1>Không tìm thấy dự án</h1>
    <p>Dự án có thể đã đổi địa chỉ hoặc không còn công khai trên Modrinth.</p>
    <Link href="/thu-vien" className="mc-button mc-primary" prefetch={false}>Về thư viện</Link>
  </div></main>;
}
