'use client';
import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { addOrigin, listOrigins, originLevels, type Origin, type OriginKind } from '@/lib/creatures/origins';

function OriginLevel({kind,label,parent,value,onSelect,onBusy,locked}: {
  kind:OriginKind;label:string;parent:string|null;value:string;onSelect:(node:Origin|null)=>void;onBusy:(busy:boolean)=>void;locked:boolean;
}) {
  const [nodes,setNodes]=useState<Origin[]>([]);
  const [loading,setLoading]=useState(false);const [error,setError]=useState('');
  const [adding,setAdding]=useState(false);const [name,setName]=useState('');const [busy,setBusy]=useState(false);
  const [revision,setRevision]=useState(0);const epoch=useRef(0);const sending=useRef(false);
  const current=useRef({value,onSelect,onBusy,locked});current.current={value,onSelect,onBusy,locked};
  const enabled=kind==='universe'||Boolean(parent);
  useEffect(()=>{
    const turn=++epoch.current;const abort=new AbortController();setError('');setNodes([]);setAdding(false);setName('');
    if(!enabled){setLoading(false);return()=>abort.abort();}
    setLoading(true);
    listOrigins(createClient(),kind,parent,abort.signal).then(rows=>{
      if(abort.signal.aborted||turn!==epoch.current)return;
      setNodes(rows);setLoading(false);
      if(!current.current.locked&&current.current.value&&!rows.some(node=>node.id===current.current.value&&node.status!=='rejected'))current.current.onSelect(null);
    }).catch(()=>{if(!abort.signal.aborted&&turn===epoch.current){setLoading(false);setError('Không tải được danh sách địa danh. Hãy thử lại.');}});
    return()=>{abort.abort();epoch.current++;};
  },[kind,parent,enabled,revision]);
  async function add(){
    if(sending.current||!name.trim())return;sending.current=true;setBusy(true);onBusy(true);setError('');
    const turn=epoch.current;
    try{
      const node=await addOrigin(createClient(),kind,name,parent);
      if(turn!==epoch.current)return;
      setNodes(old=>[...old.filter(row=>row.id!==node.id),node].sort((a,b)=>a.name.localeCompare(b.name)));
      current.current.onSelect(node);setAdding(false);setName('');
    }catch(e){if(turn===epoch.current)setError(e instanceof Error?e.message:'Không thêm được địa danh.');}
    finally{sending.current=false;setBusy(false);current.current.onBusy(false);}
  }
  const selected=nodes.find(node=>node.id===value);
  return <div className="mca-origin-level">
    <label htmlFor={`origin-${kind}`}>{label} <span className="mca-required">*</span>
      <select id={`origin-${kind}`} value={value} disabled={locked||!enabled||loading||busy} onChange={e=>onSelect(nodes.find(node=>node.id===e.target.value)||null)}>
        <option value="">{!enabled?'Chọn cấp trên trước':loading?'Đang tải...':`Chọn ${label.toLowerCase()}...`}</option>
        {nodes.map(node=><option key={node.id} value={node.id} disabled={node.status==='rejected'}>{node.name}{node.status==='pending'?' · Chờ duyệt':node.status==='rejected'?' · Đã từ chối':''}</option>)}
      </select>
    </label>
    {selected?.status==='pending'&&<small>Đang chờ admin duyệt. Bạn có thể dùng trong hồ sơ của mình.</small>}
    {nodes.filter(node=>node.status==='rejected').map(node=><small key={node.id}>{node.name}: {node.review_note||'Admin đã từ chối địa danh này. Hãy chọn hoặc đề xuất địa danh khác.'}</small>)}
    {enabled&&!loading&&!error&&!nodes.length&&<small>Chưa có địa danh ở cấp này. Bạn có thể đề xuất địa danh mới.</small>}
    {error&&<div className="mca-error" role="alert"><p>{error}</p>{!adding&&<button type="button" onClick={()=>setRevision(n=>n+1)}>Tải lại {label.toLowerCase()}</button>}</div>}
    {!adding?<button type="button" className="mca-text-button" disabled={locked||!enabled||loading||busy} onClick={()=>{setAdding(true);setError('');}}>+ Thêm {label.toLowerCase()}</button>:
      <div className="mca-origin-add"><label htmlFor={`new-origin-${kind}`}>Tên {label.toLowerCase()} mới<input id={`new-origin-${kind}`} value={name} maxLength={100} disabled={busy} onChange={e=>setName(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();void add();}}}/></label>
        <div className="mca-actions"><button type="button" disabled={busy||!name.trim()} onClick={()=>void add()}>{busy?'Đang gửi...':'Gửi đề xuất'}</button><button type="button" disabled={busy} onClick={()=>{setAdding(false);setError('');}}>Hủy</button></div>
      </div>}
  </div>;
}

export function OriginPicker({ids,onChange,onBusy,locked=false}:{ids:string[];onChange:(index:number,node:Origin|null)=>void;onBusy:(busy:boolean)=>void;locked?:boolean}){
  return <div><p className="mca-muted">Chọn lần lượt từ vũ trụ đến hành tinh. Địa danh bạn đề xuất chỉ xuất hiện với mọi người sau khi admin duyệt.</p>
    <div className="mca-form-grid">{originLevels.map((level,index)=><OriginLevel key={level.kind} {...level} locked={locked} parent={index===0?null:ids[index-1]||null} value={ids[index]||''} onSelect={node=>onChange(index,node)} onBusy={onBusy}/>)}</div>
  </div>;
}
