'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { FavoriteButton } from './favorites-provider';
import { phase3Enabled } from '@/lib/supabase/features';
import { creatureSpecies, creatureCode, detailPath, safeImageUrl, statusNames, threatLevel, label, PAGE_SIZE, type Creature } from '@/lib/creatures/model';

export function CreatureImage({ url, name }: { url?: string | null; name: string }) {
  const safe = safeImageUrl(url);
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [url]);
  return safe && !failed ? <img src={safe} alt={name} loading="lazy" onError={() => setFailed(true)} /> : <div className="mca-image-placeholder" aria-label={`Chưa có ảnh ${name}`}>✦<span>Chưa có ảnh</span></div>;
}

export function StatusBadge({ status }: { status: string }) {
  return <span className={`mca-badge mca-status-${status in statusNames ? status : 'pending'}`}>{label(statusNames, status)}</span>;
}

export function CreatureCard({ creature, review = false }: { creature: Creature; review?: boolean }) {
  return <article className="mca-card archive-creature-card home-creature-card">
    <Link href={detailPath(creature.id, review)} className="mca-card-link">
      <div className="mca-card-image"><CreatureImage url={creature.image_url} name={creature.name} /><div className="mca-card-badges"><StatusBadge status={creature.status} /><span className="mca-badge">Cấp {threatLevel(creature)}</span></div></div>
      <div className="mca-card-content"><span className="mca-eyebrow">{creatureCode(creature)}</span><h3>{creature.name}</h3><p>{creatureSpecies(creature)} · {creature.planet || 'Chưa rõ hành tinh'}</p><span className="mca-card-origin">◇ {creature.universe || 'Chưa rõ vũ trụ'}</span></div>
    </Link>
    {phase3Enabled && !review && <div className="mca-card-favorite"><FavoriteButton id={creature.id} name={creature.name} /></div>}
  </article>;
}

export function Pagination({ page, total, onPage, disabled }: { page: number; total: number; onPage: (page: number) => void; disabled?: boolean }) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  return <nav className="mca-pagination" aria-label="Phân trang"><button type="button" disabled={disabled || page <= 1} onClick={() => onPage(page - 1)}>← Trang trước</button><span>Trang {page} / {pages}</span><button type="button" disabled={disabled || page >= pages} onClick={() => onPage(page + 1)}>Trang sau →</button></nav>;
}

export function Feedback({ loading, error, onRetry }: { loading: boolean; error: string; onRetry: () => void }) {
  if (loading) return <p className="mca-feedback" role="status">Đang tải dữ liệu MCA...</p>;
  if (error) return <div className="mca-feedback mca-error" role="alert"><p>{error}</p><button type="button" onClick={onRetry}>Thử lại</button></div>;
  return null;
}

export function Empty({ message = 'Không tìm thấy hồ sơ phù hợp.' }: { message?: string }) {
  return <p className="mca-feedback">{message}</p>;
}
