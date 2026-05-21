import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/^﻿/, '').trim();
const supabaseKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').replace(/^﻿/, '').trim();

// These paths are always accessible — no session-based redirect
const PUBLIC_PATHS = ['/', '/login', '/register', '/onboarding'];

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
  const isPublic = PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'));
  const isProtected = pathname.startsWith('/dashboard');

  // Public paths: never redirect, always show the page
  if (isPublic) return supabaseResponse;

  // Protected paths: must have a session
  if (isProtected) {
    // getSession() reads JWT from cookies locally — no network call, no undici ISO-8859-1 error
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api|invoice).*)'],
};
