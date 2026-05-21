'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MasterInfo {
  name: string;
  tax_number: string | null;
  address: string | null;
  bank_account: string | null;
  phone: string | null;
  tax_type: string | null;
}

interface ClientInfo {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
}

interface Invoice {
  id: string;
  master_id: string;
  client_id: string | null;
  job_id: string | null;
  invoice_number: string;
  status: string;
  issue_date: string | null;
  due_date: string | null;
  payment_method: string | null;
  notes: string | null;
  total_net: number | null;
  total_vat: number | null;
  total_gross: number | null;
  nav_id: string | null;
  nav_status: string | null;
  public_token: string | null;
  clients: ClientInfo | null;
  masters: MasterInfo | null;
}

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  vat_rate: number;
  total_net: number;
  total_gross: number;
  sort_order: number;
}

// ─── Status helpers ───────────────────────────────────────────────────────────

const INV_STATUS: Record<string, { label: string; color: string }> = {
  draft:   { label: 'Vázlat',   color: 'bg-[#2A2A2A] text-[#A3A3A3]' },
  sent:    { label: 'Kiküldve', color: 'bg-blue-500/20 text-blue-300' },
  paid:    { label: 'Fizetve',  color: 'bg-green-600/20 text-green-400' },
  overdue: { label: 'Lejárt',   color: 'bg-red-500/20 text-red-300' },
};

const NAV_STATUS_META: Record<string, { icon: string; label: string; color: string }> = {
  ok:          { icon: '🟢', label: 'NAV OK',        color: 'text-green-400' },
  pending:     { icon: '🟡', label: 'Folyamatban',   color: 'text-yellow-300' },
  processing:  { icon: '🟡', label: 'Folyamatban',   color: 'text-yellow-300' },
  error:       { icon: '🔴', label: 'Hiba',          color: 'text-red-400' },
};

function InvStatusBadge({ status }: { status: string }) {
  const m = INV_STATUS[status] ?? { label: status, color: 'bg-[#2A2A2A] text-[#A3A3A3]' };
  return (
    <span className={`text-sm px-3 py-1 rounded-full font-semibold ${m.color}`}>{m.label}</span>
  );
}

