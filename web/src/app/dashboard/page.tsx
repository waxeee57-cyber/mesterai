import { createClient } from '@/lib/supabase/server';
import { getOrCreateMaster } from '@/lib/supabase/getMaster';
import Link from 'next/link';

export default async function WebDashboard() {
  const supabase = await createClient();
  const master = await getOrCreateMaster();

  const [jobsRes, clientsRes, invoicesRes] = await Promise.all([
    master
      ? supabase.from('jobs').select('id', { count: 'exact' }).eq('master_id', master.id).in('status', ['new', 'in_progress'])
      : Promise.resolve({ count: 0 }),
    master
      ? supabase.from('clients').select('id', { count: 'exact' }).eq('master_id', master.id)
      : Promise.resolve({ count: 0 }),
    master
      ? supabase.from('invoices').select('id, total_gross').eq('master_id', master.id).eq('status', 'draft')
      : Promise.resolve({ data: [], count: 0 }),
  ]);

  const openJobs = (jobsRes as { count: number | null }).count ?? 0;
  const clientCount = (clientsRes as { count: number | null }).count ?? 0;
  const unpaidInvoices = Array.isArray((invoicesRes as { data: unknown[] }).data)
    ? (invoicesRes as { data: unknown[] }).data.length
    : 0;

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-black mb-6">Főoldal</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
        {[
          { label: 'Havi bevétel', value: '0 Ft', accent: true },
          { label: 'Nyitott munkák', value: String(openJobs) },
          { label: 'Kifizetetlen számla', value: String(unpaidInvoices) },
          { label: 'Ügyfelek', value: String(clientCount) },
        ].map(s => (
          <div key={s.label} className="bg-surface border border-border rounded-card p-5">
            <p className={`text-2xl font-black ${s.accent ? 'text-accent' : 'text-[#F5F5F5]'}`}>{s.value}</p>
            <p className="text-sm text-[#A3A3A3] mt-1">{s.label}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-[#525252] mb-8">Kezdj el munkákat rögzíteni hogy megjelenjenek a statisztikák.</p>

      <div className="flex flex-wrap gap-3 mb-8">
        <Link
          href="/dashboard/jobs/new"
          className="flex items-center gap-2 bg-accent hover:bg-[#FB923C] text-white font-semibold px-5 py-3 rounded-btn transition-colors text-sm"
        >
          + Új munka
        </Link>
        <Link
          href="/dashboard/clients/new"
          className="flex items-center gap-2 bg-surface border border-border hover:border-accent/50 text-[#F5F5F5] font-semibold px-5 py-3 rounded-btn transition-colors text-sm"
        >
          + Új ügyfél
        </Link>
        <Link
          href="/dashboard/invoices/new"
          className="flex items-center gap-2 bg-surface border border-border hover:border-accent/50 text-[#F5F5F5] font-semibold px-5 py-3 rounded-btn transition-colors text-sm"
        >
          📄 Számla küldése
        </Link>
      </div>

      <div className="bg-surface border border-border rounded-card p-8 text-center">
        <div className="text-5xl mb-4">🚀</div>
        <h2 className="text-xl font-bold mb-2">Üdvözöljük a MesterAI-ban!</h2>
        <p className="text-sm text-[#525252]">Hozd létre az első munkádat és küldj számlát 60 másodperc alatt.</p>
      </div>
    </div>
  );
}
