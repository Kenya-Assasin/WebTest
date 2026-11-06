'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { PlanEntry, Target } from '@/lib/minecraft/catalog';
import { Icon } from './icons';
import { useLanguage } from './language-provider';
import { addProject, usePlan } from './pack-store';

export function AddToPack({ entry, target }: { entry: PlanEntry; target: Target }) {
  const t = useLanguage();
  const { entries } = usePlan();
  const current = entries.find(other => other.id === entry.id);
  const saved = current?.release.id === entry.release.id;
  const [error, setError] = useState<ReturnType<typeof addProject>>(null);
  return <div className="mc-add">
    <button type="button" className="mc-button mc-primary" disabled={saved} onClick={() => setError(addProject(entry, target))}>
      <Icon name={saved ? 'check' : 'modpack'} size={17} /> {saved ? t('Đã có trong gói', 'Already in pack') : current ? t('Đổi bản trong gói', 'Replace release in pack') : t('Thêm vào gói', 'Add to pack')}
    </button>
    {saved && <Link href="/goi-mod" className="mc-text-link">{t('Xem gói của tôi →', 'View my pack →')}</Link>}
    {error && <span role="alert">{error === 'full'
      ? t('Gói đã có 60 dự án. Hãy bỏ một mục trước khi thêm.', 'Your pack has 60 projects. Remove one before adding another.')
      : t('Không lưu được gói trên trình duyệt này.', 'Could not save the pack in this browser.')}</span>}
  </div>;
}
