'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { originColumns, originLevels, type Origin, type OriginKind } from '@/lib/creatures/origins';
import { Feedback, Pagination } from './shared';

export function OriginAdmin(){
  const [kind,setKind]=useState<OriginKind>('universe');const [status,setStatus]=useState('pending');
  const [page,setPage]=useState(1);const [revision,setRevision]=useState(0);const [loading,setLoading]=useState(true);
  const [nodes,setNodes]=useState<Origin[]>([]);const [parents,setParents]=useState<Record<string,Origin>>({});const [total,setTotal]=useState(0);
  const [error,setError]=useState('');const [feedback,setFeedback]=useState('');const [busy,setBusy]=useState(false);
  const [notes,setNotes]=useState<Record<string,string>>({});const sending=useRef(false);
  useEffect(()=>{
    const abort=new AbortController();setLoading(true);setError('');
    async function load(){
      const client=createClient();
      const {data,count,error:failure}=await client.from('origin_locations').select(originColumns,{count:'exact'}).eq('kind',kind).eq('status',status).order('name').order('id').range((page-1)*12,page*12-1).abortSignal(abort.signal);
      if(failure)throw failure;
      if(!data?.length&&page>1&&!abort.signal.aborted){setPage(page-1);return;}
      const ancestry:Record<string,Origin>={};let ids=[...new Set((data||[]).flatMap(node=>node.parent_id?[node.parent_id]:[]))];
      for(let depth=0;depth<4&&ids.length;depth++){
        const response=await client.from('origin_locations').select(originColumns).in('id',ids).abortSignal(abort.signal);
        if(response.error)throw response.error;
        for(const node of response.data||[])ancestry[node.id]=node;
        ids=[...new Set((response.data||[]).flatMap(node=>node.parent_id&&!ancestry[node.parent_id]?[node.parent_id]:[]))];
      }
      if(!abort.signal.aborted){setNodes(data||[]);setParents(ancestry);setTotal(count||0);setLoading(false);}
    }
    load().catch(()=>{if(!abort.signal.aborted){setLoading(false);setError('Không tải được danh sách địa danh. Hãy thử lại.');}});
    return()=>abort.abort();
  },[kind,status,page,revision]);
  function path(node:Origin){const names:string[]=[];let id=node.parent_id;for(let depth=0;depth<4&&id;depth++){const parent=parents[id];if(!parent)break;names.unshift(parent.name);id=parent.parent_id;}return names.join(' → ')||'Cấp gốc';}
  async function review(node:Origin,decision:'approved'|'rejected'){
    if(sending.current||!window.confirm(`${decision==='approved'?'Duyệt':'Từ chối'} địa danh “${node.name}”?`))return;
    sending.current=true;setBusy(true);setFeedback('');
    try{
      const {error}=await createClient().rpc('mca_review_origin',{p_id:node.id,p_status:decision,p_note:notes[node.id]||null});
      if(error)throw new Error(error.message.includes('ORIGIN_APPROVE_PARENT_FIRST')?'Hãy duyệt địa danh cấp cha trước.':error.message.includes('ADMIN_REQUIRED')?'Bạn không có quyền duyệt địa danh.':'Chưa xác nhận được kết quả duyệt. Hãy tải lại danh sách.');
      setFeedback(`${decision==='approved'?'Đã duyệt':'Đã từ chối'} ${node.name}.`);setRevision(n=>n+1);
    }catch(e){setFeedback(e instanceof Error?e.message:'Không duyệt được địa danh.');}
    finally{sending.current=false;setBusy(false);}
  }
  return <main className="mca-main"><header className="mca-page-heading"><div><h1>DUYỆT ĐỊA DANH</h1><p>Duyệt từ Vũ trụ xuống Hành tinh. Địa danh được duyệt sẽ xuất hiện trong danh sách chung.</p></div><Link href="/admin">Quản trị hồ sơ</Link></header>
    <section className="mca-panel"><div className="mca-toolbar"><label>Cấp địa danh<select id="originAdminKind" value={kind} disabled={busy} onChange={e=>{setKind(e.target.value as OriginKind);setPage(1);setFeedback('');}}>{originLevels.map(level=><option key={level.kind} value={level.kind}>{level.label}</option>)}</select></label><label>Trạng thái<select id="originAdminStatus" value={status} disabled={busy} onChange={e=>{setStatus(e.target.value);setPage(1);setFeedback('');}}><option value="pending">Chờ duyệt</option><option value="approved">Đã duyệt</option><option value="rejected">Đã từ chối</option></select></label><button type="button" disabled={busy} onClick={()=>setRevision(n=>n+1)}>Làm mới danh sách</button></div>
      <Feedback loading={loading} error={error} onRetry={()=>setRevision(n=>n+1)}/>{feedback&&<p role="status">{feedback}</p>}
      {!loading&&!error&&<><p>{total} địa danh</p>{!nodes.length&&<p>Không có địa danh trong danh sách này.</p>}{nodes.map(node=><article className="mca-origin-review" key={node.id}><h2>{node.name}</h2><p>{path(node)}</p>{node.review_note&&<p>Ghi chú: {node.review_note}</p>}{node.status==='pending'&&<><label htmlFor={`note-${node.id}`}>Ghi chú cho người đề xuất<textarea id={`note-${node.id}`} maxLength={300} rows={2} disabled={busy} value={notes[node.id]||''} onChange={e=>setNotes(old=>({...old,[node.id]:e.target.value}))}/></label><div className="mca-actions"><button disabled={busy} onClick={()=>void review(node,'approved')}>Duyệt {node.name}</button><button disabled={busy} onClick={()=>void review(node,'rejected')}>Từ chối {node.name}</button></div></>}</article>)}<Pagination page={page} total={total} onPage={setPage} disabled={busy}/></>}
    </section></main>;
}
