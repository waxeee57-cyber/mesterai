import { createClient } from './server';

export type Master = {
  id: string;
  auth_id: string;
  name: string;
  trade: string;
  phone: string | null;
  email: string | null;
  company_name: string | null;
  tax_number: string | null;
  tax_type: string | null;
  address: string | null;
  city: string | null;
};

export async function getMaster(): Promise<Master | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('masters')
    .select('id, auth_id, name, trade, phone, email, company_name, tax_number, tax_type, address, city')
    .eq('auth_id', user.id)
    .single();

  return data ?? null;
}

export async function getOrCreateMaster(): Promise<Master | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: existing } = await supabase
    .from('masters')
    .select('id, auth_id, name, trade, phone, email, company_name, tax_number, tax_type, address, city')
    .eq('auth_id', user.id)
    .single();

  if (existing) return existing;

  const { data: created } = await supabase
    .from('masters')
    .insert({
      auth_id: user.id,
      name: user.email?.split('@')[0] ?? 'Mesterember',
      trade: 'általános',
      email: user.email,
    })
    .select('id, auth_id, name, trade, phone, email, company_name, tax_number, tax_type, address, city')
    .single();

  return created ?? null;
}
