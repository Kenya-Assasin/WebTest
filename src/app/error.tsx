'use client';

export default function ErrorPage({ retry }: { error: Error; retry: () => void }) {
  return <main className="mc-wrap mc-subpage"><div className="mc-empty" role="alert">
    <h1>Không thể tải trang</h1>
    <p>Kiểm tra kết nối rồi thử lại.</p>
    <button type="button" className="mc-button mc-primary" onClick={retry}>Thử lại</button>
  </div></main>;
}
