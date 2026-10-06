import { Suspense } from 'react';
import { AuthForm } from '@/components/auth-form';
export const metadata = { title: 'Đăng ký' };
export default function RegisterPage() {
  return <><link rel="stylesheet" href="/styles/auth.css" /><Suspense fallback={<main className="auth-main">Đang tải...</main>}><AuthForm register /></Suspense></>;
}
