'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

const VAT_RATES = [0, 5, 27];

export default function NewInvoicePage() {
  const router = useRouter();
  const supabase = createClient();

  const [masterId, setMasterId] = useState<string | null>(null);
  const [clients, setClients] = useState<{ id: string; name: string; phone: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [clientId, setClientId] = useState('');
  const [description, setDescription] = useState('');
  const [netAmount, setNetAmount] = useState('');
  const [vatRate, setVatRate] = useState(27);

  const net = parseFloat(netAmount) || 0;
  const vat = Math.round(net * (vatRate / 100));
  const gross = net + vat;

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

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
          .select('id, name, phone')
          .eq('master_id', master.id)
          .order('name');
        setClients(cls ?? []);
      }

      setLoading(false);
    }
    init();
  }, []);

  const generateInvoiceNumber = () => {
    const year = new Date().getFullYear();
    const seq = Date.now().toString().slice(-4);
    return `SZ-${year}-${seq}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!masterId) return;
    setSaving(true);
    setError('');

    try {
      const invoiceNumber = generateInvoiceNumber();
      const { error: err } = await supabase.from('invoices').insert({
        master_id: masterId,
        client_id: clientId || null,
        invoice_number: invoiceNumber,
        status: 'draft',
        issue_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: description.trim() || null,
        total_net: net,
        total_vat: vat,
        total_gross: gross,
      });
      if (err) throw err;
      router.push('/dashboard/invoices');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Mentés sikertelen');
    } finally {
      setSaving(false);
    }
  };

  const selectedClient = clients.find(c => c.id === clientId);

  const handleWhatsApp = () => {
    if (!selectedClient?.phone) return;
    const phone = selectedClient.phone.replace(/\D/g, '').replace(/^06/, '36');
    const text = encodeURIComponent(
      `Kedves ${selectedClient.name}!\n\nElkészült a számla: ${description}\nÖsszeg: ${Math.round(gross).toLocaleString('hu-HU')} Ft\n\nKöszönöm a bizalmat!`
    );
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
  };

  if (loading) return <div className="max-w-lg mx-auto text-[#A3A3A3] pt-12 text-center">Betöltés...</div>;

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/invoices" className="text-[#A3A3A3] hover:text-[#F5F5F5] text-sm">← Vissza</Link>
        <h1 className="text-2xl font-black">Új számla</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-card p-6 flex flex-col gap-4">
        <div>
          <label className="block text-sm font-semibold text-[#A3A3A3] mb-1.5">Ügyfél</label>
          <select
            value={clientId}
            onChange={e => setClientId(e.target.value)}
            className="w-full bg-bg border border-border rounded-input px-4 py-3 text-[#F5F5F5] focus:outline-none focus:border-accent transition-colors"
          >
            <option value="">— Válassz ügyfelet —</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {clients.length === 0 && (
            <p className="text-xs text-[#525252] mt-1">
              Még nincs ügyfeled. <Link href="/dashboard/clients/new" className="text-accent hover:underline">Adj hozzá egyet →</Link>
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-[#A3A3A3] mb-1.5">Tétel leírása *</label>
          <input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="pl. Villanyszerelési munkadíj"
            required
            className="w-full bg-bg border border-border rounded-input px-4 py-3 text-[#F5F5F5] placeholder-[#525252] focus:outline-none focus:border-accent transition-colors"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-[#A3A3A3] mb-1.5">Nettó összeg (Ft) *</label>
            <input
              type="number"
              value={netAmount}
              onChange={e => setNetAmount(e.target.value)}
              placeholder="0"
              min="0"
              required
              className="w-full bg-bg border border-border rounded-input px-4 py-3 text-[#F5F5F5] placeholder-[#525252] focus:outline-none focus:border-accent transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#A3A3A3] mb-1.5">ÁFA kulcs</label>
            <select
              value={vatRate}
              onChange={e => setVatRate(parseInt(e.target.value))}
              className="w-full bg-bg border border-border rounded-input px-4 py-3 text-[#F5F5F5] focus:outline-none focus:border-accent transition-colors"
            >
              {VAT_RATES.map(r => (
                <option key={r} value={r}>{r}%</option>
              ))}
            </select>
          </div>
        </div>

        {net > 0 && (
          <div className="bg-bg border border-border rounded-lg p-4 text-sm">
            <div className="flex justify-between text-[#A3A3A3]">
              <span>Nettó</span>
              <span>{Math.round(net).toLocaleString('hu-HU')} Ft</span>
            </div>
            <div className="flex justify-between text-[#A3A3A3]">
              <span>ÁFA ({vatRate}%)</span>
              <span>{vat.toLocaleString('hu-HU')} Ft</span>
            </div>
            <div className="flex justify-between font-bold text-[#F5F5F5] border-t border-border mt-2 pt-2">
              <span>Bruttó</span>
              <span className="text-accent">{Math.round(gross).toLocaleString('hu-HU')} Ft</span>
            </div>
          </div>
        )}

        {error && (
          <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-2">{error}</p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-accent hover:bg-[#FB923C] disabled:opacity-50 text-white font-bold py-3.5 rounded-btn transition-colors"
        >
          {saving ? 'Mentés...' : 'Számla mentése →'}
        </button>

        {selectedClient?.phone && (
          <button
            type="button"
            onClick={handleWhatsApp}
            className="w-full border border-[#25D366] hover:bg-[#25D366]/10 text-[#25D366] font-semibold py-3 rounded-btn transition-colors text-sm"
          >
            💬 WhatsApp küldés — {selectedClient.name}
          </button>
        )}
      </form>
    </div>
  );
}
