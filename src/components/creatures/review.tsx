'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getCreature, getAbilities } from '@/lib/creatures/queries';
import { reviewCreature } from '@/lib/creatures/mutations';
import { creatureCode, threatLevels, type Ability, type Creature } from '@/lib/creatures/model';
import { CreatureDetails } from './detail';
import { Feedback, StatusBadge } from './shared';
import { traitsEnabled } from '@/lib/supabase/features';
import { modernThreats, threatName } from '@/lib/creatures/traits';
import { ThreatFields } from './trait-fields';

export function CreatureReview({ id }: { id?: string }) {
  const [state, setState] = useState({ creature: null as Creature | null, abilities: [] as Ability[], loading: Boolean(id), error: id ? '' : 'URL không chứa ID hồ sơ.' });
  const [retry, setRetry] = useState(0);
  const [threat, setThreat] = useState('');
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    setState(old => ({ ...old, loading: true, error: '' }));
    Promise.resolve().then(async () => {
      const client = createClient();
      const creature = await getCreature(client, id, controller.signal);
      const abilities = await getAbilities(client, creature.id, controller.signal);
      if (!controller.signal.aborted) { setState({ creature, abilities, loading: false, error: '' }); setThreat(creature.verified_threat_level || ''); }
    }).catch(error => { if (!controller.signal.aborted) setState(old => ({ ...old, loading: false, error: error.message })); });
    return () => controller.abort();
  }, [id, retry]);
  async function review(status: 'verified' | 'investigation' | 'conflicting') {
    if (submitting.current || !state.creature) return;
    setSuccess(false); setMessage('');
    if (status === 'verified' && !(traitsEnabled?[...modernThreats,...(state.creature.traits_version===1?[]:['SS','X'])]:threatLevels as readonly string[]).includes(threat)) { setMessage('Hãy chọn cấp đe dọa chính thức trước khi xác minh.'); return; }
    const confirmation = status === 'verified' ? `Xác minh hồ sơ với cấp đe dọa ${traitsEnabled?threatName(threat):threat}?` : status === 'investigation' ? 'Chuyển hồ sơ sang Cần điều tra thêm?' : 'Đánh dấu hồ sơ là Thông tin mâu thuẫn?';
    if (!window.confirm(confirmation)) return;
    submitting.current = true; setBusy(true);
    try {
      await reviewCreature(createClient(), state.creature.id, status, status === 'verified' ? threat : null);
      setState(old => ({ ...old, creature: old.creature ? { ...old.creature, status, verified_threat_level: status === 'verified' ? threat : null, updated_at: new Date().toISOString() } : null }));
      setSuccess(true); setMessage('Đã cập nhật hồ sơ.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Không thể cập nhật hồ sơ.'); }
    finally { submitting.current = false; setBusy(false); }
  }
  return <main className="mca-main"><Link className="mca-back" href="/admin">← Danh sách kiểm duyệt</Link><Feedback loading={state.loading} error={state.error} onRetry={() => setRetry(value => value + 1)} />
    {state.creature && !state.loading && !state.error && <div id="reviewContent"><header className="mca-page-heading"><div><span className="mca-eyebrow">KIỂM DUYỆT / {creatureCode(state.creature)}</span><h1>{state.creature.name}</h1><StatusBadge status={state.creature.status} /></div></header><section className="mca-panel mca-review-actions"><h2>Quyết định kiểm duyệt</h2>{traitsEnabled?<ThreatFields id="adminThreatSelect" label="Cấp đe dọa chính thức" disabled={busy} value={threat} onChange={setThreat} legacy={state.creature.traits_version!==1}/>:(<label htmlFor="adminThreatSelect">Cấp đe dọa chính thức<select id="adminThreatSelect" disabled={busy} value={threat} onChange={event => setThreat(event.target.value)}><option value="">Chọn cấp đe dọa...</option>{threatLevels.map(value => <option key={value} value={value}>{value}</option>)}</select></label>)}<div className="mca-actions"><button id="verifyCreatureButton" className="mca-button" disabled={busy} onClick={() => review('verified')}>Xác minh hồ sơ</button><button id="markInvestigationButton" disabled={busy} onClick={() => review('investigation')}>Cần điều tra thêm</button><button id="markConflictingButton" disabled={busy} onClick={() => review('conflicting')}>Thông tin mâu thuẫn</button></div>{message && <p id="reviewMessage" className={success ? 'mca-success-text' : 'mca-error'} role={success ? 'status' : 'alert'}>{message}</p>}{success && <Link href="/admin">Trở về danh sách kiểm duyệt →</Link>}</section><CreatureDetails creature={state.creature} abilities={state.abilities} /></div>}
  </main>;
}
