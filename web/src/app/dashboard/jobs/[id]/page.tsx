'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

// ─── Types ────────────────────────────────────────────────────────────────────

type JobStatus = 'new' | 'in_progress' | 'done' | 'invoiced' | 'cancelled';

interface Client {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
}

interface Job {
  id: string;
  master_id: string;
  client_id: string | null;
  title: string;
  description: string | null;
  status: JobStatus;
  address: string | null;
  scheduled_at: string | null;
  photos: string[] | null;
  clients: Client | null;
}

interface JobItem {
  id: string;
  job_id: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  vat_rate: number;
  total_net: number;
  total_gross: number;
  sort_order: number;
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_META: Record<string, { label: string; color: string }> = {
  new:         { label: 'Új',           color: 'bg-blue-500/20 text-blue-300' },
  in_progress: { label: 'Folyamatban',  color: 'bg-yellow-500/20 text-yellow-300' },
  done:        { label: 'Kész',         color: 'bg-green-500/20 text-green-300' },
  invoiced:    { label: 'Számlázva',    color: 'bg-orange-500/20 text-orange-300' },
  cancelled:   { label: 'Törölve',      color: 'bg-red-500/20 text-red-300' },
};

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? { label: status, color: 'bg-[#2A2A2A] text-[#A3A3A3]' };
  return (
    <span className={`text-sm px-3 py-1 rounded-full font-semibold ${meta.color}`}>
      {meta.label}
    </span>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatHunDate(iso: string): string {
  return new Date(iso).toLocaleString('hu-HU', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function fmtFt(n: number): string {
  return `${Math.round(n).toLocaleString('hu-HU')} Ft`;
}

// ─── New item form default ────────────────────────────────────────────────────

interface NewItemForm {
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  vat_rate: number;
}

const EMPTY_FORM: NewItemForm = {
  description: '',
  quantity: 1,
  unit: 'db',
  unit_price: 0,
  vat_rate: 27,
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function JobDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [items, setItems] = useState<JobItem[]>([]);

  const [statusUpdating, setStatusUpdating] = useState(false);
  const [showItemForm, setShowItemForm] = useState(false);
  const [itemForm, setItemForm] = useState<NewItemForm>(EMPTY_FORM);
  const [itemSaving, setItemSaving] = useState(false);

  // ── Load ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: master } = await supabase
        .from('masters')
        .select('id, tax_type')
        .eq('auth_id', user.id)
        .single();

      if (!master) { setError('Mester profil nem található'); setLoading(false); return; }

      const { data: jobData, error: jobErr } = await supabase
        .from('jobs')
        .select('*, clients(id, name, phone, address)')
        .eq('id', id)
        .eq('master_id', master.id)
        .single();

      if (jobErr || !jobData) {
        setError('A munka nem található vagy nincs hozzáférésed.');
        setLoading(false);
        return;
      }

      const { data: itemData } = await supabase
        .from('job_items')
        .select('*')
        .eq('job_id', id)
        .order('sort_order');

      setJob(jobData as unknown as Job);
      setItems((itemData ?? []) as JobItem[]);
      setLoading(false);
    }
    load();
  }, [id]);

  // ── Status update ────────────────────────────────────────────────────────────

  async function updateStatus(newStatus: JobStatus) {
    if (!job) return;
    setStatusUpdating(true);
    const { error: err } = await supabase
      .from('jobs')
      .update({ status: newStatus })
      .eq('id', id);
    if (err) {
      alert('Hiba a státusz frissítésekor: ' + err.message);
    } else {
      setJob({ ...job, status: newStatus });
    }
    setStatusUpdating(false);
  }

  async function handleCancel() {
    if (!confirm('Biztosan törlöd ezt a munkát?')) return;
    await updateStatus('cancelled');
  }

  // ── Add item ─────────────────────────────────────────────────────────────────

  async function handleAddItem() {
    if (!job || !itemForm.description.trim()) return;
    setItemSaving(true);

    const net = itemForm.quantity * itemForm.unit_price;
    const gross = net * (1 + itemForm.vat_rate / 100);
    const nextOrder = items.length > 0 ? Math.max(...items.map(i => i.sort_order)) + 1 : 1;

    const { data, error: insertErr } = await supabase
      .from('job_items')
      .insert({
        job_id: id,
        master_id: job.master_id,
        description: itemForm.description.trim(),
        quantity: itemForm.quantity,
        unit: itemForm.unit,
        unit_price: itemForm.unit_price,
        vat_rate: itemForm.vat_rate,
        total_net: net,
        total_gross: gross,
        sort_order: nextOrder,
      })
      .select()
      .single();

    if (insertErr) {
      alert('Hiba a tétel mentésekor: ' + insertErr.message);
    } else if (data) {
      setItems(prev => [...prev, data as JobItem]);
      setItemForm(EMPTY_FORM);
      setShowItemForm(false);
    }
    setItemSaving(false);
  }

  // ── Delete item ───────────────────────────────────────────────────────────────

  async function handleDeleteItem(itemId: string) {
    if (!confirm('Töröd ezt a tételt?')) return;
    const { error: delErr } = await supabase.from('job_items').delete().eq('id', itemId);
    if (delErr) {
      alert('Hiba a törléskor: ' + delErr.message);
    } else {
      setItems(prev => prev.filter(i => i.id !== itemId));
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

  if (error || !job) {
    return (
      <div className="max-w-2xl mx-auto pt-12 text-center">
        <p className="text-red-400 text-lg mb-4">{error ?? 'Ismeretlen hiba'}</p>
        <Link href="/dashboard/jobs" className="text-accent hover:underline">← Vissza a munkákhoz</Link>
      </div>
    );
  }

  const totalGross = items.reduce((s, i) => s + i.total_gross, 0);
  const client = job.clients;

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6">

      {/* ── Header ── */}
      <div>
        <Link href="/dashboard/jobs" className="text-[#A3A3A3] hover:text-[#F5F5F5] text-sm inline-flex items-center gap-1 mb-4">
          ← Munkák
        </Link>
        <div className="flex items-start gap-4 flex-wrap">
          <h1 className="text-2xl font-black flex-1">{job.title}</h1>
          <StatusBadge status={job.status} />
        </div>
      </div>

      {/* ── Action buttons ── */}
      {job.status !== 'cancelled' && job.status !== 'invoiced' && (
        <div className="flex flex-wrap gap-3">
          {job.status === 'new' && (
            <button
              onClick={() => updateStatus('in_progress')}
              disabled={statusUpdating}
              className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-btn transition-colors text-sm min-h-[44px]"
            >
              ▶ Megkezdem
            </button>
          )}
          {job.status === 'in_progress' && (
            <button
              onClick={() => updateStatus('done')}
              disabled={statusUpdating}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-btn transition-colors text-sm min-h-[44px]"
            >
              ✅ Befejeztem
            </button>
          )}
          {(job.status === 'done' || job.status === 'in_progress') && (
            <Link
              href={`/dashboard/invoices/new?jobId=${id}`}
              className="flex items-center gap-2 bg-accent hover:bg-[#FB923C] text-white font-semibold px-5 py-2.5 rounded-btn transition-colors text-sm min-h-[44px]"
            >
              📄 Számla készítése
            </Link>
          )}
          <button
            onClick={handleCancel}
            disabled={statusUpdating}
            className="flex items-center gap-2 bg-red-800/50 hover:bg-red-700/60 disabled:opacity-50 text-red-400 font-semibold px-5 py-2.5 rounded-btn transition-colors text-sm min-h-[44px] border border-red-800/50"
          >
            ✕ Mégsem
          </button>
        </div>
      )}

      {/* ── Info grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Ügyfél */}
        <div className="bg-surface border border-border rounded-card p-5">
          <p className="text-xs font-semibold text-[#A3A3A3] uppercase tracking-wider mb-2">Ügyfél</p>
          {client ? (
            <div className="flex flex-col gap-1">
              <Link
                href={`/dashboard/clients/${client.id}`}
                className="font-semibold text-accent hover:underline"
              >
                {client.name}
              </Link>
              {client.phone && (
                <a href={`tel:${client.phone}`} className="text-sm text-[#A3A3A3] hover:text-[#F5F5F5]">
                  📞 {client.phone}
                </a>
              )}
            </div>
          ) : (
            <p className="text-[#525252] text-sm">Nincs ügyfél</p>
          )}
        </div>

        {/* Helyszín */}
        <div className="bg-surface border border-border rounded-card p-5">
          <p className="text-xs font-semibold text-[#A3A3A3] uppercase tracking-wider mb-2">Helyszín</p>
          {job.address ? (
            <p className="font-medium">📍 {job.address}</p>
          ) : (
            <p className="text-[#525252] text-sm">Nincs megadva</p>
          )}
        </div>

        {/* Időpont */}
        <div className="bg-surface border border-border rounded-card p-5">
          <p className="text-xs font-semibold text-[#A3A3A3] uppercase tracking-wider mb-2">Időpont</p>
          {job.scheduled_at ? (
            <p className="font-medium">📅 {formatHunDate(job.scheduled_at)}</p>
          ) : (
            <p className="text-[#525252] text-sm">Nincs időpont</p>
          )}
        </div>

        {/* Leírás */}
        <div className="bg-surface border border-border rounded-card p-5">
          <p className="text-xs font-semibold text-[#A3A3A3] uppercase tracking-wider mb-2">Leírás</p>
          {job.description ? (
            <p className="text-sm leading-relaxed">{job.description}</p>
          ) : (
            <p className="text-[#525252] text-sm">Nincs leírás</p>
          )}
        </div>

      </div>

      {/* ── Tételek ── */}
      <div className="bg-surface border border-border rounded-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg">Tételek</h2>
          {!showItemForm && (
            <button
              onClick={() => setShowItemForm(true)}
              className="text-sm text-accent hover:underline font-semibold"
            >
              + Tétel hozzáadása
            </button>
          )}
        </div>

        {/* Items list */}
        {items.length > 0 ? (
          <div className="flex flex-col gap-2 mb-4">
            {items.map(item => (
              <div key={item.id} className="flex items-center gap-3 bg-bg rounded-input px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{item.description}</p>
                  <p className="text-xs text-[#A3A3A3]">
                    {item.quantity} {item.unit} × {fmtFt(item.unit_price)} · ÁFA {item.vat_rate}%
                  </p>
                </div>
                <p className="text-sm font-semibold text-accent shrink-0">{fmtFt(item.total_gross)}</p>
                <button
                  onClick={() => handleDeleteItem(item.id)}
                  className="text-[#525252] hover:text-red-400 transition-colors text-lg leading-none shrink-0 min-w-[28px] min-h-[28px] flex items-center justify-center"
                  aria-label="Tétel törlése"
                >
                  ✕
                </button>
              </div>
            ))}

            {/* Total */}
            <div className="flex justify-between items-center px-4 py-3 border-t border-border mt-2">
              <span className="font-bold">Összesen</span>
              <span className="text-xl font-black text-accent">{fmtFt(totalGross)}</span>
            </div>
          </div>
        ) : (
          !showItemForm && (
            <p className="text-[#525252] text-sm text-center py-6">Még nincs tétel</p>
          )
        )}

        {/* Inline add form */}
        {showItemForm && (
          <div className="bg-bg border border-border rounded-card p-4 mt-2 flex flex-col gap-3">
            <p className="font-semibold text-sm text-[#A3A3A3]">Új tétel</p>

            <input
              type="text"
              placeholder="Leírás *"
              value={itemForm.description}
              onChange={e => setItemForm(f => ({ ...f, description: e.target.value }))}
              className="w-full bg-surface border border-border rounded-input px-3 py-2.5 text-sm text-[#F5F5F5] placeholder-[#525252] focus:outline-none focus:border-accent transition-colors"
            />

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-xs text-[#A3A3A3] mb-1 block">Mennyiség</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={itemForm.quantity}
                  onChange={e => setItemForm(f => ({ ...f, quantity: parseFloat(e.target.value) || 0 }))}
                  className="w-full bg-surface border border-border rounded-input px-3 py-2.5 text-sm text-[#F5F5F5] focus:outline-none focus:border-accent transition-colors"
                />
              </div>
              <div>
                <label className="text-xs text-[#A3A3A3] mb-1 block">Egység</label>
                <select
                  value={itemForm.unit}
                  onChange={e => setItemForm(f => ({ ...f, unit: e.target.value }))}
                  className="w-full bg-surface border border-border rounded-input px-3 py-2.5 text-sm text-[#F5F5F5] focus:outline-none focus:border-accent transition-colors"
                >
                  <option value="db">db</option>
                  <option value="óra">óra</option>
                  <option value="m">m</option>
                  <option value="m2">m²</option>
                  <option value="kg">kg</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-[#A3A3A3] mb-1 block">Egységár (Ft)</label>
                <input
                  type="number"
                  min={0}
                  value={itemForm.unit_price}
                  onChange={e => setItemForm(f => ({ ...f, unit_price: parseFloat(e.target.value) || 0 }))}
                  className="w-full bg-surface border border-border rounded-input px-3 py-2.5 text-sm text-[#F5F5F5] focus:outline-none focus:border-accent transition-colors"
                />
              </div>
              <div>
                <label className="text-xs text-[#A3A3A3] mb-1 block">ÁFA %</label>
                <select
                  value={itemForm.vat_rate}
                  onChange={e => setItemForm(f => ({ ...f, vat_rate: parseInt(e.target.value) }))}
                  className="w-full bg-surface border border-border rounded-input px-3 py-2.5 text-sm text-[#F5F5F5] focus:outline-none focus:border-accent transition-colors"
                >
                  <option value={27}>27%</option>
                  <option value={5}>5%</option>
                  <option value={0}>0%</option>
                </select>
              </div>
            </div>

            {/* Preview */}
            {itemForm.description.trim() && itemForm.quantity > 0 && itemForm.unit_price > 0 && (
              <p className="text-xs text-[#A3A3A3]">
                Bruttó összeg:{' '}
                <span className="text-accent font-semibold">
                  {fmtFt(itemForm.quantity * itemForm.unit_price * (1 + itemForm.vat_rate / 100))}
                </span>
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleAddItem}
                disabled={itemSaving || !itemForm.description.trim()}
                className="bg-accent hover:bg-[#FB923C] disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-btn text-sm transition-colors min-h-[44px]"
              >
                {itemSaving ? 'Mentés...' : 'Hozzáad'}
              </button>
              <button
                onClick={() => { setShowItemForm(false); setItemForm(EMPTY_FORM); }}
                className="bg-surface border border-border text-[#A3A3A3] hover:text-[#F5F5F5] font-semibold px-5 py-2.5 rounded-btn text-sm transition-colors min-h-[44px]"
              >
                Mégsem
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Fotók ── */}
      <div className="bg-surface border border-border rounded-card p-5">
        <h2 className="font-bold text-lg mb-4">Fotók</h2>
        <div className="border-2 border-dashed border-border rounded-card p-10 flex flex-col items-center justify-center gap-3 text-center">
          <span className="text-4xl">📷</span>
          <p className="text-[#A3A3A3] font-semibold">Fotók feltöltése</p>
          <p className="text-[#525252] text-sm">— hamarosan —</p>
        </div>
      </div>

    </div>
  );
}
