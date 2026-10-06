'use client';
import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { createClient } from '@/lib/supabase/client';
import { creatureCode, detailPath, elementNames, rarityNames, speciesNames, threatLevels, type Creature, type RecordId } from '@/lib/creatures/model';
import { emptyDraft, fieldLimits, restoreDraft, validateDraft, validateImage, type CreatureDraft, type DraftTextField } from '@/lib/creatures/draft';
import { SubmissionError, submitCreature } from '@/lib/creatures/mutations';
import { phase3Enabled, originsEnabled } from '@/lib/supabase/features';
import { OriginPicker } from './origin-picker';
import type { Origin } from '@/lib/creatures/origins';
import { prepareAttempt, restoreAttempt, submissionKey, submitAtomic, type SubmissionAttempt } from '@/lib/creatures/atomic';

type Field = DraftTextField;
const fields: { key: Field; id: string; label: string; required?: boolean; options?: Record<string, string>; text?: boolean }[] = [
  { key: 'name', id: 'creatureName', label: 'Tên sinh vật', required: true },
  { key: 'species', id: 'creatureSpecies', label: 'Loài sinh vật', required: true, options: speciesNames },
  { key: 'age', id: 'creatureAge', label: 'Tuổi' }, { key: 'size', id: 'creatureSize', label: 'Kích thước' },
  { key: 'element', id: 'creatureElement', label: 'Nguyên tố', options: elementNames }, { key: 'rarity', id: 'creatureRarity', label: 'Độ hiếm', options: rarityNames },
  { key: 'universe', id: 'creatureUniverse', label: 'Vũ trụ', required: true }, { key: 'galaxy', id: 'creatureGalaxy', label: 'Thiên hà' },
  { key: 'planet', id: 'creaturePlanet', label: 'Hành tinh', required: true }, { key: 'world', id: 'creatureWorld', label: 'Thế giới' },
  { key: 'threatLevel', id: 'creatureThreat', label: 'Cấp đe dọa đề xuất', required: true, options: Object.fromEntries(threatLevels.map(value => [value, value])) },
  { key: 'powerSource', id: 'creaturePowerSource', label: 'Nguồn sức mạnh' },
  { key: 'description', id: 'creatureDescription', label: 'Mô tả sinh vật', required: true, text: true },
  { key: 'appearance', id: 'creatureAppearance', label: 'Ngoại hình', text: true },
  { key: 'weaknesses', id: 'creatureWeaknesses', label: 'Điểm yếu', required: true, text: true },
  { key: 'limitations', id: 'creatureLimitations', label: 'Giới hạn sức mạnh', text: true },
  { key: 'strongestAbilityCondition', id: 'strongestAbilityCondition', label: 'Điều kiện kỹ năng mạnh nhất', text: true },
];

