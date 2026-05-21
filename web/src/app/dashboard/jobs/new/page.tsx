'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function NewJobPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetClientId = searchParams.get('clientId');
  const supabase = createClient();

  const [masterId, setMasterId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [clientName, setClientName] = useState('');
  const [title, setTitle] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }
      const user = session.user;

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

      if (presetClientId && master) {
        const { data: cl } = await supabase
          .from('clients')
          .select('name')
          .eq('id', presetClientId)
          .eq('master_id', master.id)
          .single();
        if (cl) setClientName(cl.name);
      }

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
      let clientId: string | null = null;

      if (clientName.trim()) {
        const { data: existing } = await supabase
          .from('clients')
          .select('id')
          .eq('master_id', masterId)
          .ilike('name', clientName.trim())
          .single();

        if (existing) {
          clientId = existing.id;
        } else {
          const { data: newClient, error: cErr } = await supabase
            .from('clients')
            .insert({ master_id: masterId, name: clientName.trim() })
            .select('id')
            .single();
          if (cErr) throw cErr;
          clientId = newClient?.id ?? null;
        }
      }

      const { error: jErr } = await supabase.from('jobs').insert({
        master_id: masterId,
        client_id: clientId,
        title: title.trim(),
        address: address.trim() || null,
        description: description.trim() || null,
        scheduled_at: scheduledAt || null,
        status: 'new',
      });

      if (jErr) throw jErr;
      router.push('/dashboard/jobs');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Mentés sikertelen');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="max-w-lg mx-auto text-[#A3A3A3] pt-12 text-center">Betöltés...</div>;
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/jobs" className="text-[#A3A3A3] hover:text-[#F5F5F5] text-sm">← Vissza</Link>
        <h1 className="text-2xl font-black">Új munka</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-card p-6 flex flex-col gap-4">
        <div>
          <label className="block text-sm font-semibold text-[#A3A3A3] mb-1.5">Ügyfél neve</label>
          <input
            type="text"
            value={clientName}
            onChange={e => setClientName(e.target.value)}
            placeholder="pl. Kovács János"
            className="w-full bg-bg border border-border rounded-input px-4 py-3 text-[#F5F5F5] placeholder-[#525252] focus:outline-none focus:border-accent transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-[#A3A3A3] mb-1.5">Munka megnevezése *</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="pl. Villanyszerelés, konyha"
            required
            className="w-full bg-bg border border-border rounded-input px-4 py-3 text-[#F5F5F5] placeholder-[#525252] focus:outline-none focus:border-accent transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-[#A3A3A3] mb-1.5">Helyszín / Cím</label>
          <input
            type="text"
            value={address}
            onChange={e => setAddress(e.target.value)}
            placeholder="pl. Budapest, Kossuth u. 10."
            className="w-full bg-bg border border-border rounded-input px-4 py-3 text-[#F5F5F5] placeholder-[#525252] focus:outline-none focus:border-accent transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-[#A3A3A3] mb-1.5">Leírás</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Részletes leírás..."
            rows={3}
            className="w-full bg-bg border border-border rounded-input px-4 py-3 text-[#F5F5F5] placeholder-[#525252] focus:outline-none focus:border-accent transition-colors resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-[#A3A3A3] mb-1.5">Időpont</label>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={e => setScheduledAt(e.target.value)}
            className="w-full bg-bg border border-border rounded-input px-4 py-3 text-[#F5F5F5] focus:outline-none focus:border-accent transition-colors"
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
          {saving ? 'Mentés...' : 'Munka mentése →'}
        </button>
      </form>
    </div>
  );
}
