'use client';

import { useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { safeReturnPath } from '@/lib/auth/redirect';

function translateError(message: string) {
  const text = message.toLowerCase();
  if (text.includes('invalid login credentials')) return 'Email hoặc mật khẩu không chính xác.';
  if (text.includes('user already registered')) return 'Email này đã được đăng ký.';
  if (text.includes('email not confirmed')) return 'Bạn chưa xác nhận email.';
  if (text.includes('rate limit') || text.includes('too many')) return 'Bạn đã thử quá nhiều lần. Hãy chờ một lúc rồi thử lại.';
  return 'Không thể xác thực. Hãy kiểm tra thông tin và thử lại.';
}

export function AuthForm({ register = false }: { register?: boolean }) {
  const search = useSearchParams();
  const router = useRouter();
  const returnPath = safeReturnPath(search.get('next'));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(search.get('error') === 'confirmation' ? 'Liên kết xác nhận đã hết hạn hoặc không hợp lệ. Hãy thử đăng nhập hoặc mở lại email xác nhận trên trình duyệt đã đăng ký.' : '');
  const [success, setSuccess] = useState(false);
  const configured = isSupabaseConfigured();
  const prefix = register ? 'register' : 'login';

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    const email = String(values.get('email') || '').trim();
    const password = String(values.get('password') || '');
    const username = String(values.get('username') || '').trim();
    setSuccess(false);
    setMessage('');
    if (register && !username) { setMessage('Hãy nhập tên điều tra viên.'); return; }
    if (register && password !== values.get('confirmPassword')) { setMessage('Mật khẩu xác nhận không khớp.'); return; }
    setBusy(true);
    try {
      const supabase = createClient();
      if (register) {
        const callback = new URL('/auth/callback', window.location.origin);
        callback.searchParams.set('next', returnPath);
        const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { username }, emailRedirectTo: callback.toString() } });
        if (error) throw error;
        if (!data.session) {
          setSuccess(true);
          setMessage('Đăng ký thành công. Hãy kiểm tra email để xác nhận tài khoản trên trình duyệt này.');
          form.reset();
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      router.replace(returnPath);
      router.refresh();
    } catch (error) {
      setMessage(translateError(error instanceof Error ? error.message : ''));
    } finally { setBusy(false); }
  }

  return <main className="auth-main"><section className="auth-card">
    <div className="auth-label">MCA / {register ? 'INVESTIGATOR REGISTRATION' : 'SECURE ACCESS'}</div>
    <h1>{register ? 'TẠO TÀI KHOẢN' : 'ĐĂNG NHẬP'}</h1>
    <p className="auth-description">{register ? 'Đăng ký để trở thành Điều tra viên của Multiverse Creature Archive.' : 'Truy cập tài khoản Điều tra viên MCA.'}</p>
    {!configured && <p className="auth-message error" role="alert">Chưa cấu hình kết nối Supabase. Hãy điền .env.local theo .env.example.</p>}
    <form id={`${prefix}Form`} onSubmit={submit}>
      {register && <div className="auth-group"><label htmlFor="registerUsername">TÊN ĐIỀU TRA VIÊN</label><input name="username" id="registerUsername" required maxLength={40} autoComplete="nickname" placeholder="Ví dụ: Kenya" /></div>}
      <div className="auth-group"><label htmlFor={`${prefix}Email`}>EMAIL</label><input name="email" id={`${prefix}Email`} type="email" required autoComplete="email" placeholder="example@email.com" /></div>
      <div className="auth-group"><label htmlFor={`${prefix}Password`}>MẬT KHẨU</label><input name="password" id={`${prefix}Password`} type="password" required minLength={register ? 6 : undefined} autoComplete={register ? 'new-password' : 'current-password'} placeholder={register ? 'Tối thiểu 6 ký tự' : 'Nhập mật khẩu'} /></div>
      {register && <div className="auth-group"><label htmlFor="registerPasswordConfirm">XÁC NHẬN MẬT KHẨU</label><input name="confirmPassword" id="registerPasswordConfirm" type="password" required minLength={6} autoComplete="new-password" placeholder="Nhập lại mật khẩu" /></div>}
      <button type="submit" className="auth-submit" id={`${prefix}Button`} disabled={busy || !configured}>{busy ? 'ĐANG XÁC THỰC...' : register ? 'TẠO TÀI KHOẢN' : 'ĐĂNG NHẬP'}</button>
    </form>
    <div className={`auth-message ${success ? 'success' : 'error'}`} id="authMessage" role={success ? 'status' : 'alert'} aria-live="polite">{message}</div>
    <div className="auth-switch">{register ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'} <Link href={`${register ? '/dang-nhap' : '/dang-ky'}?next=${encodeURIComponent(returnPath)}`}>{register ? 'Đăng nhập' : 'Tạo tài khoản'}</Link></div>
  </section></main>;
}