export function CreateCreatureForm({ owner }: { owner: string }) {
  const [draft, setDraft] = useState<CreatureDraft>(emptyDraft);
  const [ready, setReady] = useState(false);
  const [legacyDraft, setLegacyDraft] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [busy, setBusy] = useState(false);
  const [originBusy,setOriginBusy]=useState(false);
  const [message, setMessage] = useState('');
  const [draftMessage, setDraftMessage] = useState('');
  const [blocked, setBlocked] = useState(false);
  const [unresolvedId, setUnresolvedId] = useState<RecordId>();
  const [attempt, setAttempt] = useState<SubmissionAttempt | null>(null);
  const [result, setResult] = useState<{ creature: Creature; warnings: string[] } | null>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const submitting = useRef(false);
  const complete = useRef(false);
  const latest = useRef(draft);
  latest.current = draft;
  const key = `mcaCreatureDraft:${owner}`;

  useEffect(() => {
    let pendingFound = false;
    try {
      if (phase3Enabled) {
        const pending = localStorage.getItem(submissionKey(owner));
        if (pending) {
          pendingFound = true;
          const restored = restoreAttempt(JSON.parse(pending));
          setAttempt(restored); setDraft(restored.draft); setBlocked(true);
          setMessage('Có yêu cầu chưa xác nhận kết quả. Hãy kiểm tra lại yêu cầu này để tránh tạo hồ sơ trùng.');
          setReady(true); return;
        }
      }
      const saved = localStorage.getItem(key);
      if (saved) { setDraft(restoreDraft(JSON.parse(saved))); setDraftMessage('Đã khôi phục bản nháp của bạn.'); }
      else setLegacyDraft(Boolean(localStorage.getItem('mcaCreatureDraft')));
    } catch {
      if (pendingFound) {
        setBlocked(true); setMessage('Không đọc được yêu cầu đang chờ. Hãy kiểm tra hồ sơ của bạn trước khi gửi lại.');
      } else setDraftMessage('Không đọc được bản nháp. Bạn vẫn có thể nhập hồ sơ mới.');
    }
    setReady(true);
  }, [key]);
  useEffect(() => {
    if (!image) { setPreview(''); return; }
    const url = URL.createObjectURL(image); setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);
  useEffect(() => {
    if (!ready || complete.current) return;
    const timer = setTimeout(() => {
      if (complete.current) return;
      try { localStorage.setItem(key, JSON.stringify({ ...draft, savedAt: new Date().toISOString() })); setDraftMessage('Bản nháp đã tự động lưu.'); }
      catch { setDraftMessage('Không thể tự động lưu bản nháp trên trình duyệt này.'); }
    }, 800);
    return () => clearTimeout(timer);
  }, [draft, ready, key]);
  useEffect(() => {
    if (!ready) return;
    return () => { if (!complete.current) { try { localStorage.setItem(key, JSON.stringify(latest.current)); } catch { /* Already reported by autosave. */ } } };
  }, [ready, key]);

  function saveDraft() {
    try { localStorage.setItem(key, JSON.stringify({ ...draft, savedAt: new Date().toISOString() })); setDraftMessage('Đã lưu bản nháp.'); }
    catch { setDraftMessage('Không thể lưu bản nháp trên trình duyệt này.'); }
  }
  function importOldDraft() {
    try {
      const saved = localStorage.getItem('mcaCreatureDraft');
      if (saved) setDraft(restoreDraft(JSON.parse(saved)));
      setLegacyDraft(false); setDraftMessage('Đã khôi phục bản nháp cũ. Hãy chọn lại ảnh nếu cần.');
    } catch { setDraftMessage('Bản nháp cũ không hợp lệ.'); }
  }
  function reset() {
    if (!window.confirm('Xóa toàn bộ nội dung và bản nháp đang nhập?')) return;
    setDraft(emptyDraft()); setImage(null); setMessage('');
    if (imageInput.current) imageInput.current.value = '';
    try { localStorage.removeItem(key); } catch { /* Autosave reports storage errors. */ }
  }
  function update(field: Field, value: string) { setDraft(old => ({ ...old, [field]: value })); }
  function selectOrigin(index:number,node:Origin|null){
    setDraft(old=>{
      const ids=[...(old.originIds||[])];ids[index]=node?.id||'';ids.length=index+1;
      return {...old,originIds:ids,originPlanetId:ids[4]||undefined,
        ...(index===0?{universe:node?.name||'',galaxy:'',planet:''}:index===1?{galaxy:node?.name||'',planet:''}:index===4?{planet:node?.name||''}:{planet:''})};
    });
  }
  function updateAbility(index: number, field: 'name' | 'description', value: string) { setDraft(old => ({ ...old, abilities: old.abilities.map((ability, i) => i === index ? { ...ability, [field]: value } : ability) })); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || originBusy || (blocked && !attempt) || complete.current) return;
    if(originsEnabled&&!attempt&&!draft.originPlanetId){setMessage('Hãy chọn đủ nguồn gốc từ vũ trụ đến hành tinh.');return;}
    const validation = validateDraft(attempt?.draft || draft);
    if (validation) { setMessage(validation); return; }
    submitting.current = true; setBusy(true); setMessage('');
    try {
      const client = createClient();
      let saved;
      if (phase3Enabled) {
        const request = attempt || await prepareAttempt(client, draft, image, owner);
        setAttempt(request);
        saved = await submitAtomic(client, request, owner);
      } else saved = await submitCreature(client, draft, image, owner);
      complete.current = true; setResult(saved);
      try { localStorage.removeItem(key); } catch { setDraftMessage('Hồ sơ đã gửi. Bản nháp trên trình duyệt chưa được xóa.'); }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể gửi hồ sơ.');
      if (error instanceof SubmissionError) {
        setUnresolvedId(error.unresolvedId); setBlocked(Boolean(error.unresolvedId) || error.uncertain);
        if (!error.uncertain && phase3Enabled) setAttempt(null);
      }
    } finally { setBusy(false); submitting.current = false; }
  }
  function renderFields(keys: Field[]) {
    return <div className="mca-form-grid">{fields.filter(field => keys.includes(field.key)).map(field => <label className={field.text ? 'mca-full-width' : ''} key={field.key} htmlFor={field.id}>{field.label}{field.required && <span className="mca-required"> *</span>}
      {field.options ? <select id={field.id} name={field.key} value={draft[field.key]} required={field.required} onChange={event => update(field.key, event.target.value)}><option value="">Chọn {field.label.toLowerCase()}...</option>{Object.entries(field.options).map(([value, name]) => <option key={value} value={value}>{name}</option>)}</select>
        : field.text ? <textarea id={field.id} name={field.key} value={draft[field.key]} maxLength={fieldLimits[field.key]} required={field.required} rows={4} onChange={event => update(field.key, event.target.value)} />
          : <input id={field.id} name={field.key} value={draft[field.key]} maxLength={fieldLimits[field.key]} required={field.required} onChange={event => update(field.key, event.target.value)} />}
      {field.key === 'description' && <small>Tối thiểu 30 ký tự · {draft.description.length}/3000</small>}
    </label>)}</div>;
  }

  if (result) return <main className="mca-main"><section className="mca-panel mca-success" role="status"><span className="mca-eyebrow">HỒ SƠ ĐÃ GỬI</span><h1>{result.creature.name}</h1><p>{creatureCode(result.creature)} · Chờ xác minh</p><p>Hồ sơ và kỹ năng đã được lưu. Quản trị viên sẽ xem xét cấp đe dọa đề xuất của bạn.</p>{result.warnings.map(warning => <p key={warning}>{warning}</p>)}<div className="mca-actions"><Link className="mca-button" href={detailPath(result.creature.id)}>Xem hồ sơ</Link><Link href="/dieu-tra-vien" className="mca-button secondary">Hồ sơ của tôi</Link></div></section></main>;

  return <main className="mca-main"><header className="mca-page-heading"><div><span className="mca-eyebrow">MCA / NEW RECORD</span><h1>TẠO HỒ SƠ SINH VẬT</h1><p>Ghi nhận phát hiện của bạn. Hồ sơ mới được gửi ở trạng thái chờ xác minh.</p></div></header>
    {legacyDraft && <div className="mca-panel"><p>Có bản nháp từ phiên bản cũ trên trình duyệt này.</p><button type="button" onClick={importOldDraft}>Khôi phục bản nháp cũ</button></div>}
    <form id="creatureForm" className="mca-form" onSubmit={submit} noValidate>
      <fieldset disabled={busy || originBusy || !ready || blocked}>
        <section className="mca-panel"><h2>01 · Thông tin cơ bản</h2>{renderFields(['name', 'species', 'age', 'size', 'element', 'rarity'])}</section>
        <section className="mca-panel"><h2>02 · Nguồn gốc</h2>{originsEnabled&&(!attempt||attempt.draft.originPlanetId)?<OriginPicker locked={Boolean(attempt)} ids={draft.originIds||[]} onChange={selectOrigin} onBusy={setOriginBusy}/>:renderFields(['universe', 'galaxy', 'planet', 'world'])}</section>
        <section className="mca-panel"><h2>03 · Sức mạnh</h2>{renderFields(['threatLevel', 'powerSource'])}<p className="mca-muted">Cấp đe dọa chính thức do quản trị viên xác minh.</p></section>
        <section className="mca-panel"><h2>04 · Ảnh sinh vật</h2><label htmlFor="creatureImage">Chọn ảnh JPG, PNG hoặc WEBP · tối đa 5MB</label><input ref={imageInput} id="creatureImage" type="file" accept="image/jpeg,image/png,image/webp" onChange={event => { const file = event.target.files?.[0]; if (!file) { setImage(null); return; } const error = validateImage(file); if (error) { setMessage(error); event.target.value = ''; setImage(null); } else { setImage(file); setMessage(''); } }} />{preview && <div className="mca-upload-preview"><img id="creatureImagePreview" src={preview} alt="Ảnh sinh vật đang chọn" /><button type="button" onClick={() => { setImage(null); if (imageInput.current) imageInput.current.value = ''; }}>Bỏ ảnh</button></div>}<p className="mca-muted">Ảnh không được lưu trong bản nháp. Hãy chọn lại ảnh sau khi khôi phục.</p></section>
        <section className="mca-panel"><h2>05 · Mô tả và ngoại hình</h2>{renderFields(['description', 'appearance'])}</section>
        <section className="mca-panel"><div className="mca-panel-heading"><h2>06 · Kỹ năng</h2><span id="abilityCounter">{draft.abilities.length}/5</span></div><div id="abilityList">{draft.abilities.map((ability, index) => <div className="mca-ability ability-item" key={index}><span>{index + 1}</span><div className="mca-ability-fields"><label htmlFor={`abilityName${index}`}>Tên kỹ năng {index + 1}<input id={`abilityName${index}`} className="ability-name" value={ability.name} required maxLength={100} onChange={event => updateAbility(index, 'name', event.target.value)} /></label><label htmlFor={`abilityDescription${index}`}>Mô tả kỹ năng {index + 1}<textarea id={`abilityDescription${index}`} className="ability-description" value={ability.description} rows={3} maxLength={1000} onChange={event => updateAbility(index, 'description', event.target.value)} /></label></div><button type="button" className="remove-ability" aria-label={`Xóa kỹ năng ${index + 1}`} disabled={draft.abilities.length === 1} onClick={() => setDraft(old => ({ ...old, abilities: old.abilities.filter((_, i) => index !== i) }))}>×</button></div>)}</div><button type="button" id="addAbilityButton" disabled={draft.abilities.length >= 5} onClick={() => setDraft(old => ({ ...old, abilities: [...old.abilities, { name: '', description: '' }] }))}>+ Thêm kỹ năng</button></section>
        <section className="mca-panel"><h2>07 · Điểm yếu và giới hạn</h2>{renderFields(['weaknesses', 'limitations', 'strongestAbilityCondition'])}</section>
      </fieldset>
      {message && <div id="createMessage" className="mca-panel mca-error" role="alert"><p>{message}</p>{unresolvedId && <Link href={detailPath(unresolvedId)}>Mở hồ sơ đã lưu một phần</Link>}{blocked && <p><Link href="/dieu-tra-vien">Kiểm tra hồ sơ của tôi</Link></p>}</div>}
      <p className="mca-muted" role="status" id="draftStatus">{draftMessage}</p>
      <div className="mca-actions mca-form-actions"><button type="button" id="resetCreatureButton" disabled={busy || originBusy || blocked} onClick={reset}>Nhập lại</button><button type="button" id="saveDraftButton" disabled={!ready || busy || originBusy} onClick={saveDraft}>Lưu bản nháp</button><button type="submit" className="mca-button create-submit-button" disabled={!ready || busy || originBusy || (blocked && !attempt)}>{busy ? 'ĐANG GỬI HỒ SƠ...' : attempt && blocked ? 'KIỂM TRA LẠI YÊU CẦU' : 'GỬI HỒ SƠ ĐIỀU TRA'}</button></div>
    </form>
  </main>;
}
