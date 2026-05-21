import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/^﻿/, '').trim();
const supabaseKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').replace(/^﻿/, '').trim();

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet: { name: string; value: string; options: CookieOptions }[]) => {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
        },
      },
    }
  );

  const { pathname } = request.nextUrl;
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register');
  const isProtected = pathname.startsWith('/dashboard');

  // getSession() reads JWT from cookies locally — no network call, no undici ISO-8859-1 error
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  if (isProtected && !user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  if (isAuthPage && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};
