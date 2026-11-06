'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { PlanEntry, Target } from '@/lib/minecraft/catalog';
import { Icon } from './icons';
import { addProject, usePlan } from './pack-store';

export function AddToPack({ entry, target }: { entry: PlanEntry; target: Target }) {
  const { entries } = usePlan();
  const current = entries.find(other => other.id === entry.id);
  const saved = current?.release.id === entry.release.id;
  const [message, setMessage] = useState('');
  return <div className="mc-add">
    <button type="button" className="mc-button mc-primary" disabled={saved} onClick={() => setMessage(addProject(entry, target))}>
      <Icon name={saved ? 'check' : 'modpack'} size={17} /> {saved ? 'Đã có trong gói' : current ? 'Đổi bản trong gói' : 'Thêm vào gói'}
    </button>
    {saved && <Link href="/goi-mod" className="mc-text-link">Xem gói của tôi →</Link>}
    {message && <span role="alert">{message}</span>}
  </div>;
}
