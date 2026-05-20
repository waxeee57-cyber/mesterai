'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function NewClientPage() {
  const router = useRouter();
  const supabase = createClient();

  const [masterId, setMasterId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      let { data: master } = await supabase
        .from('masters')
        .select('id')
        .eq('auth_id', user.id)
        .single();

      if (!master) {
        const { data: created } = await supabase
          .from('masters')
          .insert({ auth_id: user.id, name: user.email!.split('@')[0], trade: 'általános', email: user.email })
          .select('id')
          .single();
        master = created;
      }

      setMasterId(master?.id ?? null);
      setLoading(false);
    }
    init();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!masterId) return;
    setSaving(true);
    setError('');

    try {
      const { error: err } = await supabase.from('clients').insert({
        master_id: masterId,
        name: name.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
        address: address.trim() || null,
      });
      if (err) throw err;
      router.push('/dashboard/clients');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Mentés sikertelen');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="max-w-lg mx-auto text-[#A3A3A3] pt-12 text-center">Betöltés...</div>;

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/clients" className="text-[#A3A3A3] hover:text-[#F5F5F5] text-sm">← Vissza</Link>
        <h1 className="text-2xl font-black">Új ügyfél</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-card p-6 flex flex-col gap-4">
        <div>
          <label className="block text-sm font-semibold text-[#A3A3A3] mb-1.5">Név *</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="pl. Kovács János"
            required
            className="w-full bg-bg border border-border rounded-input px-4 py-3 text-[#F5F5F5] placeholder-[#525252] focus:outline-none focus:border-accent transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-[#A3A3A3] mb-1.5">Telefon</label>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="+36 30 123 4567"
            className="w-full bg-bg border border-border rounded-input px-4 py-3 text-[#F5F5F5] placeholder-[#525252] focus:outline-none focus:border-accent transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-[#A3A3A3] mb-1.5">Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="ugyfel@example.com"
            className="w-full bg-bg border border-border rounded-input px-4 py-3 text-[#F5F5F5] placeholder-[#525252] focus:outline-none focus:border-accent transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-[#A3A3A3] mb-1.5">Cím</label>
          <input
            type="text"
            value={address}
            onChange={e => setAddress(e.target.value)}
            placeholder="pl. Budapest, Kossuth u. 10."
            className="w-full bg-bg border border-border rounded-input px-4 py-3 text-[#F5F5F5] placeholder-[#525252] focus:outline-none focus:border-accent transition-colors"
          />
        </div>

        {error && (
          <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-2">{error}</p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-accent hover:bg-[#FB923C] disabled:opacity-50 text-white font-bold py-3.5 rounded-btn transition-colors"
        >
          {saving ? 'Mentés...' : 'Ügyfél mentése →'}
        </button>
      </form>
    </div>
  );
}
