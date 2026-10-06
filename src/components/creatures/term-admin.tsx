'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { termColumns, type Term, type TermKind } from '@/lib/creatures/traits';
const levels=[{kind:'species',label:'Loài sinh vật'},{kind:'element',label:'Nguyên tố'}];
import { Feedback, Pagination } from './shared';

export function TermAdmin(){
  const [kind,setKind]=useState<TermKind>('species');const [status,setStatus]=useState('pending');
  const [page,setPage]=useState(1);const [revision,setRevision]=useState(0);const [loading,setLoading]=useState(true);
  const [nodes,setNodes]=useState<Term[]>([]);const [total,setTotal]=useState(0);
  const [error,setError]=useState('');const [feedback,setFeedback]=useState('');const [busy,setBusy]=useState(false);
  const [notes,setNotes]=useState<Record<string,string>>({});const sending=useRef(false);
  useEffect(()=>{
    const abort=new AbortController();setLoading(true);setError('');
    async function load(){
      const client=createClient();
      const {data,count,error:failure}=await client.from('creature_terms').select(termColumns,{count:'exact'}).eq('kind',kind).eq('status',status).order('name').order('id').range((page-1)*12,page*12-1).abortSignal(abort.signal);
      if(failure)throw failure;
      if(!data?.length&&page>1&&!abort.signal.aborted){setPage(page-1);return;}
      if(!abort.signal.aborted){setNodes(data||[]);setTotal(count||0);setLoading(false);}
    }
    load().catch(()=>{if(!abort.signal.aborted){setLoading(false);setError('Không tải được danh sách loài/nguyên tố. Hãy thử lại.');}});
    return()=>abort.abort();
  },[kind,status,page,revision]);
  async function review(node:Term,decision:'approved'|'rejected'){
    if(sending.current||!window.confirm(`${decision==='approved'?'Duyệt':'Từ chối'} loài/nguyên tố “${node.name}”?`))return;
    sending.current=true;setBusy(true);setFeedback('');
    try{
      const {error}=await createClient().rpc('mca_review_term',{p_id:node.id,p_status:decision,p_note:notes[node.id]||null});
      if(error)throw new Error(error.message.includes('ADMIN_REQUIRED')?'Bạn không có quyền duyệt loài/nguyên tố.':'Chưa xác nhận được kết quả duyệt. Hãy tải lại danh sách.');
      setFeedback(`${decision==='approved'?'Đã duyệt':'Đã từ chối'} ${node.name}.`);setRevision(n=>n+1);
    }catch(e){setFeedback(e instanceof Error?e.message:'Không duyệt được loài/nguyên tố.');}
    finally{sending.current=false;setBusy(false);}
  }
  return <main className="mca-main"><header className="mca-page-heading"><div><h1>DUYỆT LOÀI VÀ NGUYÊN TỐ</h1><p>Đề xuất được duyệt sẽ xuất hiện trong danh sách chung.</p></div><Link href="/admin">Quản trị hồ sơ</Link></header>
    <section className="mca-panel"><div className="mca-toolbar"><label>Danh mục<select id="termAdminKind" value={kind} disabled={busy} onChange={e=>{setKind(e.target.value as TermKind);setPage(1);setFeedback('');}}>{levels.map(level=><option key={level.kind} value={level.kind}>{level.label}</option>)}</select></label><label>Trạng thái<select id="termAdminStatus" value={status} disabled={busy} onChange={e=>{setStatus(e.target.value);setPage(1);setFeedback('');}}><option value="pending">Chờ duyệt</option><option value="approved">Đã duyệt</option><option value="rejected">Đã từ chối</option></select></label><button type="button" disabled={busy} onClick={()=>setRevision(n=>n+1)}>Làm mới danh sách</button></div>
      <Feedback loading={loading} error={error} onRetry={()=>setRevision(n=>n+1)}/>{feedback&&<p role="status">{feedback}</p>}
      {!loading&&!error&&<><p>{total} mục</p>{!nodes.length&&<p>Không có đề xuất trong danh sách này.</p>}{nodes.map(node=><article className="mca-origin-review" key={node.id}><h2>{node.name}</h2>{node.review_note&&<p>Ghi chú: {node.review_note}</p>}{node.status==='pending'&&<><label htmlFor={`note-${node.id}`}>Ghi chú cho người đề xuất<textarea id={`note-${node.id}`} maxLength={300} rows={2} disabled={busy} value={notes[node.id]||''} onChange={e=>setNotes(old=>({...old,[node.id]:e.target.value}))}/></label><div className="mca-actions"><button disabled={busy} onClick={()=>void review(node,'approved')}>Duyệt {node.name}</button><button disabled={busy} onClick={()=>void review(node,'rejected')}>Từ chối {node.name}</button></div></>}</article>)}<Pagination page={page} total={total} onPage={setPage} disabled={busy}/></>}
    </section></main>;
}
