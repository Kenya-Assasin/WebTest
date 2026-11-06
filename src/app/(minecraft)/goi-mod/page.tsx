import { PackPlanner } from '@/components/minecraft/pack-planner';

export const metadata = { title: 'Gói của tôi' };

export default function PackPage() {
  return <main className="mc-wrap mc-subpage">
    <div className="mc-page-head"><span className="mc-eyebrow">CHUẨN BỊ GÓI MOD</span><h1>Gói của tôi</h1>
      <p>Xem những bản đã chọn, biết cần tải thêm gì và phát hiện các xung đột đã được khai báo.</p></div>
    <PackPlanner />
  </main>;
}
