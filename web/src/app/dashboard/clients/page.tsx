'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

type Client = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  jobs_count: number;
  total_revenue: number;
};

export default function ClientsPage() {
  const supabase = createClient();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      let { data: master } = await supabase.from('masters').select('id').eq('auth_id', user.id).single();
      if (!master) { const { data: c } = await supabase.from('masters').insert({ auth_id: user.id, name: user.email!.split('@')[0], trade: 'általános', email: user.email }).select('id').single(); master = c; }
      if (!master) return;
      const { data } = await supabase.from('clients').select('id, name, phone, email, jobs_count, total_revenue').eq('master_id', master.id).order('name');
      setClients((data ?? []) as Client[]);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = clients.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search)
  );

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black">Ügyfelek</h1>
        <Link href="/dashboard/clients/new"
          className="bg-accent hover:bg-[#FB923C] text-white font-semibold px-5 py-2.5 rounded-btn transition-colors text-sm min-h-[44px] flex items-center">
          + Új ügyfél
        </Link>
      </div>

      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="🔍 Keresés (név, telefon)..."
        className="w-full bg-surface border border-border rounded-input px-4 py-3 text-[#F5F5F5] placeholder-[#525252] focus:outline-none focus:border-accent transition-colors mb-6 text-sm"
      />

      {loading ? (
        <div className="text-[#A3A3A3] text-center py-12">Betöltés...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-surface border border-border rounded-card p-12 text-center">
          <div className="text-5xl mb-4">👥</div>
          <h2 className="text-lg font-bold mb-2">{search ? 'Nincs találat' : 'Még nincs ügyfél'}</h2>
          <p className="text-[#A3A3A3] text-sm mb-6">
            {search ? 'Próbálj más keresési feltételt.' : 'Add hozzá az első ügyfeleded!'}
          </p>
          {!search && (
            <Link href="/dashboard/clients/new"
              className="inline-flex bg-accent hover:bg-[#FB923C] text-white font-semibold px-6 py-3 rounded-btn transition-colors text-sm">
              + Ügyfél hozzáadása
            </Link>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map(c => (
            <Link key={c.id} href={`/dashboard/clients/${c.id}`}
              className="bg-surface border border-border rounded-card p-4 flex items-center justify-between hover:border-accent/30 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold text-sm shrink-0">
                  {c.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold truncate">{c.name}</p>
                  <div className="text-xs text-[#A3A3A3] flex gap-3">
                    {c.phone && <span>📞 {c.phone}</span>}
                    {c.email && <span className="hidden sm:inline">✉️ {c.email}</span>}
                  </div>
                </div>
              </div>
              <div className="text-right ml-4 shrink-0">
                <p className="text-xs text-[#525252]">{c.jobs_count} munka</p>
                {c.total_revenue > 0 && (
                  <p className="text-sm font-semibold text-accent">
                    {Math.round(c.total_revenue).toLocaleString('hu-HU')} Ft
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
