'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

// ─── Types ────────────────────────────────────────────────────────────────────

type TaxType = 'afa' | 'kata' | 'alanyi';

const TRADES = [
  'Villanyszerelő',
  'Vízvezetékszerelő',
  'Festő-mázoló',
  'Ács',
  'Kőműves',
  'Burkoló',
  'Lakatos',
  'Asztalos',
  'Gépész',
  'Tetőfedő',
  'Általános',
];

const TAX_TYPES: { id: TaxType; title: string; desc: string }[] = [
  { id: 'afa', title: 'ÁFA körös', desc: 'Általános ÁFA alany, 27% ÁFA' },
  { id: 'kata', title: 'KATA', desc: 'Kisadózó, átalányadó' },
  { id: 'alanyi', title: 'Alanyi mentes', desc: 'Évi 12 MFt alatt, AAM jelzés' },
];

// ─── Step dot indicator ───────────────────────────────────────────────────────

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex gap-2 justify-center mb-8">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`w-2 h-2 rounded-full transition-all duration-300 ${
            i + 1 === current
              ? 'bg-[#F97316] w-5'
              : i + 1 < current
              ? 'bg-[#F97316]/40'
              : 'bg-[#2A2A2A]'
          }`}
        />
      ))}
    </div>
  );
}

// ─── Shared input styles ──────────────────────────────────────────────────────

const inputCls =
  'w-full bg-[#0F0F0F] border border-[#2A2A2A] rounded-input px-4 py-3 text-[#F5F5F5] placeholder-[#525252] focus:outline-none focus:border-[#F97316] transition-colors text-sm';

const labelCls = 'block text-sm font-semibold text-[#A3A3A3] mb-1.5';

// ─── Main page ────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState(1);
  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Step 2 — basic info
  const [name, setName] = useState('');
  const [trade, setTrade] = useState(TRADES[0]);

  // Step 3 — tax type
  const [taxType, setTaxType] = useState<TaxType>('afa');

  // Step 4 — billing data
  const [taxNumber, setTaxNumber] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [address, setAddress] = useState('');

  // Step 5 — first client
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');

  // Auth guard + onboarded redirect
  useEffect(() => {
    async function check() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }
      const user = session.user;

      const { data: master } = await supabase
        .from('masters')
        .select('id, onboarded')
        .eq('auth_id', user.id)
        .single();

      if (master?.onboarded) { router.push('/dashboard'); return; }

      setChecking(false);
    }
    check();
  }, [router, supabase]);

  const finishOnboarding = async (skipClient: boolean) => {
    setSaving(true);
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Nincs bejelentkezett felhasználó');
      const user = session.user;

      // Upsert master
      const { error: masterErr } = await supabase
        .from('masters')
        .upsert(
          {
            auth_id: user.id,
            name: name.trim() || (user.email?.split('@')[0] ?? 'Mesterember'),
            trade,
            tax_type: taxType,
            tax_number: taxNumber.trim() || null,
            bank_account: bankAccount.trim() || null,
            address: address.trim() || null,
            email: user.email,
            onboarded: true,
          },
          { onConflict: 'auth_id' }
        );

      if (masterErr) throw masterErr;

      // Create first client if provided
      if (!skipClient && clientName.trim()) {
        const { data: master } = await supabase
          .from('masters')
          .select('id')
          .eq('auth_id', user.id)
          .single();

        if (master) {
          await supabase.from('clients').insert({
            master_id: master.id,
            name: clientName.trim(),
            phone: clientPhone.trim() || null,
          });
        }
      }

      router.push('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Hiba történt');
    } finally {
      setSaving(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center text-[#A3A3A3]">
        Betöltés...
      </div>
    );
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logout escape hatch */}
        <div className="flex justify-end mb-2">
          <button
            type="button"
            onClick={handleSignOut}
            className="text-xs text-[#525252] hover:text-[#A3A3A3] transition-colors"
          >
            Kijelentkezés
          </button>
        </div>
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-card p-8">
          <StepDots current={step} total={5} />

          {/* ─── Step 1: Welcome ─────────────────────────────────────────── */}
          {step === 1 && (
            <div className="text-center">
              <h1 className="text-2xl font-black text-[#F5F5F5] mb-3">Üdv a MesterAI-ban! 👋</h1>
              <p className="text-[#A3A3A3] text-sm mb-8">Állítsuk be 2 perc alatt.</p>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-full bg-[#F97316] hover:bg-[#FB923C] text-white font-bold py-3.5 rounded-btn transition-colors"
              >
                Kezdjük →
              </button>
            </div>
          )}

          {/* ─── Step 2: Basic info ───────────────────────────────────────── */}
          {step === 2 && (
            <div>
              <h2 className="text-xl font-black text-[#F5F5F5] mb-6">Ki vagy te?</h2>
              <div className="flex flex-col gap-4 mb-6">
                <div>
                  <label className={labelCls}>Teljes név *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="pl. Kovács János"
                    required
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Szakma</label>
                  <select
                    value={trade}
                    onChange={(e) => setTrade(e.target.value)}
                    className={inputCls}
                  >
                    {TRADES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { if (name.trim()) setStep(3); else setError('Add meg a neved!'); }}
                className="w-full bg-[#F97316] hover:bg-[#FB923C] text-white font-bold py-3.5 rounded-btn transition-colors"
              >
                Tovább →
              </button>
              {error && <p className="text-red-400 text-sm mt-3 text-center">{error}</p>}
            </div>
          )}

          {/* ─── Step 3: Tax type ─────────────────────────────────────────── */}
          {step === 3 && (
            <div>
              <h2 className="text-xl font-black text-[#F5F5F5] mb-6">Hogyan számlázol?</h2>
              <div className="flex flex-col gap-3 mb-6">
                {TAX_TYPES.map((tt) => (
                  <button
                    key={tt.id}
                    type="button"
                    onClick={() => setTaxType(tt.id)}
                    className={`border rounded-card p-4 text-left transition-all ${
                      taxType === tt.id
                        ? 'border-[#F97316] bg-[#F97316]/10'
                        : 'border-[#2A2A2A] hover:border-[#F97316]/40'
                    }`}
                  >
                    <p className="font-bold text-[#F5F5F5] text-sm">{tt.title}</p>
                    <p className="text-[#A3A3A3] text-xs mt-0.5">{tt.desc}</p>
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setStep(4)}
                className="w-full bg-[#F97316] hover:bg-[#FB923C] text-white font-bold py-3.5 rounded-btn transition-colors"
              >
                Tovább →
              </button>
            </div>
          )}

          {/* ─── Step 4: Billing data ─────────────────────────────────────── */}
          {step === 4 && (
            <div>
              <h2 className="text-xl font-black text-[#F5F5F5] mb-6">Számlázáshoz szükséges adatok</h2>
              <div className="flex flex-col gap-4 mb-6">
                <div>
                  <label className={labelCls}>Adószám</label>
                  <input
                    type="text"
                    value={taxNumber}
                    onChange={(e) => setTaxNumber(e.target.value)}
                    placeholder="12345678-1-11"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Bankszámlaszám (opcionális)</label>
                  <input
                    type="text"
                    value={bankAccount}
                    onChange={(e) => setBankAccount(e.target.value)}
                    placeholder="11111111-22222222-33333333"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Cím (opcionális)</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="1234 Budapest, Példa utca 1."
                    className={inputCls}
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStep(5)}
                className="w-full bg-[#F97316] hover:bg-[#FB923C] text-white font-bold py-3.5 rounded-btn transition-colors"
              >
                Tovább →
              </button>
            </div>
          )}

          {/* ─── Step 5: First client ─────────────────────────────────────── */}
          {step === 5 && (
            <div>
              <h2 className="text-xl font-black text-[#F5F5F5] mb-1">Hozzunk létre egy ügyfelet?</h2>
              <p className="text-[#A3A3A3] text-sm mb-6">(Kihagyható)</p>
              <div className="flex flex-col gap-4 mb-6">
                <div>
                  <label className={labelCls}>Ügyfél neve</label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="pl. Nagy Péter"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Telefon (opcionális)</label>
                  <input
                    type="tel"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="+36 20 123 4567"
                    className={inputCls}
                  />
                </div>
              </div>

              {error && (
                <p className="text-red-400 text-sm mb-4 text-center">{error}</p>
              )}

              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => finishOnboarding(false)}
                  disabled={saving}
                  className="w-full bg-[#F97316] hover:bg-[#FB923C] disabled:opacity-50 text-white font-bold py-3.5 rounded-btn transition-colors"
                >
                  {saving ? 'Mentés...' : 'Létrehozás + Dashboard →'}
                </button>
                <button
                  type="button"
                  onClick={() => finishOnboarding(true)}
                  disabled={saving}
                  className="w-full border border-[#2A2A2A] hover:border-[#F97316]/40 text-[#A3A3A3] hover:text-[#F5F5F5] font-semibold py-3 rounded-btn transition-colors text-sm disabled:opacity-50"
                >
                  Kihagyás →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Back link for steps 2-4 */}
        {step > 1 && step < 5 && (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            className="mt-4 w-full text-center text-[#A3A3A3] hover:text-[#F5F5F5] text-sm transition-colors"
          >
            ← Vissza
          </button>
        )}
      </div>
    </div>
  );
}
