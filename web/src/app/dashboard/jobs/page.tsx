import { createClient } from '@/lib/supabase/server';
import { getOrCreateMaster } from '@/lib/supabase/getMaster';
import Link from 'next/link';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  new: { label: 'Új', color: 'bg-blue-500/20 text-blue-300' },
  in_progress: { label: 'Folyamatban', color: 'bg-yellow-500/20 text-yellow-300' },
  done: { label: 'Kész', color: 'bg-green-500/20 text-green-300' },
  invoiced: { label: 'Számlázva', color: 'bg-accent/20 text-accent' },
  cancelled: { label: 'Törölve', color: 'bg-red-500/20 text-red-300' },
};

export default async function JobsPage() {
  const supabase = await createClient();
  const master = await getOrCreateMaster();

  type JobRow = {
    id: string;
    title: string;
    address: string | null;
    status: string;
    scheduled_at: string | null;
    clients: { name: string } | null;
  };

  const jobs: JobRow[] = master
    ? ((await supabase
        .from('jobs')
        .select('id, title, address, status, scheduled_at, clients(name)')
        .eq('master_id', master.id)
        .order('created_at', { ascending: false })).data ?? []) as unknown as JobRow[]
    : [];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black">Munkák</h1>
        <Link
          href="/dashboard/jobs/new"
          className="bg-accent hover:bg-[#FB923C] text-white font-semibold px-5 py-2.5 rounded-btn transition-colors text-sm"
        >
          + Új munka
        </Link>
      </div>

      {jobs.length === 0 ? (
        <div className="bg-surface border border-border rounded-card p-12 text-center">
          <div className="text-5xl mb-4">🔨</div>
          <h2 className="text-lg font-bold mb-2">Még nincs munka</h2>
          <p className="text-[#A3A3A3] text-sm mb-6">Hozd létre az elsőt és kezdj el dolgozni!</p>
          <Link
            href="/dashboard/jobs/new"
            className="inline-flex bg-accent hover:bg-[#FB923C] text-white font-semibold px-6 py-3 rounded-btn transition-colors text-sm"
          >
            + Új munka létrehozása
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {jobs.map((job) => {
            const st = STATUS_LABELS[job.status] ?? { label: job.status, color: 'bg-[#2A2A2A] text-[#A3A3A3]' };
            return (
              <div key={job.id} className="bg-surface border border-border rounded-card p-5 flex items-center justify-between hover:border-accent/30 transition-colors">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-semibold">{job.title}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.color}`}>{st.label}</span>
                  </div>
                  <div className="text-sm text-[#A3A3A3] flex gap-3">
                    {job.clients && <span>👤 {job.clients.name}</span>}
                    {job.address && <span>📍 {job.address}</span>}
                    {job.scheduled_at && (
                      <span>📅 {new Date(job.scheduled_at).toLocaleDateString('hu-HU')}</span>
                    )}
                  </div>
                </div>
                <Link
                  href={`/dashboard/jobs/${job.id}`}
                  className="text-sm text-accent hover:underline ml-4"
                >
                  Megnyit →
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
