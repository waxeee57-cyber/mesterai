import { createClient } from '@/lib/supabase/server';
import { getOrCreateMaster } from '@/lib/supabase/getMaster';
import Link from 'next/link';

export default async function ClientsPage() {
  const supabase = await createClient();
  const master = await getOrCreateMaster();

  const clients = master
    ? (await supabase
        .from('clients')
        .select('id, name, phone, email, jobs_count, total_revenue')
        .eq('master_id', master.id)
        .order('name', { ascending: true })).data ?? []
    : [];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black">Ügyfelek</h1>
        <Link
          href="/dashboard/clients/new"
          className="bg-accent hover:bg-[#FB923C] text-white font-semibold px-5 py-2.5 rounded-btn transition-colors text-sm"
        >
          + Új ügyfél
        </Link>
      </div>

      {clients.length === 0 ? (
        <div className="bg-surface border border-border rounded-card p-12 text-center">
          <div className="text-5xl mb-4">👥</div>
          <h2 className="text-lg font-bold mb-2">Még nincs ügyfél</h2>
          <p className="text-[#A3A3A3] text-sm mb-6">Add hozzá az első ügyfeleted!</p>
          <Link
            href="/dashboard/clients/new"
            className="inline-flex bg-accent hover:bg-[#FB923C] text-white font-semibold px-6 py-3 rounded-btn transition-colors text-sm"
          >
            + Új ügyfél hozzáadása
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {clients.map((c: {
            id: string;
            name: string;
            phone: string | null;
            email: string | null;
            jobs_count: number;
            total_revenue: number;
          }) => (
            <div key={c.id} className="bg-surface border border-border rounded-card p-5 flex items-center justify-between hover:border-accent/30 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold text-sm">
                  {c.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold">{c.name}</p>
                  <div className="text-sm text-[#A3A3A3] flex gap-3">
                    {c.phone && <span>📞 {c.phone}</span>}
                    {c.email && <span>✉️ {c.email}</span>}
                  </div>
                </div>
              </div>
              <div className="text-right text-sm text-[#A3A3A3]">
                <p>{c.jobs_count} munka</p>
                <p className="text-accent font-semibold">
                  {c.total_revenue > 0 ? `${Math.round(c.total_revenue).toLocaleString('hu-HU')} Ft` : '—'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
