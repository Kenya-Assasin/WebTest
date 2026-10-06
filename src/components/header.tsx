'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase/config';

const nav = [
  { href: '/', label: 'Trang chủ', icon: '⌂' },
  { href: '/kho-du-lieu', label: 'Kho dữ liệu', icon: '▣' },
  { href: '/tao-ho-so', label: 'Tạo hồ sơ', icon: '♢' },
  { href: '/dieu-tra-vien', label: 'Điều tra viên', icon: '◎' },
];

export function Header() {
  const path = usePathname();
  const router = useRouter();
  const [account, setAccount] = useState<{ user: User; profile: Profile | null; verified: number } | null>(null);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const supabase = createClient();
    let active = true;
    let generation = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    async function refresh() {
      const current = ++generation;
      const { data: { user } } = await supabase.auth.getUser();
      if (!active || current !== generation) return;
      if (!user) { setAccount(null); return; }
      const [profileResult, countResult] = await Promise.all([
        supabase.from('profiles').select('id, username, avatar_url, role, investigator_level, reputation').eq('id', user.id).maybeSingle(),
        supabase.from('creatures').select('id', { count: 'exact', head: true }).eq('creator_id', user.id).eq('status', 'verified'),
      ]);
      if (active && current === generation) setAccount({ user, profile: profileResult.data as Profile | null, verified: countResult.count ?? 0 });
    }
    void refresh();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      // Leave the auth callback before calling Supabase again to avoid holding its lock.
      if (event === 'SIGNED_OUT') { generation++; setAccount(null); }
      else if (event !== 'INITIAL_SESSION') {
        clearTimeout(timer);
        timer = setTimeout(() => { void refresh(); }, 0);
      }
    });
    const profileChanged = () => { void refresh(); };
    window.addEventListener('mca-profile-updated', profileChanged);
    return () => { active = false; generation++; clearTimeout(timer); subscription.unsubscribe(); window.removeEventListener('mca-profile-updated', profileChanged); };
  }, []);

  async function logout() {
    setLogoutBusy(true);
    setMessage('');
    const { error } = await createClient().auth.signOut();
    if (error) { setMessage('Không thể đăng xuất. Hãy thử lại.'); setLogoutBusy(false); return; }
    setLogoutBusy(false);
    router.replace('/');
    router.refresh();
  }

  const username = account?.profile?.username || account?.user.user_metadata?.username || account?.user.email?.split('@')[0] || 'Investigator';
  const activePath = path === '/chi-tiet-sinh-vat' ? '/kho-du-lieu' : path;

  return <header className="topbar">
    <Link href="/" className="brand"><div className="brand-mark">✦</div><div className="brand-text"><strong>MCA</strong><span>MULTIVERSE CREATURE ARCHIVE</span></div></Link>
    <nav className="main-nav" aria-label="Điều hướng chính">
      {nav.map(item => <Link key={item.href} href={item.href} className={`nav-link${activePath === item.href ? ' active' : ''}`} aria-current={activePath === item.href ? 'page' : undefined}>
        <span className="nav-icon">{item.icon}</span><span className="nav-text">{item.label}</span>
      </Link>)}
      {account?.profile?.role === 'admin' && <Link href="/admin" id="headerAdminLink" className={`nav-link${path.startsWith('/admin') ? ' active' : ''}`}>Quản trị</Link>}
    </nav>
    <div className="top-actions"><div className="header-user-area">
      {!account ? <div className="header-guest" id="headerGuest">
        <Link href="/dang-nhap" className="header-login-button">ĐĂNG NHẬP</Link><Link href="/dang-ky" className="header-register-button">ĐĂNG KÝ</Link>
      </div> : <div className="header-account" id="headerAccount">
        <Link href="/dieu-tra-vien" className="header-user-profile header-profile-link">
          <div className="header-avatar" id="headerAvatar">
            {account.profile?.avatar_url ? <img src={account.profile.avatar_url} alt={username} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} onError={event => { event.currentTarget.style.display = 'none'; }} /> : username.charAt(0).toUpperCase()}
          </div>
          <div className="header-user-info"><strong id="headerUsername">{username}</strong><span id="headerLevel">{account.profile?.investigator_level || 'Cấp I'}</span></div>
        </Link>
        <div className="header-user-stats"><span>REP<strong id="headerReputation">{account.profile?.reputation ?? 0}</strong></span><span>VERIFIED<strong id="headerVerified">{account.verified}</strong></span></div>
        <button type="button" className="header-logout-button" id="headerLogoutButton" onClick={logout} disabled={logoutBusy}>{logoutBusy ? 'ĐANG ĐĂNG XUẤT...' : 'ĐĂNG XUẤT'}</button>
      </div>}
      {message && <span role="alert">{message}</span>}
    </div></div>
  </header>;
}

