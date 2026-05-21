'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

// ─── Types ────────────────────────────────────────────────────────────────────

type Client = { id: string; name: string };

type QuoteItem = {
  id: string;
  description: string;
  qty: string;
  unit: string;
  unitPrice: string;
  vatRate: number;
};

const VAT_RATES = [0, 5, 27];

const UNITS = ['db', 'óra', 'm', 'm²', 'm³', 'kg', 'csomag', 'nap', 'alkalom'];

// ─── Shared styles ────────────────────────────────────────────────────────────

const inputCls =
  'w-full bg-bg border border-border rounded-input px-3 py-2.5 text-[#F5F5F5] placeholder-[#525252] focus:outline-none focus:border-accent transition-colors text-sm';

const labelCls = 'block text-sm font-semibold text-[#A3A3A3] mb-1.5';

// ─── Item row ─────────────────────────────────────────────────────────────────

function ItemRow({
  item,
  onChange,
  onRemove,
  canRemove,
}: {
  item: QuoteItem;
  onChange: (updated: QuoteItem) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const qty = parseFloat(item.qty) || 0;
  const price = parseFloat(item.unitPrice) || 0;
  const net = qty * price;
  const gross = Math.round(net * (1 + item.vatRate / 100));

  return (
    <div className="bg-bg border border-border rounded-card p-4 flex flex-col gap-3">
      <div className="flex gap-2 items-start">
        <div className="flex-1">
          <input
            type="text"
            value={item.description}
            onChange={(e) => onChange({ ...item, description: e.target.value })}
            placeholder="Tétel leírása"
            className={inputCls}
          />
        </div>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-[#A3A3A3] hover:text-red-400 transition-colors px-2 py-2.5 text-sm"
            aria-label="Törlés"
          >
            ✕
          </button>
        )}
      </div>

      <div className="grid grid-cols-4 gap-2">
        <div>
          <label className="text-xs text-[#A3A3A3] mb-1 block">Mennyiség</label>
          <input
            type="number"
            value={item.qty}
            onChange={(e) => onChange({ ...item, qty: e.target.value })}
            placeholder="1"
            min="0"
            className={inputCls}
          />
        </div>
        <div>
          <label className="text-xs text-[#A3A3A3] mb-1 block">Egység</label>
          <select
            value={item.unit}
            onChange={(e) => onChange({ ...item, unit: e.target.value })}
            className={inputCls}
          >
            {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-[#A3A3A3] mb-1 block">Egységár (Ft)</label>
          <input
            type="number"
            value={item.unitPrice}
            onChange={(e) => onChange({ ...item, unitPrice: e.target.value })}
            placeholder="0"
            min="0"
            className={inputCls}
          />
        </div>
        <div>
          <label className="text-xs text-[#A3A3A3] mb-1 block">ÁFA</label>
          <select
            value={item.vatRate}
            onChange={(e) => onChange({ ...item, vatRate: parseInt(e.target.value) })}
            className={inputCls}
          >
            {VAT_RATES.map((r) => <option key={r} value={r}>{r}%</option>)}
          </select>
        </div>
      </div>

      {net > 0 && (
        <div className="flex justify-end gap-4 text-xs text-[#A3A3A3]">
          <span>Nettó: {Math.round(net).toLocaleString('hu-HU')} Ft</span>
          <span className="text-[#F5F5F5] font-semibold">Bruttó: {gross.toLocaleString('hu-HU')} Ft</span>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function createEmptyItem(): QuoteItem {
  return {
    id: crypto.randomUUID(),
    description: '',
    qty: '1',
    unit: 'db',
    unitPrice: '',
    vatRate: 27,
  };
}

export default function NewQuotePage() {
  const router = useRouter();
  const supabase = createClient();

  const [masterId, setMasterId] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [clientId, setClientId] = useState('');
  const [validUntil, setValidUntil] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<QuoteItem[]>([createEmptyItem()]);

  // Totals
  const totalNet = items.reduce((s, item) => {
    const qty = parseFloat(item.qty) || 0;
    const price = parseFloat(item.unitPrice) || 0;
    return s + qty * price;
  }, 0);

  const totalVat = items.reduce((s, item) => {
    const qty = parseFloat(item.qty) || 0;
    const price = parseFloat(item.unitPrice) || 0;
    const net = qty * price;
    return s + Math.round(net * (item.vatRate / 100));
  }, 0);

  const totalGross = totalNet + totalVat;

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }
      const user = session.user;

      let { data: master } = await supabase
        .from('masters')
        .select('id')
        .eq('auth_id', user.id)
        .single();

      if (!master) {
        const { data: created } = await supabase
          .from('masters')
          .insert({ auth_id: user.id, name: user.email!.split('@')[0], trade: 'általános', email: user.email })
          .select('id')
          .single();
        master = created;
      }

      if (master) {
        setMasterId(master.id);
        const { data: cls } = await supabase
          .from('clients')
          .select('id, name')
          .eq('master_id', master.id)
          .order('name');
        setClients(cls ?? []);
      }

      setLoading(false);
    }
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generateQuoteNumber = (): string => {
    const year = new Date().getFullYear();
    const seq = Date.now().toString().slice(-4);
    return `AJ-${year}-${seq}`;
  };

  const handleAddItem = () => setItems((prev) => [...prev, createEmptyItem()]);

  const handleItemChange = (id: string, updated: QuoteItem) =>
    setItems((prev) => prev.map((item) => (item.id === id ? updated : item)));

  const handleRemoveItem = (id: string) =>
    setItems((prev) => prev.filter((item) => item.id !== id));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!masterId) return;
    setSaving(true);
    setError('');

    try {
      const quoteNumber = generateQuoteNumber();
      const { data: quote, error: err } = await supabase.from('quotes').insert({
        master_id: masterId,
        client_id: clientId || null,
        quote_number: quoteNumber,
        status: 'draft',
        valid_until: validUntil || null,
        notes: notes.trim() || null,
        total_net: Math.round(totalNet),
        total_vat: Math.round(totalVat),
        total_gross: Math.round(totalGross),
      }).select('id').single();
      if (err) throw err;

      const validItems = items.filter((item) => item.description.trim());
      if (validItems.length > 0) {
        const itemRows = validItems.map((item, idx) => {
          const qty = parseFloat(item.qty) || 0;
          const price = parseFloat(item.unitPrice) || 0;
          const net = qty * price;
          const gross = Math.round(net * (1 + item.vatRate / 100));
          return {
            quote_id: quote!.id,
            master_id: masterId,
            description: item.description.trim(),
            quantity: qty,
            unit: item.unit,
            unit_price: price,
            vat_rate: item.vatRate,
            total_net: Math.round(net),
            total_gross: gross,
            sort_order: idx,
          };
        });
        const { error: itemErr } = await supabase.from('quote_items').insert(itemRows);
        if (itemErr) throw itemErr;
      }

      router.push('/dashboard/quotes');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Mentés sikertelen');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto text-[#A3A3A3] pt-12 text-center">Betöltés...</div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/quotes" className="text-[#A3A3A3] hover:text-[#F5F5F5] text-sm">
          ← Vissza
        </Link>
        <h1 className="text-2xl font-black">Új árajánlat</h1>
      </div>

      {/* Template note */}
      <div className="bg-[#F97316]/5 border border-[#F97316]/20 rounded-card p-4 mb-6 text-sm text-[#A3A3A3]">
        💡 <strong className="text-[#F5F5F5]">Sablon másolása</strong> — hamarosan elérhető lesz a gyakran használt tételek sablonként való mentése és újrahasználata.
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Client + valid until */}
        <div className="bg-surface border border-border rounded-card p-6 flex flex-col gap-4">
          <div>
            <label className={labelCls}>Ügyfél</label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className={inputCls}
            >
              <option value="">— Válassz ügyfelet —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {clients.length === 0 && (
              <p className="text-xs text-[#525252] mt-1">
                Még nincs ügyfeled.{' '}
                <Link href="/dashboard/clients/new" className="text-accent hover:underline">
                  Adj hozzá egyet →
                </Link>
              </p>
            )}
          </div>

          <div>
            <label className={labelCls}>Érvényesség dátuma</label>
            <input
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        {/* Items */}
        <div>
          <h2 className="text-sm font-bold text-[#A3A3A3] mb-3 uppercase tracking-wide">Tételek</h2>
          <div className="flex flex-col gap-3">
            {items.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                onChange={(updated) => handleItemChange(item.id, updated)}
                onRemove={() => handleRemoveItem(item.id)}
                canRemove={items.length > 1}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={handleAddItem}
            className="mt-3 w-full border border-dashed border-[#2A2A2A] hover:border-accent/50 text-[#A3A3A3] hover:text-[#F5F5F5] font-medium py-3 rounded-card transition-colors text-sm"
          >
            + Tétel hozzáadása
          </button>
        </div>

        {/* Totals */}
        {totalGross > 0 && (
          <div className="bg-surface border border-border rounded-card p-5 text-sm">
            <div className="flex justify-between text-[#A3A3A3] mb-2">
              <span>Nettó összesen</span>
              <span>{Math.round(totalNet).toLocaleString('hu-HU')} Ft</span>
            </div>
            <div className="flex justify-between text-[#A3A3A3] mb-2">
              <span>ÁFA összesen</span>
              <span>{Math.round(totalVat).toLocaleString('hu-HU')} Ft</span>
            </div>
            <div className="flex justify-between font-black text-[#F5F5F5] border-t border-border pt-3">
              <span>Bruttó összesen</span>
              <span className="text-accent text-lg">{Math.round(totalGross).toLocaleString('hu-HU')} Ft</span>
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="bg-surface border border-border rounded-card p-6">
          <label className={labelCls}>Megjegyzés (opcionális)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="pl. Az árajánlat tartalmaz anyag- és munkadíjat is."
            className={`${inputCls} resize-none`}
          />
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-2">{error}</p>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={saving || totalGross <= 0}
          className="w-full bg-accent hover:bg-[#FB923C] disabled:opacity-50 text-white font-bold py-3.5 rounded-btn transition-colors"
        >
          {saving ? 'Mentés...' : 'Árajánlat mentése →'}
        </button>
      </form>
    </div>
  );
}
