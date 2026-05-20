import { createClient } from '@/lib/supabase/server';
import { getOrCreateMaster } from '@/lib/supabase/getMaster';
import Link from 'next/link';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return 'Jó éjt';
  if (hour < 12) return 'Jó reggelt';
  if (hour < 18) return 'Jó napot';
  return 'Jó estét';
}

function formatHUF(n: number) {
  return `${Math.round(n).toLocaleString('hu-HU')} Ft`;
}

const STATUS_LABELS: Record<string, string> = {
  new: 'Új', in_progress: 'Folyamatban', done: 'Kész', invoiced: 'Számlázva', cancelled: 'Törölve',
};
const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-500/20 text-blue-300',
  in_progress: 'bg-yellow-500/20 text-yellow-300',
  done: 'bg-green-500/20 text-green-300',
  invoiced: 'bg-accent/20 text-accent',
  cancelled: 'bg-red-500/20 text-red-300',
};

export default async function WebDashboard() {
  const supabase = await createClient();
  const master = await getOrCreateMaster();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

  let monthRevenue = 0;
  let openJobsCount = 0;
  let unpaidCount = 0;
  let unpaidTotal = 0;
  let clientCount = 0;
  let todayJobs: Array<{ id: string; title: string; status: string; scheduled_at: string | null; clients: { name: string } | null }> = [];
  let overdueInvoices: Array<{ id: string; invoice_number: string; total_gross: number | null; clients: { name: string; phone: string | null } | null }> = [];

  if (master) {
    const [revRes, openRes, unpaidRes, clientRes, todayRes, overdueRes] = await Promise.all([
      supabase.from('invoices').select('total_gross').eq('master_id', master.id).eq('status', 'paid').gte('paid_at', monthStart),
      supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('master_id', master.id).in('status', ['new', 'in_progress']),
      supabase.from('invoices').select('id, total_gross').eq('master_id', master.id).in('status', ['draft', 'sent']),
      supabase.from('clients').select('id', { count: 'exact', head: true }).eq('master_id', master.id),
      supabase.from('jobs').select('id, title, status, scheduled_at, clients(name)').eq('master_id', master.id).gte('scheduled_at', todayStart).lt('scheduled_at', todayEnd).order('scheduled_at').limit(5),
      supabase.from('invoices').select('id, invoice_number, total_gross, clients(name, phone)').eq('master_id', master.id).in('status', ['draft', 'sent']).lt('due_date', new Date().toISOString().split('T')[0]).limit(3),
    ]);

    monthRevenue = ((revRes.data ?? []) as { total_gross: number }[]).reduce((s, i) => s + (i.total_gross ?? 0), 0);
    openJobsCount = openRes.count ?? 0;
    const unpaidRows = (unpaidRes.data ?? []) as { id: string; total_gross: number | null }[];
    unpaidCount = unpaidRows.length;
    unpaidTotal = unpaidRows.reduce((s, i) => s + (i.total_gross ?? 0), 0);
    clientCount = clientRes.count ?? 0;
    todayJobs = (todayRes.data ?? []) as unknown as typeof todayJobs;
    overdueInvoices = (overdueRes.data ?? []) as unknown as typeof overdueInvoices;
  }

  const today = now.toLocaleDateString('hu-HU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="max-w-4xl mx-auto">
      {/* Greeting */}
      <div className="mb-6">
        <h1 className="text-2xl font-black">{getGreeting()}{master?.name ? `, ${master.name.split(' ')[0]}` : ''}!</h1>
        <p className="text-sm text-[#A3A3A3] mt-1 capitalize">{today}</p>
      </div>

      {/* Overdue alert */}
      {overdueInvoices.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-card p-4 mb-6">
          <p className="text-sm font-semibold text-red-400 mb-2">
            ⚠️ {overdueInvoices.length} lejárt számla vár fizetésre
          </p>
          <div className="flex flex-col gap-1">
            {overdueInvoices.map(inv => (
              <div key={inv.id} className="flex items-center justify-between">
                <span className="text-sm text-[#A3A3A3]">
                  {inv.invoice_number} · {inv.clients?.name}
                </span>
                <div className="flex items-center gap-3">
                  {inv.total_gross && <span className="text-sm font-semibold">{formatHUF(inv.total_gross)}</span>}
                  {inv.clients?.phone && (
                    <a
                      href={`https://wa.me/${inv.clients.phone.replace(/\D/g, '').replace(/^06/, '36')}?text=${encodeURIComponent(`Kedves ${inv.clients.name}! A ${inv.invoice_number} számla fizetési határideje lejárt. Kérem rendezze!`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-green-400 hover:underline"
                    >
                      💬 Emlékeztető
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3 mb-8">
        <Link href="/dashboard/jobs/new"
          className="flex items-center gap-2 bg-accent hover:bg-[#FB923C] text-white font-semibold px-5 py-3 rounded-btn transition-colors text-sm min-h-[44px]">
          🔨 Új munka
        </Link>
        <Link href="/dashboard/clients/new"
          className="flex items-center gap-2 bg-surface border border-border hover:border-accent/50 text-[#F5F5F5] font-semibold px-5 py-3 rounded-btn transition-colors text-sm min-h-[44px]">
          👥 Új ügyfél
        </Link>
        <Link href="/dashboard/invoices/new"
          className="flex items-center gap-2 bg-surface border border-border hover:border-accent/50 text-[#F5F5F5] font-semibold px-5 py-3 rounded-btn transition-colors text-sm min-h-[44px]">
          📄 Számla küldése
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
        {[
          { label: 'Havi bevétel', value: formatHUF(monthRevenue), accent: true },
          { label: 'Nyitott munkák', value: String(openJobsCount) },
          { label: 'Kifizetetlen', value: unpaidCount > 0 ? `${unpaidCount} db · ${formatHUF(unpaidTotal)}` : '0' },
          { label: 'Ügyfelek', value: String(clientCount) },
        ].map(s => (
          <div key={s.label} className="bg-surface border border-border rounded-card p-4">
            <p className={`text-xl font-black ${s.accent ? 'text-accent' : 'text-[#F5F5F5]'}`}>{s.value}</p>
            <p className="text-xs text-[#A3A3A3] mt-1">{s.label}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-[#525252] mb-8">Kezdj el munkákat rögzíteni hogy megjelenjenek a statisztikák.</p>

      {/* Today's jobs */}
      {todayJobs.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-bold text-[#A3A3A3] uppercase tracking-wider mb-3">Mai munkák</h2>
          <div className="flex flex-col gap-2">
            {todayJobs.map(job => (
              <Link key={job.id} href={`/dashboard/jobs/${job.id}`}
                className="bg-surface border border-border rounded-card px-4 py-3 flex items-center justify-between hover:border-accent/30 transition-colors">
                <div>
                  <p className="font-semibold text-sm">{job.title}</p>
                  {job.clients && <p className="text-xs text-[#A3A3A3]">👤 {job.clients.name}</p>}
                </div>
                <div className="flex items-center gap-3">
                  {job.scheduled_at && (
                    <span className="text-xs text-[#525252]">
                      {new Date(job.scheduled_at).toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[job.status] ?? 'bg-[#2A2A2A] text-[#A3A3A3]'}`}>
                    {STATUS_LABELS[job.status] ?? job.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Welcome card (only if fresh) */}
      {openJobsCount === 0 && clientCount === 0 && (
        <div className="bg-surface border border-border rounded-card p-8 text-center">
          <div className="text-5xl mb-4">🚀</div>
          <h2 className="text-xl font-bold mb-2">Üdvözöljük a MesterAI-ban!</h2>
          <p className="text-sm text-[#525252]">Hozd létre az első munkádat és küldj számlát 60 másodperc alatt.</p>
        </div>
      )}
    </div>
  );
}
