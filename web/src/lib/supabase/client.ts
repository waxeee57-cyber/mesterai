import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/^﻿/, '').trim();
const supabaseKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').replace(/^﻿/, '').trim();

export const createClient = () => createBrowserClient(supabaseUrl, supabaseKey);
