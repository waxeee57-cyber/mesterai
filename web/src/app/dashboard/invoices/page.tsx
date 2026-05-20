import { createClient } from '@/lib/supabase/server';
import { getOrCreateMaster } from '@/lib/supabase/getMaster';
import Link from 'next/link';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: 'Vázlat', color: 'bg-[#2A2A2A] text-[#A3A3A3]' },
  sent: { label: 'Kiküldve', color: 'bg-blue-500/20 text-blue-300' },
  paid: { label: 'Fizetve', color: 'bg-green-500/20 text-green-300' },
  overdue: { label: 'Lejárt', color: 'bg-red-500/20 text-red-300' },
};

export default async function InvoicesPage() {
  const supabase = await createClient();
  const master = await getOrCreateMaster();

  type InvoiceRow = {
    id: string;
    invoice_number: string;
    status: string;
    issue_date: string | null;
    total_gross: number | null;
    clients: { name: string } | null;
  };

  const invoices: InvoiceRow[] = master
    ? ((await supabase
        .from('invoices')
        .select('id, invoice_number, status, issue_date, total_gross, clients(name)')
        .eq('master_id', master.id)
        .order('created_at', { ascending: false })).data ?? []) as unknown as InvoiceRow[]
    : [];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black">Számlák</h1>
        <Link
          href="/dashboard/invoices/new"
          className="bg-accent hover:bg-[#FB923C] text-white font-semibold px-5 py-2.5 rounded-btn transition-colors text-sm"
        >
          + Új számla
        </Link>
      </div>

      {invoices.length === 0 ? (
        <div className="bg-surface border border-border rounded-card p-12 text-center">
          <div className="text-5xl mb-4">📄</div>
          <h2 className="text-lg font-bold mb-2">Még nincs számla</h2>
          <p className="text-[#A3A3A3] text-sm mb-6">Hozd létre az első számládat!</p>
          <Link
            href="/dashboard/invoices/new"
            className="inline-flex bg-accent hover:bg-[#FB923C] text-white font-semibold px-6 py-3 rounded-btn transition-colors text-sm"
          >
            + Számla létrehozása
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {invoices.map((inv) => {
            const st = STATUS_LABELS[inv.status] ?? { label: inv.status, color: 'bg-[#2A2A2A] text-[#A3A3A3]' };
            return (
              <div key={inv.id} className="bg-surface border border-border rounded-card p-5 flex items-center justify-between hover:border-accent/30 transition-colors">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-semibold">{inv.invoice_number}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.color}`}>{st.label}</span>
                  </div>
                  <div className="text-sm text-[#A3A3A3] flex gap-3">
                    {inv.clients && <span>👤 {inv.clients.name}</span>}
                    {inv.issue_date && <span>📅 {new Date(inv.issue_date).toLocaleDateString('hu-HU')}</span>}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-accent">
                    {inv.total_gross ? `${Math.round(inv.total_gross).toLocaleString('hu-HU')} Ft` : '—'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
