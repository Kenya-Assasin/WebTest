'use client';
import {useEffect,useRef,useState} from 'react';
import {createClient} from '@/lib/supabase/client';
import {addTerm,listTerms,type Term,type TermKind} from '@/lib/creatures/traits';

export function TermPicker({kind,ids,legacyCode='',onChange,onBusy,locked=false}:{kind:TermKind;ids:string[];legacyCode?:string;onChange:(nodes:Term[])=>void;onBusy:(busy:boolean)=>void;locked?:boolean}){
  const label=kind==='species'?'Loài sinh vật':'Nguyên tố';const multiple=kind==='element';
  const [nodes,setNodes]=useState<Term[]>([]);const [loading,setLoading]=useState(true);const [error,setError]=useState('');const [adding,setAdding]=useState(false);const [name,setName]=useState('');const [busy,setBusy]=useState(false);const [revision,setRevision]=useState(0);
  const sending=useRef(false);const current=useRef({ids,legacyCode,onChange,onBusy,locked});current.current={ids,legacyCode,onChange,onBusy,locked};
  useEffect(()=>{const abort=new AbortController();setLoading(true);setError('');listTerms(createClient(),kind,abort.signal).then(rows=>{
    if(abort.signal.aborted)return;setNodes(rows);setLoading(false);
    const c=current.current;if(c.locked)return;
    if(c.ids.length){const valid=rows.filter(n=>c.ids.includes(n.id)&&n.status!=='rejected');if(valid.length!==c.ids.length)c.onChange(valid);}
    else if(c.legacyCode){const matched=rows.find(n=>n.code===c.legacyCode&&n.status!=='rejected');if(matched)c.onChange([matched]);}
  }).catch(()=>{if(!abort.signal.aborted){setLoading(false);setError('Không tải được danh mục. Hãy thử lại.');}});return()=>abort.abort();},[kind,revision]);
  async function add(){if(sending.current||!name.trim())return;sending.current=true;setBusy(true);onBusy(true);setError('');try{
    const node=await addTerm(createClient(),kind,name);setNodes(old=>[...old.filter(n=>n.id!==node.id),node].sort((a,b)=>a.name.localeCompare(b.name)));
    const selected=multiple?nodes.filter(n=>current.current.ids.includes(n.id)&&n.id!==node.id):[];
    if(selected.length>=20){setError('Đề xuất đã lưu. Bạn cần bỏ một nguyên tố để chọn thêm.');}else current.current.onChange([...selected,node]);setAdding(false);setName('');
  }catch(e){setError(e instanceof Error?e.message:'Không gửi được đề xuất.');}finally{sending.current=false;setBusy(false);current.current.onBusy(false);}}
  return <div className="mca-term-picker"><label htmlFor={multiple?undefined:'creatureSpecies'}>{label}{!multiple&&<span className="mca-required"> *</span>}</label>
    {multiple&&<small>Đã chọn {ids.length}/20{ids.length?`: ${nodes.filter(n=>ids.includes(n.id)).map(n=>n.name).join(' · ')}`:''}</small>}
    {multiple?<fieldset className="mca-term-checks" disabled={loading||busy||locked}><legend className="mca-sr-only">Chọn nhiều nguyên tố</legend>{nodes.map(node=><label key={node.id} className="mca-check"><input type="checkbox" checked={ids.includes(node.id)} disabled={node.status==='rejected'||(!ids.includes(node.id)&&ids.length>=20)} onChange={e=>onChange(nodes.filter(n=>n.status!=='rejected'&&(e.target.checked?n.id===node.id||ids.includes(n.id):n.id!==node.id&&ids.includes(n.id))))}/>{node.name}{node.status==='pending'?' · Chờ duyệt':node.status==='rejected'?' · Đã từ chối':''}</label>)}</fieldset>:
      <select id="creatureSpecies" value={ids[0]||''} disabled={loading||busy||locked} onChange={e=>onChange(nodes.filter(n=>n.id===e.target.value))}><option value="">{loading?'Đang tải...':'Chọn loài sinh vật...'}</option>{nodes.map(node=><option key={node.id} value={node.id} disabled={node.status==='rejected'}>{node.name}{node.status==='pending'?' · Chờ duyệt':node.status==='rejected'?' · Đã từ chối':''}</option>)}</select>}
    {loading&&multiple&&<small>Đang tải nguyên tố...</small>}
    {nodes.some(n=>ids.includes(n.id)&&n.status==='pending')&&<small>Đề xuất đang chờ duyệt. Bạn có thể dùng trong hồ sơ của mình.</small>}
    {nodes.filter(n=>n.status==='rejected').map(n=><small key={n.id}>{n.name}: {n.review_note||'Admin đã từ chối.'}</small>)}
    {error&&<p role="alert" className="mca-error">{error}</p>}{error&&!adding&&<button type="button" disabled={locked||busy} onClick={()=>setRevision(n=>n+1)}>Tải lại {label.toLowerCase()}</button>}
    {!adding?<button type="button" className="mca-text-button" disabled={locked||loading||busy} onClick={()=>{setAdding(true);setError('');}}>+ Thêm {label.toLowerCase()}</button>:<div className="mca-origin-add"><label htmlFor={`new-${kind}`}>Tên {label.toLowerCase()} mới<input id={`new-${kind}`} maxLength={100} value={name} disabled={busy} onChange={e=>setName(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();void add();}}}/></label><div className="mca-actions"><button type="button" disabled={busy||!name.trim()} onClick={()=>void add()}>{busy?'Đang gửi...':'Gửi đề xuất'}</button><button type="button" disabled={busy} onClick={()=>setAdding(false)}>Hủy</button></div></div>}
  </div>;
}
