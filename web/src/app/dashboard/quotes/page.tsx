import { createClient } from '@/lib/supabase/server';
import { getOrCreateMaster } from '@/lib/supabase/getMaster';
import Link from 'next/link';

// ─── Types ────────────────────────────────────────────────────────────────────

type QuoteRow = {
  id: string;
  quote_number: string;
  status: string;
  valid_until: string | null;
  total_gross: number | null;
  clients: { name: string } | null;
};

// ─── Status badge config ──────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft:    { label: 'Vázlat',     color: 'bg-[#2A2A2A] text-[#A3A3A3]' },
  sent:     { label: 'Kiküldve',   color: 'bg-blue-500/20 text-blue-300' },
  accepted: { label: 'Elfogadva',  color: 'bg-green-500/20 text-green-300' },
  rejected: { label: 'Elutasítva', color: 'bg-red-500/20 text-red-300' },
  expired:  { label: 'Lejárt',     color: 'bg-[#F97316]/20 text-[#F97316]' },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function QuotesPage() {
  const supabase = await createClient();
  const master = await getOrCreateMaster();

  const quotes: QuoteRow[] = master
    ? ((await supabase
        .from('quotes')
        .select('id, quote_number, status, valid_until, total_gross, clients(name)')
        .eq('master_id', master.id)
        .order('created_at', { ascending: false })
      ).data ?? []) as unknown as QuoteRow[]
    : [];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black">Árajánlatok</h1>
        <Link
          href="/dashboard/quotes/new"
          className="bg-accent hover:bg-[#FB923C] text-white font-semibold px-5 py-2.5 rounded-btn transition-colors text-sm"
        >
          + Új árajánlat
        </Link>
      </div>

      {/* Empty state */}
      {quotes.length === 0 ? (
        <div className="bg-surface border border-border rounded-card p-12 text-center">
          <div className="text-5xl mb-4">📋</div>
          <h2 className="text-lg font-bold mb-2">Még nincs árajánlat</h2>
          <p className="text-[#A3A3A3] text-sm mb-6">Készítsd el az elsőt!</p>
          <Link
            href="/dashboard/quotes/new"
            className="inline-flex bg-accent hover:bg-[#FB923C] text-white font-semibold px-6 py-3 rounded-btn transition-colors text-sm"
          >
            + Új árajánlat
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {quotes.map((quote) => {
            const st = STATUS_CONFIG[quote.status] ?? { label: quote.status, color: 'bg-[#2A2A2A] text-[#A3A3A3]' };
            const isExpired =
              quote.valid_until &&
              new Date(quote.valid_until) < new Date() &&
              quote.status !== 'accepted' &&
              quote.status !== 'rejected';

            return (
              <Link
                key={quote.id}
                href={`/dashboard/quotes/${quote.id}`}
                className="bg-surface border border-border rounded-card p-5 flex items-center justify-between hover:border-accent/30 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-semibold">{quote.quote_number}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.color}`}>
                      {st.label}
                    </span>
                    {isExpired && quote.status === 'sent' && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-[#F97316]/20 text-[#F97316]">
                        Lejárt
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-[#A3A3A3] flex gap-3">
                    {quote.clients && <span>👤 {quote.clients.name}</span>}
                    {quote.valid_until && (
                      <span>⏳ Érvényes: {new Date(quote.valid_until).toLocaleDateString('hu-HU')}</span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-accent">
                    {quote.total_gross != null
                      ? `${Math.round(quote.total_gross).toLocaleString('hu-HU')} Ft`
                      : '—'}
                  </p>
                  <p className="text-xs text-[#A3A3A3] mt-0.5">bruttó</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
