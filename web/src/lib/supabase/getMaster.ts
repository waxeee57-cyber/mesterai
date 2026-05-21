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
  bank_account: string | null;
  subscription_tier: string | null;
  subscription_expires_at: string | null;
  trial_expires_at: string | null;
  onboarded: boolean | null;
};

const SELECT_FIELDS = 'id, auth_id, name, trade, phone, email, company_name, tax_number, tax_type, address, bank_account, subscription_tier, subscription_expires_at, trial_expires_at, onboarded';

export async function getMaster(): Promise<Master | null> {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const user = session.user;

  const { data } = await supabase
    .from('masters')
    .select(SELECT_FIELDS)
    .eq('auth_id', user.id)
    .single();

  return data ?? null;
}

export async function getOrCreateMaster(): Promise<Master | null> {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const user = session.user;

  const { data: existing } = await supabase
    .from('masters')
    .select(SELECT_FIELDS)
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
      onboarded: false,
    })
    .select(SELECT_FIELDS)
    .single();

  return created ?? null;
}
