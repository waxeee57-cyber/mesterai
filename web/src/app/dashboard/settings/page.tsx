'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

const TRADES = [
  'Villanyszerelő', 'Vízvezetékszerelő', 'Festő-mázoló', 'Ács', 'Kőműves',
  'Burkoló', 'Lakatos', 'Asztalos', 'Gépész', 'Tetőfedő', 'Általános',
];

export default function SettingsPage() {
  const supabase = createClient();

  const [masterId, setMasterId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [trade, setTrade] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [address, setAddress] = useState('');
  const [bankAccount, setBankAccount] = useState('');

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let { data: master } = await supabase
        .from('masters')
        .select('id, name, phone, trade, company_name, tax_number, address, bank_account')
        .eq('auth_id', user.id)
        .single();

      if (!master) {
        const { data: created } = await supabase
          .from('masters')
          .insert({ auth_id: user.id, name: user.email!.split('@')[0], trade: 'általános', email: user.email })
          .select('id, name, phone, trade, company_name, tax_number, address, bank_account')
          .single();
        master = created;
      }

      if (master) {
        setMasterId(master.id);
        setName(master.name ?? '');
        setPhone(master.phone ?? '');
        setTrade(master.trade ?? '');
        setCompanyName(master.company_name ?? '');
        setTaxNumber(master.tax_number ?? '');
        setAddress(master.address ?? '');
        setBankAccount(master.bank_account ?? '');
      }

      setLoading(false);
    }
    init();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!masterId) return;
    setSaving(true);
    setSaved(false);
    setError('');

    try {
      const { error: err } = await supabase
        .from('masters')
        .update({
          name: name.trim(),
          phone: phone.trim() || null,
          trade: trade || 'általános',
          company_name: companyName.trim() || null,
          tax_number: taxNumber.trim() || null,
          address: address.trim() || null,
          bank_account: bankAccount.trim() || null,
        })
        .eq('id', masterId);

      if (err) throw err;
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Mentés sikertelen');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="max-w-lg mx-auto text-[#A3A3A3] pt-12 text-center">Betöltés...</div>;

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard" className="text-[#A3A3A3] hover:text-[#F5F5F5] text-sm">← Főoldal</Link>
        <h1 className="text-2xl font-black">Beállítások</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-card p-6 flex flex-col gap-4">
        <h2 className="font-bold text-[#A3A3A3] text-xs uppercase tracking-wider">Személyes adatok</h2>

        <div>
          <label className="block text-sm font-semibold text-[#A3A3A3] mb-1.5">Teljes név *</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="pl. Kovács János"
            required
            className="w-full bg-bg border border-border rounded-input px-4 py-3 text-[#F5F5F5] placeholder-[#525252] focus:outline-none focus:border-accent transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-[#A3A3A3] mb-1.5">Telefon</label>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="+36 30 123 4567"
            className="w-full bg-bg border border-border rounded-input px-4 py-3 text-[#F5F5F5] placeholder-[#525252] focus:outline-none focus:border-accent transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-[#A3A3A3] mb-1.5">Szakma</label>
          <select
            value={trade}
            onChange={e => setTrade(e.target.value)}
            className="w-full bg-bg border border-border rounded-input px-4 py-3 text-[#F5F5F5] focus:outline-none focus:border-accent transition-colors"
          >
            {TRADES.map(t => (
              <option key={t} value={t.toLowerCase()}>{t}</option>
            ))}
          </select>
        </div>

        <div className="border-t border-border pt-4">
          <h2 className="font-bold text-[#A3A3A3] text-xs uppercase tracking-wider mb-4">Vállalkozási adatok</h2>
        </div>

        <div>
          <label className="block text-sm font-semibold text-[#A3A3A3] mb-1.5">Vállalkozás neve</label>
          <input
            type="text"
            value={companyName}
            onChange={e => setCompanyName(e.target.value)}
            placeholder="pl. Kovács János E.V."
            className="w-full bg-bg border border-border rounded-input px-4 py-3 text-[#F5F5F5] placeholder-[#525252] focus:outline-none focus:border-accent transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-[#A3A3A3] mb-1.5">Adószám</label>
          <input
            type="text"
            value={taxNumber}
            onChange={e => setTaxNumber(e.target.value)}
            placeholder="12345678-1-11"
            className="w-full bg-bg border border-border rounded-input px-4 py-3 text-[#F5F5F5] placeholder-[#525252] focus:outline-none focus:border-accent transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-[#A3A3A3] mb-1.5">Cím</label>
          <input
            type="text"
            value={address}
            onChange={e => setAddress(e.target.value)}
            placeholder="pl. 1234 Budapest, Kossuth u. 10."
            className="w-full bg-bg border border-border rounded-input px-4 py-3 text-[#F5F5F5] placeholder-[#525252] focus:outline-none focus:border-accent transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-[#A3A3A3] mb-1.5">Bankszámlaszám</label>
          <input
            type="text"
            value={bankAccount}
            onChange={e => setBankAccount(e.target.value)}
            placeholder="12345678-12345678-12345678"
            className="w-full bg-bg border border-border rounded-input px-4 py-3 text-[#F5F5F5] placeholder-[#525252] focus:outline-none focus:border-accent transition-colors"
          />
        </div>

        {error && (
          <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-2">{error}</p>
        )}

        {saved && (
          <p className="text-sm text-green-400 bg-green-400/10 border border-green-400/20 rounded-lg px-4 py-2">
            ✓ Adatok sikeresen mentve!
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-accent hover:bg-[#FB923C] disabled:opacity-50 text-white font-bold py-3.5 rounded-btn transition-colors"
        >
          {saving ? 'Mentés...' : 'Beállítások mentése →'}
        </button>
      </form>
    </div>
  );
}