function NavStatusBadge({ navStatus }: { navStatus: string | null }) {
  if (!navStatus) {
    return (
      <span className="text-xs px-2.5 py-1 rounded-full bg-[#2A2A2A] text-[#A3A3A3] font-semibold">
        NAV: nincs feltöltve
      </span>
    );
  }
  const m = NAV_STATUS_META[navStatus] ?? { icon: '⚪', label: navStatus, color: 'text-[#A3A3A3]' };
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full bg-[#2A2A2A] font-semibold ${m.color}`}>
      {m.icon} {m.label}
    </span>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtFt(n: number | null | undefined): string {
  if (n == null) return '—';
  return `${Math.round(n).toLocaleString('hu-HU')} Ft`;
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('hu-HU');
}

function normalizePhone(phone: string): string {
  let p = phone.replace(/[\s\-().]/g, '');
  if (p.startsWith('06')) p = '+36' + p.slice(2);
  if (!p.startsWith('+')) p = '+' + p;
  return p.replace('+', '');
}

const PAYMENT_LABELS: Record<string, string> = {
  cash:         'Készpénz',
  transfer:     'Átutalás',
  card:         'Bankkártya',
  stripe:       'Online',
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InvoiceDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [lineItems, setLineItems] = useState<InvoiceItem[]>([]);

  const [markingPaid, setMarkingPaid] = useState(false);
  const [navLoading, setNavLoading] = useState(false);
  const [navResult, setNavResult] = useState<{ ok: boolean; message: string } | null>(null);

  // ── Load ────────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push('/login'); return; }
    const user = session.user;

    const { data: master } = await supabase
      .from('masters')
      .select('id, tax_type')
      .eq('auth_id', user.id)
      .single();

    if (!master) { setError('Mester profil nem található'); setLoading(false); return; }

    const { data: invData, error: invErr } = await supabase
      .from('invoices')
      .select('*, clients(*), masters(name, tax_number, address, bank_account, phone, tax_type)')
      .eq('id', id)
      .eq('master_id', master.id)
      .single();

    if (invErr || !invData) {
      setError('A számla nem található vagy nincs hozzáférésed.');
      setLoading(false);
      return;
    }

    const inv = invData as unknown as Invoice;

    // Load invoice_items; if none, fall back to job_items
    const { data: iItems } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', id)
      .order('sort_order');

    let resolvedItems: InvoiceItem[] = (iItems ?? []) as InvoiceItem[];

    if (resolvedItems.length === 0 && inv.job_id) {
      const { data: jItems } = await supabase
        .from('job_items')
        .select('*')
        .eq('job_id', inv.job_id)
        .order('sort_order');
      resolvedItems = (jItems ?? []) as InvoiceItem[];
    }

    setInvoice(inv);
    setLineItems(resolvedItems);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // ── Mark paid ────────────────────────────────────────────────────────────────

  async function handleMarkPaid() {
    if (!invoice) return;
    if (!confirm('Biztosan beállítod fizetettre?')) return;
    setMarkingPaid(true);
    const { error: err } = await supabase
      .from('invoices')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', id);
    if (err) {
      alert('Hiba: ' + err.message);
    } else {
      setInvoice({ ...invoice, status: 'paid' });
    }
    setMarkingPaid(false);
  }

  // ── NAV upload ───────────────────────────────────────────────────────────────

  async function handleNavUpload() {
    setNavLoading(true);
    setNavResult(null);
    try {
      const res = await fetch('/api/nav/upload-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId: id }),
      });
      if (res.ok) {
        setNavResult({ ok: true, message: 'NAV feltöltés sikeres!' });
        setInvoice(prev => prev ? { ...prev, nav_status: 'processing' } : prev);
      } else {
        const body = await res.json().catch(() => ({}));
        setNavResult({ ok: false, message: (body as { message?: string }).message ?? 'NAV feltöltés sikertelen' });
      }
    } catch {
      setNavResult({ ok: false, message: 'Hálózati hiba' });
    } finally {
      setNavLoading(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="max-w-2xl mx-auto pt-12 text-center">
        <p className="text-red-400 text-lg mb-4">{error ?? 'Ismeretlen hiba'}</p>
        <Link href="/dashboard/invoices" className="text-accent hover:underline">← Vissza a számlákhoz</Link>
      </div>
    );
  }

  const client = invoice.clients;
  const masterInfo = invoice.masters;

  // WhatsApp message
  const buildWaLink = (): string | null => {
    if (!client?.phone) return null;
    const phone = normalizePhone(client.phone);
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const publicUrl = invoice.public_token
      ? `${origin}/invoice/${id}/public?token=${invoice.public_token}`
      : '';
    const text = `Számla: ${invoice.invoice_number}, Összeg: ${Math.round(invoice.total_gross ?? 0).toLocaleString('hu-HU')} Ft.${publicUrl ? ` Link: ${publicUrl}` : ''}`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  };

  const waLink = buildWaLink();

  // Totals (from invoice fields, or compute from items as fallback)
  const totalNet   = invoice.total_net   ?? lineItems.reduce((s, i) => s + i.total_net,   0);
  const totalGross = invoice.total_gross ?? lineItems.reduce((s, i) => s + i.total_gross, 0);
  const totalVat   = invoice.total_vat   ?? (totalGross - totalNet);

  const navNeedsUpload = invoice.nav_status == null || invoice.nav_status === 'error';

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6">

      {/* ── Header ── */}
      <div>
        <Link href="/dashboard/invoices" className="text-[#A3A3A3] hover:text-[#F5F5F5] text-sm inline-flex items-center gap-1 mb-4">
          ← Számlák
        </Link>
        <div className="flex items-start flex-wrap gap-3">
          <h1 className="text-2xl font-black flex-1">{invoice.invoice_number}</h1>
          <InvStatusBadge status={invoice.status} />
          <NavStatusBadge navStatus={invoice.nav_status} />
        </div>
      </div>

      {/* ── Actions ── */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => window.open(`/api/invoice-pdf/${id}`, '_blank')}
          className="flex items-center gap-2 bg-surface border border-border hover:border-accent/50 text-[#F5F5F5] font-semibold px-5 py-2.5 rounded-btn transition-colors text-sm min-h-[44px]"
        >
          📥 PDF letöltés
        </button>

        {waLink && (
          <button
            onClick={() => window.open(waLink, '_blank')}
            className="flex items-center gap-2 bg-surface border border-border hover:border-accent/50 text-[#F5F5F5] font-semibold px-5 py-2.5 rounded-btn transition-colors text-sm min-h-[44px]"
          >
            💬 WhatsApp
          </button>
        )}

        {invoice.status !== 'paid' && (
          <button
            onClick={handleMarkPaid}
            disabled={markingPaid}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-btn transition-colors text-sm min-h-[44px]"
          >
            {markingPaid ? 'Mentés...' : '✅ Fizetve'}
          </button>
        )}

        {navNeedsUpload && (
          <button
            onClick={handleNavUpload}
            disabled={navLoading}
            className="flex items-center gap-2 bg-surface border border-border hover:border-accent/50 disabled:opacity-50 text-[#F5F5F5] font-semibold px-5 py-2.5 rounded-btn transition-colors text-sm min-h-[44px]"
          >
            {navLoading ? '🏛️ Feltöltés...' : '🏛️ NAV feltöltés'}
          </button>
        )}
      </div>

      {/* NAV feedback */}
      {navLoading && (
        <p className="text-sm text-yellow-300 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-4 py-2">
          NAV feltöltés folyamatban...
        </p>
      )}
      {navResult && (
        <p className={`text-sm rounded-lg px-4 py-2 border ${navResult.ok ? 'text-green-400 bg-green-500/10 border-green-500/20' : 'text-red-400 bg-red-500/10 border-red-500/20'}`}>
          {navResult.message}
        </p>
      )}

      {/* ── Invoice details card ── */}
      <div className="bg-surface border border-border rounded-card p-5 grid grid-cols-1 sm:grid-cols-2 gap-6">

        {/* Left: dates + payment */}
        <div className="flex flex-col gap-3">
          <h2 className="font-bold text-sm text-[#A3A3A3] uppercase tracking-wider">Számla adatok</h2>

          <InfoRow label="Kiállítás dátuma" value={fmtDate(invoice.issue_date)} />
          <InfoRow label="Teljesítés"        value={fmtDate(invoice.issue_date)} />
          <InfoRow label="Fizetési határidő" value={fmtDate(invoice.due_date)} />
          <InfoRow
            label="Fizetési mód"
            value={invoice.payment_method
              ? (PAYMENT_LABELS[invoice.payment_method] ?? invoice.payment_method)
              : '—'}
          />
        </div>

        {/* Right: parties */}
        <div className="flex flex-col gap-4">
          {/* Eladó */}
          <div>
            <p className="text-xs font-semibold text-[#A3A3A3] uppercase tracking-wider mb-2">Eladó</p>
            {masterInfo ? (
              <div className="text-sm flex flex-col gap-1">
                <p className="font-semibold">{masterInfo.name}</p>
                {masterInfo.tax_number && <p className="text-[#A3A3A3]">Adószám: {masterInfo.tax_number}</p>}
                {masterInfo.address    && <p className="text-[#A3A3A3]">{masterInfo.address}</p>}
              </div>
            ) : (
              <p className="text-[#525252] text-sm">—</p>
            )}
          </div>

          {/* Vevő */}
          <div>
            <p className="text-xs font-semibold text-[#A3A3A3] uppercase tracking-wider mb-2">Vevő</p>
            {client ? (
              <div className="text-sm flex flex-col gap-1">
                <Link href={`/dashboard/clients/${client.id}`} className="font-semibold text-accent hover:underline">
                  {client.name}
                </Link>
                {client.address && <p className="text-[#A3A3A3]">{client.address}</p>}
              </div>
            ) : (
              <p className="text-[#525252] text-sm">—</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Tételek ── */}
      <div className="bg-surface border border-border rounded-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-bold">Tételek</h2>
        </div>

        {lineItems.length === 0 ? (
          <p className="text-[#525252] text-sm text-center py-8">Nincs tétel</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-[#A3A3A3] text-xs uppercase tracking-wider">
                  <th className="text-left px-5 py-3 font-semibold">Leírás</th>
                  <th className="text-right px-4 py-3 font-semibold whitespace-nowrap">Menny.</th>
                  <th className="text-right px-4 py-3 font-semibold whitespace-nowrap">Egységár</th>
                  <th className="text-right px-4 py-3 font-semibold">ÁFA%</th>
                  <th className="text-right px-5 py-3 font-semibold">Összeg</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map(item => (
                  <tr key={item.id} className="border-b border-border/50 hover:bg-bg/50 transition-colors">
                    <td className="px-5 py-3 font-medium">{item.description}</td>
                    <td className="px-4 py-3 text-right text-[#A3A3A3]">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="px-4 py-3 text-right text-[#A3A3A3] whitespace-nowrap">
                      {fmtFt(item.unit_price)}
                    </td>
                    <td className="px-4 py-3 text-right text-[#A3A3A3]">{item.vat_rate}%</td>
                    <td className="px-5 py-3 text-right font-semibold whitespace-nowrap">{fmtFt(item.total_gross)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="px-5 py-4 border-t border-border flex flex-col items-end gap-1.5">
              <TotalRow label="Nettó összeg"  value={fmtFt(totalNet)} />
              <TotalRow label="ÁFA összeg"    value={fmtFt(totalVat)} />
              <div className="flex items-center gap-8 mt-1 pt-2 border-t border-border">
                <span className="text-base font-bold">Bruttó összeg</span>
                <span className="text-xl font-black text-accent">{fmtFt(totalGross)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Notes ── */}
      {invoice.notes && (
        <div className="bg-surface border border-border rounded-card p-5">
          <h2 className="font-bold mb-3">Megjegyzés</h2>
          <p className="text-sm text-[#A3A3A3] leading-relaxed whitespace-pre-wrap">{invoice.notes}</p>
        </div>
      )}

    </div>
  );
}

// ─── Small helper components ──────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-sm text-[#A3A3A3] w-36 shrink-0">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-8">
      <span className="text-sm text-[#A3A3A3] w-36 text-right">{label}</span>
      <span className="text-sm font-semibold">{value}</span>
    </div>
  );
}
