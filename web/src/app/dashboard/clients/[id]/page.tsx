'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClientRecord {
  id: string;
  master_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  jobs_count: number;
  total_revenue: number;
}

interface JobRow {
  id: string;
  title: string;
  status: string;
  scheduled_at: string | null;
  created_at: string;
}

interface InvoiceRow {
  id: string;
  invoice_number: string;
  status: string;
  total_gross: number | null;
  created_at: string;
}

// ─── Status badges ────────────────────────────────────────────────────────────

const JOB_STATUS: Record<string, { label: string; color: string }> = {
  new:         { label: 'Új',          color: 'bg-blue-500/20 text-blue-300' },
  in_progress: { label: 'Folyamatban', color: 'bg-yellow-500/20 text-yellow-300' },
  done:        { label: 'Kész',        color: 'bg-green-500/20 text-green-300' },
  invoiced:    { label: 'Számlázva',   color: 'bg-orange-500/20 text-orange-300' },
  cancelled:   { label: 'Törölve',     color: 'bg-red-500/20 text-red-300' },
};

const INV_STATUS: Record<string, { label: string; color: string }> = {
  draft:   { label: 'Vázlat',   color: 'bg-[#2A2A2A] text-[#A3A3A3]' },
  sent:    { label: 'Kiküldve', color: 'bg-blue-500/20 text-blue-300' },
  paid:    { label: 'Fizetve',  color: 'bg-green-600/20 text-green-400' },
  overdue: { label: 'Lejárt',   color: 'bg-red-500/20 text-red-300' },
};

function JobBadge({ status }: { status: string }) {
  const m = JOB_STATUS[status] ?? { label: status, color: 'bg-[#2A2A2A] text-[#A3A3A3]' };
  return <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${m.color}`}>{m.label}</span>;
}

function InvBadge({ status }: { status: string }) {
  const m = INV_STATUS[status] ?? { label: status, color: 'bg-[#2A2A2A] text-[#A3A3A3]' };
  return <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${m.color}`}>{m.label}</span>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function normalizePhone(phone: string): string {
  // Remove spaces, dashes, parentheses; ensure leading + for international
  let p = phone.replace(/[\s\-().]/g, '');
  if (p.startsWith('06')) p = '+36' + p.slice(2);
  if (!p.startsWith('+')) p = '+' + p;
  return p;
}

