'use client';

import dynamic from 'next/dynamic';
import { createClient } from '@/lib/supabase/client';
import { useEffect, useState, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

type ChartMonth = { month: string; paid: number; pending: number };

type TopClient = { name: string; total: number };

type InvoiceRow = {
  id: string;
  status: string;
  issue_date: string | null;
  total_gross: number | null;
  client_id: string | null;
  clients: { name: string } | null;
};

type StatsData = {
  currentMonthPaid: number;
  currentMonthUnpaid: number;
  paidCount: number;
  paidAvg: number;
  openCount: number;
  chartData: ChartMonth[];
  topClients: TopClient[];
  allInvoices: InvoiceRow[];
};

// ─── Hungarian month abbreviations ────────────────────────────────────────────

const HU_MONTHS = ['Jan', 'Feb', 'Már', 'Ápr', 'Máj', 'Jún', 'Júl', 'Aug', 'Szep', 'Okt', 'Nov', 'Dec'];

// ─── RevenueChart (client component) ─────────────────────────────────────────

const RevenueChartDynamic = dynamic(
  () => import('recharts').then((recharts) => {
    const { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } = recharts;

    function RevenueChart({ data }: { data: ChartMonth[] }) {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <XAxis dataKey="month" tick={{ fill: '#A3A3A3', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fill: '#A3A3A3', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => v >= 1000 ? `${Math.round(v / 1000)}e` : String(v)}
            />
            <Tooltip
              contentStyle={{ background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 8, color: '#F5F5F5' }}
              formatter={(value: number) => [`${Math.round(value).toLocaleString('hu-HU')} Ft`]}
            />
            <Legend
              formatter={(value: string) => value === 'paid' ? 'Fizetve' : 'Függőben'}
              wrapperStyle={{ color: '#A3A3A3', fontSize: 12 }}
            />
            <Bar dataKey="paid" name="paid" fill="#F97316" radius={[4, 4, 0, 0]} />
            <Bar dataKey="pending" name="pending" fill="#A3A3A3" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    return RevenueChart;
  }),
  { ssr: false, loading: () => <div className="h-[300px] flex items-center justify-center text-[#A3A3A3]">Grafikon betöltése...</div> }
);

// ─── ExportButton (client sub-component) ──────────────────────────────────────

function ExportButton({ invoices }: { invoices: InvoiceRow[] }) {
  const handleExport = () => {
    const header = ['Számlaszám', 'Ügyfél', 'Dátum', 'Státusz', 'Bruttó (Ft)'];
    // invoices don't carry invoice_number in this query so we use id prefix
    const rows = invoices.map((inv) => [
      inv.id.slice(0, 8),
      inv.clients?.name ?? '',
      inv.issue_date ?? '',
      inv.status,
      String(Math.round(inv.total_gross ?? 0)),
    ]);
    const csv = [header, ...rows].map((r) => r.map((cell) => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `szamlak-${new Date().toISOString().slice(0, 7)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      className="border border-[#2A2A2A] hover:border-[#F97316] hover:text-[#F97316] text-[#A3A3A3] font-semibold px-5 py-2.5 rounded-btn transition-colors text-sm"
    >
      ⬇ Letöltés CSV-be
    </button>
  );
}

// ─── Main page (client component, SSR-safe) ────────────────────────────────────

export default function RevenuePage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [noMaster, setNoMaster] = useState(false);

  const supabase = createClient();

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); setNoMaster(true); return; }

    const { data: master } = await supabase
      .from('masters')
      .select('id')
      .eq('auth_id', user.id)
      .single();

    if (!master) { setLoading(false); setNoMaster(true); return; }

    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

    const { data: allInvoices } = await supabase
      .from('invoices')
      .select('id, status, issue_date, total_gross, client_id, clients(name)')
      .eq('master_id', master.id);

    const safe = (allInvoices ?? []) as unknown as InvoiceRow[];

    // Current month paid
    const currentMonthPaid = safe
      .filter((i) => i.status === 'paid' && i.issue_date && i.issue_date >= firstOfMonth)
      .reduce((s, i) => s + (i.total_gross ?? 0), 0);

    // Unpaid (draft + sent)
    const currentMonthUnpaid = safe
      .filter((i) => i.status === 'draft' || i.status === 'sent')
      .reduce((s, i) => s + (i.total_gross ?? 0), 0);

    // Paid this month count + avg
    const paidThisMonth = safe.filter(
      (i) => i.status === 'paid' && i.issue_date && i.issue_date >= firstOfMonth
    );
    const paidCount = paidThisMonth.length;
    const paidAvg = paidCount > 0 ? paidThisMonth.reduce((s, i) => s + (i.total_gross ?? 0), 0) / paidCount : 0;

    // Open count
    const openCount = safe.filter((i) => i.status === 'draft' || i.status === 'sent').length;

    // Chart: last 6 months
    const chartData: ChartMonth[] = [];
    for (let offset = 5; offset >= 0; offset--) {
      const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthInvoices = safe.filter((i) => i.issue_date?.startsWith(yearMonth));
      const paid = monthInvoices.filter((i) => i.status === 'paid').reduce((s, i) => s + (i.total_gross ?? 0), 0);
      const pending = monthInvoices.filter((i) => i.status === 'draft' || i.status === 'sent').reduce((s, i) => s + (i.total_gross ?? 0), 0);
      chartData.push({ month: HU_MONTHS[d.getMonth()], paid, pending });
    }

    // Top 5 clients
    const clientMap = new Map<string, { name: string; total: number }>();
    safe
      .filter((i) => i.status === 'paid' && i.client_id)
      .forEach((i) => {
        const cid = i.client_id!;
        const existing = clientMap.get(cid);
        if (existing) {
          existing.total += i.total_gross ?? 0;
        } else {
          clientMap.set(cid, { name: i.clients?.name ?? 'Ismeretlen', total: i.total_gross ?? 0 });
        }
      });
    const topClients = Array.from(clientMap.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    setStats({ currentMonthPaid, currentMonthUnpaid, paidCount, paidAvg, openCount, chartData, topClients, allInvoices: safe });
    setLoading(false);
  }, [supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto flex items-center justify-center pt-24 text-[#A3A3A3]">
        Betöltés...
      </div>
    );
  }

  if (noMaster || !stats) {
    return (
      <div className="max-w-4xl mx-auto pt-24 text-center">
        <p className="text-[#A3A3A3]">Nincs adat</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-[#A3A3A3] text-sm font-medium mb-1">Havi bevétel</p>
          <p className="text-5xl font-black text-[#F97316] leading-none">
            {Math.round(stats.currentMonthPaid).toLocaleString('hu-HU')} Ft
          </p>
          <p className="text-[#A3A3A3] text-sm mt-2">
            Kifizetetlen: <span className="text-[#F5F5F5] font-semibold">{Math.round(stats.currentMonthUnpaid).toLocaleString('hu-HU')} Ft</span>
          </p>
        </div>
        <ExportButton invoices={stats.allInvoices} />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Számlák száma (db)', value: String(stats.paidCount) },
          { label: 'Átlagos számla', value: `${Math.round(stats.paidAvg).toLocaleString('hu-HU')} Ft` },
          { label: 'Nyitott tételek', value: String(stats.openCount) },
        ].map((card) => (
          <div key={card.label} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-card p-5">
            <p className="text-2xl font-black text-[#F5F5F5]">{card.value}</p>
            <p className="text-sm text-[#A3A3A3] mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-card p-6 mb-8">
        <h2 className="text-base font-bold mb-4">Bevétel — elmúlt 6 hónap</h2>
        <RevenueChartDynamic data={stats.chartData} />
      </div>

      {/* Top 5 clients */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-card p-6">
        <h2 className="text-base font-bold mb-4">Top 5 ügyfél</h2>
        {stats.topClients.length === 0 ? (
          <p className="text-[#A3A3A3] text-sm">Nincs adat</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[#A3A3A3] text-left border-b border-[#2A2A2A]">
                <th className="pb-3 font-medium">#</th>
                <th className="pb-3 font-medium">Ügyfél</th>
                <th className="pb-3 font-medium text-right">Összes befizetés</th>
              </tr>
            </thead>
            <tbody>
              {stats.topClients.map((client, idx) => (
                <tr key={client.name} className="border-b border-[#2A2A2A] last:border-0">
                  <td className="py-3 text-[#A3A3A3]">{idx + 1}</td>
                  <td className="py-3 font-medium">{client.name}</td>
                  <td className="py-3 text-right text-[#F97316] font-semibold">
                    {Math.round(client.total).toLocaleString('hu-HU')} Ft
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
