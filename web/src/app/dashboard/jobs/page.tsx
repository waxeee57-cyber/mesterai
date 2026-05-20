'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

type Job = {
  id: string;
  title: string;
  address: string | null;
  status: string;
  scheduled_at: string | null;
  created_at: string;
  clients: { name: string } | null;
};

const FILTERS = [
  { key: 'all', label: 'Mind' },
  { key: 'new', label: 'Új' },
  { key: 'in_progress', label: 'Folyamatban' },
  { key: 'done', label: 'Kész' },
  { key: 'invoiced', label: 'Számlázva' },
];

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

export default function JobsPage() {
  const supabase = createClient();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [masterId, setMasterId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      let { data: master } = await supabase.from('masters').select('id').eq('auth_id', user.id).single();
      if (!master) { const { data: c } = await supabase.from('masters').insert({ auth_id: user.id, name: user.email!.split('@')[0], trade: 'általános', email: user.email }).select('id').single(); master = c; }
      if (!master) return;
      setMasterId(master.id);
      let q = supabase.from('jobs').select('id, title, address, status, scheduled_at, created_at, clients(name)').eq('master_id', master.id).order('created_at', { ascending: false });
      const { data } = await q;
      setJobs((data ?? []) as unknown as Job[]);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = jobs.filter(j => {
    const matchStatus = filter === 'all' || j.status === filter;
    const matchSearch = !search || j.title.toLowerCase().includes(search.toLowerCase()) || j.clients?.name.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black">Munkák</h1>
        <Link href="/dashboard/jobs/new"
          className="bg-accent hover:bg-[#FB923C] text-white font-semibold px-5 py-2.5 rounded-btn transition-colors text-sm min-h-[44px] flex items-center">
          + Új munka
        </Link>
      </div>

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="🔍 Keresés (cím, ügyfél)..."
        className="w-full bg-surface border border-border rounded-input px-4 py-3 text-[#F5F5F5] placeholder-[#525252] focus:outline-none focus:border-accent transition-colors mb-4 text-sm"
      />

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors min-h-[36px] ${
              filter === f.key ? 'bg-accent text-white' : 'bg-surface border border-border text-[#A3A3A3] hover:text-[#F5F5F5]'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-[#A3A3A3] text-center py-12">Betöltés...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-surface border border-border rounded-card p-12 text-center">
          <div className="text-5xl mb-4">🔨</div>
          <h2 className="text-lg font-bold mb-2">Még nincs munka</h2>
          <p className="text-[#A3A3A3] text-sm mb-6">Hozd létre az elsőt és kezdj el dolgozni!</p>
          <Link href="/dashboard/jobs/new"
            className="inline-flex bg-accent hover:bg-[#FB923C] text-white font-semibold px-6 py-3 rounded-btn transition-colors text-sm">
            + Új munka létrehozása
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map(job => {
            const st = STATUS_COLORS[job.status] ?? 'bg-[#2A2A2A] text-[#A3A3A3]';
            return (
              <Link key={job.id} href={`/dashboard/jobs/${job.id}`}
                className="bg-surface border border-border rounded-card p-4 flex items-center justify-between hover:border-accent/30 transition-colors">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-semibold truncate">{job.title}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${st}`}>
                      {STATUS_LABELS[job.status] ?? job.status}
                    </span>
                  </div>
                  <div className="text-xs text-[#A3A3A3] flex gap-3 flex-wrap">
                    {job.clients && <span>👤 {job.clients.name}</span>}
                    {job.address && <span>📍 {job.address}</span>}
                    {job.scheduled_at && (
                      <span>📅 {new Date(job.scheduled_at).toLocaleDateString('hu-HU')}</span>
                    )}
                  </div>
                </div>
                <span className="text-accent ml-4 text-lg shrink-0">›</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
