'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

type PriceItem = {
  id: string;
  name: string;
  description: string | null;
  type: string;
  unit: string;
  unit_price: number;
  vat_rate: number;
  is_active: boolean;
};

const UNITS = ['db', 'óra', 'm', 'm2', 'm3', 'kg', 'csomag', 'egység'];

export default function PriceListPage() {
  const supabase = createClient();
  const [masterId, setMasterId] = useState<string | null>(null);
  const [items, setItems] = useState<PriceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [type, setType] = useState('work');
  const [unit, setUnit] = useState('db');
  const [unitPrice, setUnitPrice] = useState('');
  const [vatRate, setVatRate] = useState(27);
  const [description, setDescription] = useState('');

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      let { data: master } = await supabase.from('masters').select('id').eq('auth_id', user.id).single();
      if (!master) {
        const { data: c } = await supabase.from('masters').insert({ auth_id: user.id, name: user.email!.split('@')[0], trade: 'általános', email: user.email }).select('id').single();
        master = c;
      }
      if (!master) return;
      setMasterId(master.id);
      const { data } = await supabase.from('price_list').select('*').eq('master_id', master.id).eq('is_active', true).order('name');
      setItems(data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const resetForm = () => {
    setName(''); setType('work'); setUnit('db');
    setUnitPrice(''); setVatRate(27); setDescription('');
    setShowForm(false); setError('');
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!masterId) return;
    setSaving(true); setError('');
    try {
      const { data, error: err } = await supabase.from('price_list').insert({
        master_id: masterId,
        name: name.trim(),
        description: description.trim() || null,
        type, unit,
        unit_price: parseFloat(unitPrice),
        vat_rate: vatRate,
        is_active: true,
      }).select().single();
      if (err) throw err;
      setItems(prev => [...prev, data]);
      resetForm();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Hiba');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from('price_list').update({ is_active: false }).eq('id', id);
    setItems(prev => prev.filter(i => i.id !== id));
  };

  if (loading) return <div className="max-w-2xl mx-auto text-[#A3A3A3] pt-12 text-center">Betöltés...</div>;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/settings" className="text-[#A3A3A3] hover:text-[#F5F5F5] text-sm">← Beállítások</Link>
        <h1 className="text-2xl font-black">Árjegyzék</h1>
      </div>
      <p className="text-sm text-[#A3A3A3] mb-6">A gyors számlakészítéshez — válaszd ki ezekből a tételeket.</p>

      {items.length === 0 && !showForm && (
        <div className="bg-surface border border-border rounded-card p-8 text-center mb-4">
          <div className="text-4xl mb-3">💰</div>
          <p className="text-[#A3A3A3] text-sm">Még nincs árjegyzék. Add hozzá a leggyakoribb munkáid és anyagaid!</p>
        </div>
      )}

      <div className="flex flex-col gap-2 mb-4">
        {items.map(item => (
          <div key={item.id} className="bg-surface border border-border rounded-card px-4 py-3 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#2A2A2A] text-[#A3A3A3]">
                  {item.type === 'work' ? 'Munka' : 'Anyag'}
                </span>
                <span className="font-semibold">{item.name}</span>
              </div>
              <p className="text-sm text-[#A3A3A3] mt-0.5">
                {item.unit_price.toLocaleString('hu-HU')} Ft/{item.unit} · ÁFA {item.vat_rate}%
              </p>
            </div>
            <button onClick={() => handleDelete(item.id)} className="text-[#525252] hover:text-red-400 transition-colors ml-4 text-lg">✕</button>
          </div>
        ))}
      </div>

      {showForm ? (
        <form onSubmit={handleAdd} className="bg-surface border border-border rounded-card p-5 flex flex-col gap-4">
          <h3 className="font-bold">Új tétel hozzáadása</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-[#A3A3A3] mb-1">Megnevezés *</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required
                placeholder="pl. Konnektor csere"
                className="w-full bg-bg border border-border rounded-input px-3 py-2.5 text-[#F5F5F5] placeholder-[#525252] focus:outline-none focus:border-accent transition-colors text-sm" />
            </div>
            <div>
              <label className="block text-sm text-[#A3A3A3] mb-1">Típus</label>
              <select value={type} onChange={e => setType(e.target.value)}
                className="w-full bg-bg border border-border rounded-input px-3 py-2.5 text-[#F5F5F5] focus:outline-none focus:border-accent transition-colors text-sm">
                <option value="work">Munkadíj</option>
                <option value="material">Anyag</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-[#A3A3A3] mb-1">Egységár (Ft) *</label>
              <input type="number" value={unitPrice} onChange={e => setUnitPrice(e.target.value)} required min="0"
                placeholder="3500"
                className="w-full bg-bg border border-border rounded-input px-3 py-2.5 text-[#F5F5F5] placeholder-[#525252] focus:outline-none focus:border-accent transition-colors text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm text-[#A3A3A3] mb-1">Egység</label>
                <select value={unit} onChange={e => setUnit(e.target.value)}
                  className="w-full bg-bg border border-border rounded-input px-3 py-2.5 text-[#F5F5F5] focus:outline-none focus:border-accent transition-colors text-sm">
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-[#A3A3A3] mb-1">ÁFA%</label>
                <select value={vatRate} onChange={e => setVatRate(parseInt(e.target.value))}
                  className="w-full bg-bg border border-border rounded-input px-3 py-2.5 text-[#F5F5F5] focus:outline-none focus:border-accent transition-colors text-sm">
                  <option value={27}>27%</option>
                  <option value={5}>5%</option>
                  <option value={0}>0% / AAM</option>
                </select>
              </div>
            </div>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={saving}
              className="flex-1 bg-accent hover:bg-[#FB923C] disabled:opacity-50 text-white font-bold py-2.5 rounded-btn transition-colors text-sm">
              {saving ? 'Mentés...' : 'Hozzáadás'}
            </button>
            <button type="button" onClick={resetForm}
              className="px-4 border border-border hover:border-accent/50 text-[#A3A3A3] rounded-btn transition-colors text-sm">
              Mégsem
            </button>
          </div>
        </form>
      ) : (
        <button onClick={() => setShowForm(true)}
          className="w-full border border-dashed border-border hover:border-accent/50 text-[#A3A3A3] hover:text-[#F5F5F5] py-3 rounded-card transition-colors text-sm">
          + Tétel hozzáadása
        </button>
      )}
    </div>
  );
}
