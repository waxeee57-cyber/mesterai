'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

type Client = { id: string; name: string; phone: string | null };
type PriceItem = { id: string; name: string; unit: string; unit_price: number; vat_rate: number };
type InvoiceItem = { id: string; description: string; quantity: number; unit: string; unit_price: number; vat_rate: number };

const UNITS = ['db', 'óra', 'm', 'm2', 'm3', 'kg', 'csomag'];
const PAYMENT_METHODS = [
  { value: 'transfer', label: 'Átutalás' },
  { value: 'cash', label: 'Készpénz' },
  { value: 'card', label: 'Bankkártya' },
];

function calcItems(items: InvoiceItem[]) {
  let net = 0, vat = 0;
  items.forEach(i => {
    const lineNet = i.quantity * i.unit_price;
    net += lineNet;
    vat += Math.round(lineNet * (i.vat_rate / 100));
  });
  return { net, vat, gross: net + vat };
}

export default function NewInvoicePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobId = searchParams.get('jobId');
  const supabase = createClient();

  const [masterId, setMasterId] = useState<string | null>(null);
  const [taxType, setTaxType] = useState<string>('afa_kotes');
  const [clients, setClients] = useState<Client[]>([]);
  const [priceItems, setPriceItems] = useState<PriceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [clientId, setClientId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [completionDate, setCompletionDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 8 * 86400000).toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('transfer');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([{ id: crypto.randomUUID(), description: '', quantity: 1, unit: 'db', unit_price: 0, vat_rate: 27 }]);
  const [showPriceList, setShowPriceList] = useState(false);

  const isAAM = taxType === 'kata' || taxType === 'alanyi_mentes';
  const defaultVat = isAAM ? 0 : 27;
  const { net, vat, gross } = calcItems(items);

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }
      const user = session.user;
      let { data: master } = await supabase.from('masters').select('id, tax_type').eq('auth_id', user.id).single();
      if (!master) { const { data: c } = await supabase.from('masters').insert({ auth_id: user.id, name: user.email!.split('@')[0], trade: 'általános', email: user.email }).select('id, tax_type').single(); master = c; }
      if (!master) return;
      setMasterId(master.id);
      setTaxType(master.tax_type ?? 'afa_kotes');
      if (master.tax_type === 'kata' || master.tax_type === 'alanyi_mentes') {
        setItems([{ id: crypto.randomUUID(), description: '', quantity: 1, unit: 'db', unit_price: 0, vat_rate: 0 }]);
      }

      // Generate invoice number
      const year = new Date().getFullYear();
      const { count } = await supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('master_id', master.id);
      const seq = String((count ?? 0) + 1).padStart(4, '0');
      setInvoiceNumber(`MST-${year}-${seq}`);

      const [cls, pls] = await Promise.all([
        supabase.from('clients').select('id, name, phone').eq('master_id', master.id).order('name'),
        supabase.from('price_list').select('id, name, unit, unit_price, vat_rate').eq('master_id', master.id).eq('is_active', true).order('name'),
      ]);
      setClients((cls.data ?? []) as Client[]);
      setPriceItems((pls.data ?? []) as PriceItem[]);

      // Pre-load from job if jobId
      if (jobId) {
        const { data: job } = await supabase.from('jobs').select('client_id, title').eq('id', jobId).single();
        if (job?.client_id) setClientId(job.client_id);
        const { data: jobItems } = await supabase.from('job_items').select('*').eq('job_id', jobId).order('sort_order');
        if (jobItems && jobItems.length > 0) {
          setItems(jobItems.map(i => ({ id: crypto.randomUUID(), description: i.description, quantity: i.quantity, unit: i.unit, unit_price: i.unit_price, vat_rate: i.vat_rate })));
        } else if (job?.title) {
          setItems([{ id: crypto.randomUUID(), description: job.title, quantity: 1, unit: 'db', unit_price: 0, vat_rate: defaultVat }]);
        }
      }
      setLoading(false);
    }
    init();
  }, []);

  const updateItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));
  };
  const addItem = () => setItems(prev => [...prev, { id: crypto.randomUUID(), description: '', quantity: 1, unit: 'db', unit_price: 0, vat_rate: defaultVat }]);
  const removeItem = (id: string) => { if (items.length > 1) setItems(prev => prev.filter(i => i.id !== id)); };
  const addFromPriceList = (p: PriceItem) => {
    setItems(prev => [...prev, { id: crypto.randomUUID(), description: p.name, quantity: 1, unit: p.unit, unit_price: p.unit_price, vat_rate: isAAM ? 0 : p.vat_rate }]);
    setShowPriceList(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!masterId) return;
    setSaving(true); setError('');
    try {
      const { data: inv, error: invErr } = await supabase.from('invoices').insert({
        master_id: masterId,
        client_id: clientId || null,
        job_id: jobId || null,
        invoice_number: invoiceNumber,
        status: 'draft',
        issue_date: issueDate,
        completion_date: completionDate,
        due_date: dueDate,
        payment_method: paymentMethod,
        notes: notes.trim() || null,
        total_net: net,
        total_vat: vat,
        total_gross: gross,
      }).select('id').single();
      if (invErr) throw invErr;

      // Insert items
      if (items.some(i => i.description.trim())) {
        const rows = items.filter(i => i.description.trim()).map((i, idx) => ({
          invoice_id: inv!.id,
          master_id: masterId,
          description: i.description.trim(),
          quantity: i.quantity,
          unit: i.unit,
          unit_price: i.unit_price,
          vat_rate: i.vat_rate,
          sort_order: idx,
        }));
        await supabase.from('invoice_items').insert(rows);
      }

      // Mark job as invoiced
      if (jobId) await supabase.from('jobs').update({ status: 'invoiced' }).eq('id', jobId);

      router.push(`/dashboard/invoices/${inv!.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Mentés sikertelen');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="max-w-2xl mx-auto text-[#A3A3A3] pt-12 text-center">Betöltés...</div>;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/invoices" className="text-[#A3A3A3] hover:text-[#F5F5F5] text-sm">← Vissza</Link>
        <h1 className="text-2xl font-black">Új számla</h1>
      </div>
      {isAAM && (
        <div className="bg-accent/10 border border-accent/30 rounded-card p-3 mb-4 text-sm text-accent">
          ℹ️ Alanyi mentes / KATA — számlán AAM jelzés, ÁFA: 0%
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Header info */}
        <div className="bg-surface border border-border rounded-card p-5 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-[#A3A3A3] mb-1.5">Számlaszám *</label>
            <input type="text" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} required
              className="w-full bg-bg border border-border rounded-input px-3 py-2.5 text-[#F5F5F5] focus:outline-none focus:border-accent transition-colors text-sm" />
          </div>
          <div>
            <label className="block text-sm text-[#A3A3A3] mb-1.5">Ügyfél</label>
            <select value={clientId} onChange={e => setClientId(e.target.value)}
              className="w-full bg-bg border border-border rounded-input px-3 py-2.5 text-[#F5F5F5] focus:outline-none focus:border-accent transition-colors text-sm">
              <option value="">— Válassz —</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-[#A3A3A3] mb-1.5">Kiállítás dátuma</label>
            <input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)}
              className="w-full bg-bg border border-border rounded-input px-3 py-2.5 text-[#F5F5F5] focus:outline-none focus:border-accent transition-colors text-sm" />
          </div>
          <div>
            <label className="block text-sm text-[#A3A3A3] mb-1.5">Teljesítés dátuma</label>
            <input type="date" value={completionDate} onChange={e => setCompletionDate(e.target.value)}
              className="w-full bg-bg border border-border rounded-input px-3 py-2.5 text-[#F5F5F5] focus:outline-none focus:border-accent transition-colors text-sm" />
          </div>
          <div>
            <label className="block text-sm text-[#A3A3A3] mb-1.5">Fizetési határidő</label>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
              className="w-full bg-bg border border-border rounded-input px-3 py-2.5 text-[#F5F5F5] focus:outline-none focus:border-accent transition-colors text-sm" />
          </div>
          <div>
            <label className="block text-sm text-[#A3A3A3] mb-1.5">Fizetési mód</label>
            <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}
              className="w-full bg-bg border border-border rounded-input px-3 py-2.5 text-[#F5F5F5] focus:outline-none focus:border-accent transition-colors text-sm">
              {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
        </div>

        {/* Items */}
        <div className="bg-surface border border-border rounded-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold">Tételek</h3>
            {priceItems.length > 0 && (
              <button type="button" onClick={() => setShowPriceList(!showPriceList)}
                className="text-sm text-accent hover:underline">
                {showPriceList ? 'Bezár' : '📋 Árjegyzékből'}
              </button>
            )}
          </div>

          {showPriceList && (
            <div className="mb-4 border border-border rounded-lg overflow-hidden">
              {priceItems.map(p => (
                <button key={p.id} type="button" onClick={() => addFromPriceList(p)}
                  className="w-full text-left px-4 py-2.5 hover:bg-[#2A2A2A] transition-colors border-b border-border last:border-0 flex justify-between items-center">
                  <span className="text-sm">{p.name}</span>
                  <span className="text-sm text-[#A3A3A3]">{p.unit_price.toLocaleString('hu-HU')} Ft/{p.unit}</span>
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-2">
            {items.map((item, idx) => (
              <div key={item.id} className="grid grid-cols-12 gap-2 items-center">
                <input type="text" value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)}
                  placeholder="Leírás" required
                  className="col-span-12 sm:col-span-4 bg-bg border border-border rounded-input px-3 py-2 text-[#F5F5F5] placeholder-[#525252] focus:outline-none focus:border-accent text-sm" />
                <input type="number" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 1)}
                  min="0.01" step="0.01"
                  className="col-span-3 sm:col-span-2 bg-bg border border-border rounded-input px-2 py-2 text-[#F5F5F5] focus:outline-none focus:border-accent text-sm text-center" />
                <select value={item.unit} onChange={e => updateItem(item.id, 'unit', e.target.value)}
                  className="col-span-3 sm:col-span-2 bg-bg border border-border rounded-input px-2 py-2 text-[#F5F5F5] focus:outline-none focus:border-accent text-sm">
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
                <input type="number" value={item.unit_price} onChange={e => updateItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                  min="0" placeholder="Ár" required
                  className="col-span-4 sm:col-span-2 bg-bg border border-border rounded-input px-2 py-2 text-[#F5F5F5] placeholder-[#525252] focus:outline-none focus:border-accent text-sm" />
                <select value={item.vat_rate} onChange={e => updateItem(item.id, 'vat_rate', parseInt(e.target.value))}
                  disabled={isAAM}
                  className="col-span-3 sm:col-span-1 bg-bg border border-border rounded-input px-1 py-2 text-[#F5F5F5] focus:outline-none focus:border-accent text-sm disabled:opacity-50">
                  {isAAM ? <option value={0}>AAM</option> : [27, 5, 0].map(r => <option key={r} value={r}>{r}%</option>)}
                </select>
                <button type="button" onClick={() => removeItem(item.id)}
                  className="col-span-1 text-[#525252] hover:text-red-400 transition-colors text-center min-h-[36px]">✕</button>
              </div>
            ))}
          </div>

          <button type="button" onClick={addItem}
            className="mt-3 text-sm text-accent hover:underline">+ Tétel hozzáadása</button>

          {/* Summary */}
          {gross > 0 && (
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex justify-end">
                <div className="w-64 text-sm">
                  <div className="flex justify-between text-[#A3A3A3] py-1"><span>Nettó</span><span>{Math.round(net).toLocaleString('hu-HU')} Ft</span></div>
                  <div className="flex justify-between text-[#A3A3A3] py-1"><span>ÁFA</span><span>{Math.round(vat).toLocaleString('hu-HU')} Ft</span></div>
                  <div className="flex justify-between font-black text-accent text-lg border-t border-border pt-2">
                    <span>Bruttó</span><span>{Math.round(gross).toLocaleString('hu-HU')} Ft</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm text-[#A3A3A3] mb-1.5">Megjegyzés</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
            placeholder="pl. Bankszámlaszám, fizetési utasítás..."
            className="w-full bg-surface border border-border rounded-input px-4 py-3 text-[#F5F5F5] placeholder-[#525252] focus:outline-none focus:border-accent transition-colors resize-none text-sm" />
        </div>

        {error && <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-2">{error}</p>}

        <button type="submit" disabled={saving}
          className="w-full bg-accent hover:bg-[#FB923C] disabled:opacity-50 text-white font-bold py-3.5 rounded-btn transition-colors">
          {saving ? 'Mentés...' : 'Számla mentése →'}
        </button>
      </form>
    </div>
  );
}