function fmtFt(n: number): string {
  return `${Math.round(n).toLocaleString('hu-HU')} Ft`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('hu-HU');
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ClientDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [client, setClient] = useState<ClientRecord | null>(null);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }

    const { data: master } = await supabase
      .from('masters')
      .select('id, tax_type')
      .eq('auth_id', user.id)
      .single();

    if (!master) { setError('Mester profil nem található'); setLoading(false); return; }

    const { data: clientData, error: cErr } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .eq('master_id', master.id)
      .single();

    if (cErr || !clientData) {
      setError('Az ügyfél nem található vagy nincs hozzáférésed.');
      setLoading(false);
      return;
    }

    const [{ data: jobData }, { data: invData }] = await Promise.all([
      supabase
        .from('jobs')
        .select('id, title, status, scheduled_at, created_at')
        .eq('client_id', id)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('invoices')
        .select('id, invoice_number, status, total_gross, created_at')
        .eq('client_id', id)
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    setClient(clientData as ClientRecord);
    setJobs((jobData ?? []) as JobRow[]);
    setInvoices((invData ?? []) as InvoiceRow[]);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="max-w-2xl mx-auto pt-12 text-center">
        <p className="text-red-400 text-lg mb-4">{error ?? 'Ismeretlen hiba'}</p>
        <Link href="/dashboard/clients" className="text-accent hover:underline">← Vissza az ügyfelekhez</Link>
      </div>
    );
  }

  const waPhone = client.phone ? normalizePhone(client.phone) : null;

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6">

      {/* ── Header ── */}
      <div>
        <Link href="/dashboard/clients" className="text-[#A3A3A3] hover:text-[#F5F5F5] text-sm inline-flex items-center gap-1 mb-4">
          ← Ügyfelek
        </Link>

        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center text-accent font-black text-xl shrink-0">
            {getInitials(client.name)}
          </div>
          <div>
            <h1 className="text-2xl font-black">{client.name}</h1>
            <p className="text-[#A3A3A3] text-sm mt-1">
              {client.jobs_count} munka
              {client.total_revenue > 0 && (
                <span> · <span className="text-accent font-semibold">{fmtFt(client.total_revenue)} bevétel</span></span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* ── Contact buttons ── */}
      <div className="flex flex-wrap gap-3">
        {client.phone && (
          <a
            href={`tel:${client.phone}`}
            className="flex items-center gap-2 bg-surface border border-border hover:border-accent/50 text-[#F5F5F5] font-semibold px-5 py-2.5 rounded-btn transition-colors text-sm min-h-[44px]"
          >
            📞 Hívás
          </a>
        )}
        {waPhone && (
          <button
            onClick={() => window.open(`https://wa.me/${waPhone.replace('+', '')}`, '_blank')}
            className="flex items-center gap-2 bg-surface border border-border hover:border-accent/50 text-[#F5F5F5] font-semibold px-5 py-2.5 rounded-btn transition-colors text-sm min-h-[44px]"
          >
            💬 WhatsApp
          </button>
        )}
        {client.email && (
          <a
            href={`mailto:${client.email}`}
            className="flex items-center gap-2 bg-surface border border-border hover:border-accent/50 text-[#F5F5F5] font-semibold px-5 py-2.5 rounded-btn transition-colors text-sm min-h-[44px]"
          >
            ✉️ Email
          </a>
        )}
      </div>

      {/* ── Info card ── */}
      <div className="bg-surface border border-border rounded-card p-5 flex flex-col gap-3">
        <h2 className="font-bold text-base mb-1">Elérhetőség</h2>

        <div className="flex items-start gap-3">
          <span className="text-[#A3A3A3] text-sm w-20 shrink-0">Telefon</span>
          {client.phone ? (
            <a href={`tel:${client.phone}`} className="text-sm hover:text-accent transition-colors">{client.phone}</a>
          ) : (
            <span className="text-[#525252] text-sm">—</span>
          )}
        </div>

        <div className="flex items-start gap-3">
          <span className="text-[#A3A3A3] text-sm w-20 shrink-0">Email</span>
          {client.email ? (
            <a href={`mailto:${client.email}`} className="text-sm hover:text-accent transition-colors">{client.email}</a>
          ) : (
            <span className="text-[#525252] text-sm">—</span>
          )}
        </div>

        <div className="flex items-start gap-3">
          <span className="text-[#A3A3A3] text-sm w-20 shrink-0">Cím</span>
          <span className="text-sm">{client.address ?? <span className="text-[#525252]">—</span>}</span>
        </div>
      </div>

      {/* ── Jobs list ── */}
      <div className="bg-surface border border-border rounded-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-base">Munkák</h2>
          <Link
            href={`/dashboard/jobs/new?clientId=${id}`}
            className="text-sm text-accent hover:underline font-semibold"
          >
            + Új munka ennek az ügyfélnek
          </Link>
        </div>

        {jobs.length === 0 ? (
          <p className="text-[#525252] text-sm text-center py-6">Még nincs munka</p>
        ) : (
          <div className="flex flex-col gap-2">
            {jobs.map(job => (
              <Link
                key={job.id}
                href={`/dashboard/jobs/${job.id}`}
                className="flex items-center justify-between bg-bg hover:bg-surface2 rounded-input px-4 py-3 transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-medium text-sm truncate">{job.title}</span>
                  <JobBadge status={job.status} />
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-[#A3A3A3]">
                    {job.scheduled_at ? fmtDate(job.scheduled_at) : fmtDate(job.created_at)}
                  </span>
                  <span className="text-accent text-sm group-hover:underline">→</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* ── Invoices list ── */}
      <div className="bg-surface border border-border rounded-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-base">Számlák</h2>
        </div>

        {invoices.length === 0 ? (
          <p className="text-[#525252] text-sm text-center py-6">Még nincs számla</p>
        ) : (
          <div className="flex flex-col gap-2">
            {invoices.map(inv => (
              <Link
                key={inv.id}
                href={`/dashboard/invoices/${inv.id}`}
                className="flex items-center justify-between bg-bg hover:bg-surface2 rounded-input px-4 py-3 transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-medium text-sm truncate">{inv.invoice_number}</span>
                  <InvBadge status={inv.status} />
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {inv.total_gross != null && (
                    <span className="text-accent font-semibold text-sm">{fmtFt(inv.total_gross)}</span>
                  )}
                  <span className="text-accent text-sm group-hover:underline">→</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
