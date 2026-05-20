'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

const TRADES = ['villanyszerelő', 'vízvezetékszerelő', 'festő-mázoló', 'ács', 'kőműves', 'burkoló', 'lakatos', 'asztalos', 'gépész', 'tetőfedő', 'általános'];
const TAX_TYPES = [
  { value: 'afa_kotes', label: 'ÁFA körös', desc: '27% ÁFA' },
  { value: 'kata', label: 'KATA', desc: 'Kisadózó' },
  { value: 'alanyi_mentes', label: 'Alanyi mentes', desc: 'AAM jelzés' },
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
  const [taxType, setTaxType] = useState('afa_kotes');
  const [address, setAddress] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [navConfigured, setNavConfigured] = useState(false);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      let { data: master } = await supabase
        .from('masters')
        .select('id, name, phone, trade, company_name, tax_number, tax_type, address, bank_account, nav_username')
        .eq('auth_id', user.id).single();
      if (!master) { const { data: c } = await supabase.from('masters').insert({ auth_id: user.id, name: user.email!.split('@')[0], trade: 'általános', email: user.email }).select('id, name, phone, trade, company_name, tax_number, tax_type, address, bank_account, nav_username').single(); master = c; }
      if (!master) return;
      setMasterId(master.id);
      setName(master.name ?? '');
      setPhone(master.phone ?? '');
      setTrade(master.trade ?? '');
      setCompanyName(master.company_name ?? '');
      setTaxNumber(master.tax_number ?? '');
      setTaxType(master.tax_type ?? 'afa_kotes');
      setAddress(master.address ?? '');
      setBankAccount(master.bank_account ?? '');
      setNavConfigured(!!master.nav_username);
      setLoading(false);
    }
    init();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!masterId) return;
    setSaving(true); setSaved(false); setError('');
    try {
      const { error: err } = await supabase.from('masters').update({
        name: name.trim(), phone: phone.trim() || null, trade: trade || 'általános',
        company_name: companyName.trim() || null, tax_number: taxNumber.trim() || null,
        tax_type: taxType, address: address.trim() || null, bank_account: bankAccount.trim() || null,
      }).eq('id', masterId);
      if (err) throw err;
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Mentés sikertelen');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="max-w-2xl mx-auto text-[#A3A3A3] pt-12 text-center">Betöltés...</div>;

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-black mb-6">Beállítások</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Profile */}
        <div className="bg-surface border border-border rounded-card p-5 flex flex-col gap-4">
          <h2 className="font-bold text-sm text-[#A3A3A3] uppercase tracking-wider">Profil</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[#A3A3A3] mb-1.5">Teljes név *</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required
                className="w-full bg-bg border border-border rounded-input px-3 py-2.5 text-[#F5F5F5] focus:outline-none focus:border-accent transition-colors text-sm" />
            </div>
            <div>
              <label className="block text-sm text-[#A3A3A3] mb-1.5">Telefon</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="+36 30 123 4567"
                className="w-full bg-bg border border-border rounded-input px-3 py-2.5 text-[#F5F5F5] placeholder-[#525252] focus:outline-none focus:border-accent transition-colors text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm text-[#A3A3A3] mb-1.5">Szakma</label>
            <select value={trade} onChange={e => setTrade(e.target.value)}
              className="w-full bg-bg border border-border rounded-input px-3 py-2.5 text-[#F5F5F5] focus:outline-none focus:border-accent transition-colors text-sm capitalize">
              {TRADES.map(t => <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </div>
        </div>

        {/* Billing data */}
        <div className="bg-surface border border-border rounded-card p-5 flex flex-col gap-4">
          <h2 className="font-bold text-sm text-[#A3A3A3] uppercase tracking-wider">Számlázási adatok</h2>
          <div>
            <label className="block text-sm text-[#A3A3A3] mb-1.5">Vállalkozás neve</label>
            <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)}
              placeholder="pl. Kovács János E.V."
              className="w-full bg-bg border border-border rounded-input px-3 py-2.5 text-[#F5F5F5] placeholder-[#525252] focus:outline-none focus:border-accent transition-colors text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[#A3A3A3] mb-1.5">Adószám</label>
              <input type="text" value={taxNumber} onChange={e => setTaxNumber(e.target.value)}
                placeholder="12345678-1-11"
                className="w-full bg-bg border border-border rounded-input px-3 py-2.5 text-[#F5F5F5] placeholder-[#525252] focus:outline-none focus:border-accent transition-colors text-sm" />
            </div>
            <div>
              <label className="block text-sm text-[#A3A3A3] mb-1.5">Bankszámlaszám</label>
              <input type="text" value={bankAccount} onChange={e => setBankAccount(e.target.value)}
                placeholder="12345678-12345678"
                className="w-full bg-bg border border-border rounded-input px-3 py-2.5 text-[#F5F5F5] placeholder-[#525252] focus:outline-none focus:border-accent transition-colors text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm text-[#A3A3A3] mb-2">ÁFA típus</label>
            <div className="grid grid-cols-3 gap-2">
              {TAX_TYPES.map(t => (
                <button key={t.value} type="button" onClick={() => setTaxType(t.value)}
                  className={`p-3 rounded-lg border text-left transition-colors ${taxType === t.value ? 'border-accent bg-accent/10' : 'border-border hover:border-accent/50'}`}>
                  <p className="text-sm font-semibold">{t.label}</p>
                  <p className="text-xs text-[#525252] mt-0.5">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm text-[#A3A3A3] mb-1.5">Cím</label>
            <input type="text" value={address} onChange={e => setAddress(e.target.value)}
              placeholder="1234 Budapest, Kossuth u. 10."
              className="w-full bg-bg border border-border rounded-input px-3 py-2.5 text-[#F5F5F5] placeholder-[#525252] focus:outline-none focus:border-accent transition-colors text-sm" />
          </div>
        </div>

        {error && <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-2">{error}</p>}
        {saved && <p className="text-sm text-green-400 bg-green-400/10 border border-green-400/20 rounded-lg px-4 py-2">✓ Beállítások mentve!</p>}

        <button type="submit" disabled={saving}
          className="w-full bg-accent hover:bg-[#FB923C] disabled:opacity-50 text-white font-bold py-3.5 rounded-btn transition-colors">
          {saving ? 'Mentés...' : 'Beállítások mentése →'}
        </button>
      </form>

      {/* Quick links */}
      <div className="mt-6 flex flex-col gap-2">
        {[
          { href: '/dashboard/settings/nav', icon: '🏛️', label: 'NAV Online Számla beállítás', badge: navConfigured ? '✅ Beállítva' : '⚠️ Nincs beállítva' },
          { href: '/dashboard/settings/price-list', icon: '💰', label: 'Árjegyzék', badge: '' },
          { href: '/dashboard/settings/billing', icon: '⭐', label: 'Előfizetés', badge: '' },
        ].map(item => (
          <Link key={item.href} href={item.href}
            className="bg-surface border border-border rounded-card px-5 py-4 flex items-center justify-between hover:border-accent/30 transition-colors">
            <span className="flex items-center gap-3 text-sm font-semibold">
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </span>
            <div className="flex items-center gap-2">
              {item.badge && <span className="text-xs text-[#A3A3A3]">{item.badge}</span>}
              <span className="text-accent">›</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
