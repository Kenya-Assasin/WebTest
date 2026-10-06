'use client';

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return <main className="migration-message migration-error-boundary"><h1>Không thể tải trang</h1>
    <p>Hãy kiểm tra kết nối và thử lại.</p><button onClick={reset}>Thử lại</button></main>;
}

