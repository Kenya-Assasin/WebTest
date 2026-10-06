import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseConfig, isSupabaseConfigured } from '@/lib/supabase/config';
import type { Database } from '@/lib/supabase/database.types';

export async function proxy(request: NextRequest) {
  if (!isSupabaseConfigured()) return NextResponse.next();
  const { url, key } = getSupabaseConfig();
  let response = NextResponse.next({ request });
  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values) {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        response.headers.set('Cache-Control', 'private, no-store');
      },
    },
  });
  await supabase.auth.getClaims();
  return response;
}

export const config = {
  matcher: ['/((?!_next/|styles/|assets/|images/|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js)$).*)'],
};

