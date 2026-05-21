import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/^﻿/, '').trim();
const supabaseKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').replace(/^﻿/, '').trim();

export const createClient = async () => {
  const cookieStore = await cookies();
  return createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet: { name: string; value: string; options: CookieOptions }[]) => {
          try {
            toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {}
        },
      },
    }
  );
};
