'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getAbilities, getCreature } from '@/lib/creatures/queries';
import { creatureThreatLabel, creatureSpecies, creatureElements, creatureSize, creatureRarity, creatureCode, detailPath, formatDate, threatLevel, type Ability, type Creature } from '@/lib/creatures/model';
import { CreatureImage, Feedback, StatusBadge } from './shared';
import { FavoriteButton } from './favorites-provider';

export function CreatureDetails({ creature, abilities, abilityError = '' }: { creature: Creature; abilities: Ability[]; abilityError?: string }) {
  const details = [['Vũ trụ', creature.universe], ['Thiên hà', creature.galaxy], ['Tinh vân', creature.nebula], ['Hệ sao', creature.star_system], ['Hành tinh', creature.planet], ...(creature.world ? [['Thế giới', creature.world]] : []), ['Tuổi', creature.age], ['Kích thước', creatureSize(creature)], ['Nguyên tố', creatureElements(creature)], ['Độ hiếm', creatureRarity(creature)], ['Nguồn sức mạnh', creature.power_source]];
  return <div className="mca-detail-grid">
    <aside className="mca-panel mca-detail-aside"><div className="mca-detail-image"><CreatureImage url={creature.image_url} name={creature.name} /></div><span className="mca-eyebrow">{creatureCode(creature)}</span><StatusBadge status={creature.status} /><div className="mca-threat-display"><span>Cấp đe dọa</span><strong>{threatLevel(creature)}</strong><small>{creature.verified_threat_level ? 'Đã xác minh' : 'Cấp đề xuất'}</small></div><dl className="mca-facts"><div><dt>Cấp đề xuất</dt><dd>{creatureThreatLabel(creature,creature.proposed_threat_level) || '—'}</dd></div><div><dt>Cấp xác minh</dt><dd>{creature.verified_threat_level ? creatureThreatLabel(creature,creature.verified_threat_level) : 'Chưa có'}</dd></div><div><dt>Ngày ghi nhận</dt><dd>{formatDate(creature.created_at)}</dd></div><div><dt>Cập nhật</dt><dd>{formatDate(creature.updated_at)}</dd></div></dl></aside>
    <div className="mca-detail-body"><section className="mca-panel"><h2>Thông tin sinh vật</h2><dl className="mca-facts mca-facts-grid">{details.map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{value || '—'}</dd></div>)}</dl></section>
      {[['Mô tả', creature.description], ['Ngoại hình', creature.appearance], ['Điểm yếu', creature.weaknesses], ['Giới hạn', creature.limitations], ['Điều kiện kỹ năng mạnh nhất', creature.strongest_ability_condition]].map(([name, value]) => <section key={name} className="mca-panel"><h2>{name}</h2><p className="mca-prose">{value || 'Chưa có dữ liệu.'}</p></section>)}
      <section className="mca-panel"><h2>Kỹ năng ({abilities.length})</h2>{abilityError ? <p role="alert" className="mca-error">{abilityError}</p> : abilities.length ? <div id="detailAbilityList">{abilities.map((ability, index) => <div className="mca-ability" key={ability.id}><span>{String(index + 1).padStart(2, '0')}</span><div><h3>{ability.ability_name}</h3><p className="mca-prose">{ability.ability_description || 'Chưa có mô tả.'}</p></div></div>)}</div> : <p>Chưa có dữ liệu kỹ năng.</p>}</section>
    </div>
  </div>;
}

export function CreatureDetail({ id }: { id?: string }) {
  const [state, setState] = useState({ creature: null as Creature | null, abilities: [] as Ability[], loading: Boolean(id), error: id ? '' : 'URL không chứa ID hồ sơ.', abilityError: '' });
  const [retry, setRetry] = useState(0);
  const [shareMessage, setShareMessage] = useState('');
  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    setState({ creature: null, abilities: [], loading: true, error: '', abilityError: '' });
    Promise.resolve().then(async () => {
      const client = createClient();
      const creature = await getCreature(client, id, controller.signal);
      let abilities: Ability[] = [], abilityError = '';
      try { abilities = await getAbilities(client, creature.id, controller.signal); } catch { abilityError = 'Không tải được kỹ năng. Hãy thử tải lại hồ sơ.'; }
      if (!controller.signal.aborted) setState({ creature, abilities, loading: false, error: '', abilityError });
    }).catch(error => { if (!controller.signal.aborted) setState(old => ({ ...old, loading: false, error: error.message })); });
    return () => controller.abort();
  }, [id, retry]);
  async function share() {
    try { await navigator.clipboard.writeText(new URL(detailPath(state.creature!.id), window.location.origin).href); setShareMessage('Đã sao chép liên kết hồ sơ.'); } catch { setShareMessage('Không thể sao chép liên kết. Bạn có thể sao chép địa chỉ trên trình duyệt.'); }
  }
  return <main className="mca-main"><Link className="mca-back" href="/kho-du-lieu">← Kho dữ liệu</Link>
    <Feedback loading={state.loading} error="" onRetry={() => setRetry(value => value + 1)} />
    {state.error && <section id="creatureError" className="mca-panel mca-error" role="alert"><h1>Không thể mở hồ sơ</h1><p id="creatureErrorMessage">{state.error}</p>{id && <button onClick={() => setRetry(value => value + 1)}>Thử lại</button>}</section>}
    {state.creature && !state.loading && !state.error && <div id="creatureDetailContent"><header className="mca-page-heading"><div><span className="mca-eyebrow">{creatureCode(state.creature)}</span><h1 id="detailCreatureName">{state.creature.name}</h1><p>{creatureSpecies(state.creature)}</p></div><div className="mca-actions"><FavoriteButton id={state.creature.id} name={state.creature.name} /><button onClick={share}>Sao chép liên kết</button></div></header><CreatureDetails creature={state.creature} abilities={state.abilities} abilityError={state.abilityError} />{state.abilityError && <button onClick={() => setRetry(value => value + 1)}>Tải lại hồ sơ</button>}</div>}
    {shareMessage && <p role="status" className="mca-feedback">{shareMessage}</p>}
  </main>;
}
