'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

type Invoice = {
  id: string;
  invoice_number: string;
  status: string;
  issue_date: string | null;
  due_date: string | null;
  total_gross: number | null;
  nav_status: string | null;
  clients: { name: string } | null;
};

const FILTERS = [
  { key: 'all', label: 'Mind' },
  { key: 'draft', label: 'Vázlat' },
  { key: 'sent', label: 'Kiküldve' },
  { key: 'paid', label: 'Fizetve' },
  { key: 'overdue', label: 'Lejárt' },
];
const STATUS_LABELS: Record<string, string> = { draft: 'Vázlat', sent: 'Kiküldve', paid: 'Fizetve', overdue: 'Lejárt' };
const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-[#2A2A2A] text-[#A3A3A3]',
  sent: 'bg-blue-500/20 text-blue-300',
  paid: 'bg-green-500/20 text-green-300',
  overdue: 'bg-red-500/20 text-red-300',
};
const NAV_BADGES: Record<string, { icon: string; color: string; label: string }> = {
  confirmed: { icon: '🟢', color: 'text-green-400', label: 'NAV OK' },
  pending: { icon: '🟡', color: 'text-yellow-400', label: 'NAV Folyamatban' },
  processing: { icon: '🟡', color: 'text-yellow-400', label: 'NAV Folyamatban' },
  error: { icon: '🔴', color: 'text-red-400', label: 'NAV Hiba' },
};

export default function InvoicesPage() {
  const supabase = createClient();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      let { data: master } = await supabase.from('masters').select('id').eq('auth_id', user.id).single();
      if (!master) { const { data: c } = await supabase.from('masters').insert({ auth_id: user.id, name: user.email!.split('@')[0], trade: 'általános', email: user.email }).select('id').single(); master = c; }
      if (!master) return;

      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase.from('invoices')
        .select('id, invoice_number, status, issue_date, due_date, total_gross, nav_status, clients(name)')
        .eq('master_id', master.id)
        .order('created_at', { ascending: false });

      const rows = ((data ?? []) as unknown as Invoice[]).map(inv => ({
        ...inv,
        status: inv.status === 'sent' && inv.due_date && inv.due_date < today ? 'overdue' : inv.status,
      }));
      setInvoices(rows);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = invoices.filter(i => filter === 'all' || i.status === filter);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black">Számlák</h1>
        <Link href="/dashboard/invoices/new"
          className="bg-accent hover:bg-[#FB923C] text-white font-semibold px-5 py-2.5 rounded-btn transition-colors text-sm min-h-[44px] flex items-center">
          + Új számla
        </Link>
      </div>

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
          <div className="text-5xl mb-4">📄</div>
          <h2 className="text-lg font-bold mb-2">Még nincs számla</h2>
          <p className="text-[#A3A3A3] text-sm mb-6">Hozd létre az első számládat!</p>
          <Link href="/dashboard/invoices/new"
            className="inline-flex bg-accent hover:bg-[#FB923C] text-white font-semibold px-6 py-3 rounded-btn transition-colors text-sm">
            + Számla létrehozása
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map(inv => {
            const st = STATUS_COLORS[inv.status] ?? 'bg-[#2A2A2A] text-[#A3A3A3]';
            const nav = inv.nav_status ? NAV_BADGES[inv.nav_status] : null;
            return (
              <Link key={inv.id} href={`/dashboard/invoices/${inv.id}`}
                className="bg-surface border border-border rounded-card p-4 flex items-center justify-between hover:border-accent/30 transition-colors">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold">{inv.invoice_number}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st}`}>
                      {STATUS_LABELS[inv.status] ?? inv.status}
                    </span>
                    {nav && (
                      <span className={`text-xs font-medium ${nav.color}`}>
                        {nav.icon} {nav.label}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[#A3A3A3] flex gap-3">
                    {inv.clients && <span>👤 {inv.clients.name}</span>}
                    {inv.issue_date && <span>📅 {new Date(inv.issue_date).toLocaleDateString('hu-HU')}</span>}
                  </div>
                </div>
                <div className="text-right ml-4 shrink-0">
                  {inv.total_gross && (
                    <p className="font-bold text-accent">
                      {Math.round(inv.total_gross).toLocaleString('hu-HU')} Ft
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
