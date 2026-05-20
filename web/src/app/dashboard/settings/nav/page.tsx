'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

type NavEnvironment = 'test' | 'prod';

interface FormState {
  nav_username: string;
  nav_password: string;
  nav_signature_key: string;
  nav_exchange_key: string;
  nav_environment: NavEnvironment;
}

interface TestResult {
  type: 'success' | 'error';
  message: string;
}

const INPUT_CLASS =
  'w-full bg-[#0F0F0F] border border-[#2A2A2A] rounded-[8px] px-4 py-3 text-[#F5F5F5] placeholder-[#A3A3A3] outline-none focus:border-[#F97316] transition-colors text-sm';

const LABEL_CLASS = 'block text-sm font-medium text-[#A3A3A3] mb-1.5';

export default function NavSettingsPage() {
  const [masterId, setMasterId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({
    nav_username: '',
    nav_password: '',
    nav_signature_key: '',
    nav_exchange_key: '',
    nav_environment: 'test',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from('masters')
        .select('id, nav_username, nav_signature_key, nav_exchange_key, nav_environment')
        .eq('auth_id', user.id)
        .single();

      if (data) {
        setMasterId(data.id as string);
        setForm((prev) => ({
          ...prev,
          nav_username: (data.nav_username as string) ?? '',
          nav_signature_key: (data.nav_signature_key as string) ?? '',
          nav_exchange_key: (data.nav_exchange_key as string) ?? '',
          nav_environment: ((data.nav_environment as NavEnvironment) ?? 'test'),
        }));
      }

      setLoading(false);
    }

    void load();
  }, []);

  function handleChange(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setTestResult(null);
    setSaveMessage(null);
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/nav/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: form.nav_username,
          password: form.nav_password,
          signatureKey: form.nav_signature_key,
          exchangeKey: form.nav_exchange_key,
          environment: form.nav_environment,
          taxNumber: '', // fetched from master profile; pass empty for test
        }),
      });

      const json = (await res.json()) as { success: boolean; message: string };
      setTestResult({
        type: json.success ? 'success' : 'error',
        message: json.message,
      });
    } catch (err) {
      setTestResult({
        type: 'error',
        message: err instanceof Error ? err.message : 'Ismeretlen hiba',
      });
    } finally {
      setTesting(false);
    }
  }

  async function handleSave() {
    if (!masterId) return;
    setSaving(true);
    setSaveMessage(null);

    const supabase = createClient();

    const updatePayload: Record<string, string> = {
      nav_username: form.nav_username,
      nav_signature_key: form.nav_signature_key,
      nav_exchange_key: form.nav_exchange_key,
      nav_environment: form.nav_environment,
    };

    // Store raw password temporarily — server/edge function will hash it
    if (form.nav_password.trim()) {
      updatePayload['nav_password_hash'] = form.nav_password;
    }

    const { error } = await supabase
      .from('masters')
      .update(updatePayload)
      .eq('id', masterId);

    if (error) {
      setSaveMessage(`Hiba: ${error.message}`);
    } else {
      setSaveMessage('Beállítások mentve.');
      setForm((prev) => ({ ...prev, nav_password: '' }));
    }

    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-[#F97316] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-[#F5F5F5] px-4 py-8">
      <div className="max-w-lg mx-auto">
        {/* Back link */}
        <Link
          href="/dashboard/settings"
          className="inline-flex items-center gap-1.5 text-[#A3A3A3] hover:text-[#F5F5F5] text-sm mb-6 transition-colors"
        >
          <span>&#8592;</span>
          <span>Beállítások</span>
        </Link>

        {/* Title */}
        <h1 className="text-2xl font-bold text-[#F5F5F5] mb-2">
          NAV Online Számla beállítás
        </h1>
        <p className="text-[#A3A3A3] text-sm mb-6">
          Technikai felhasználói adatok a számlák automatikus bejelentéséhez.
        </p>

        {/* Info box */}
        <div className="bg-[#F97316]/10 border border-[#F97316]/30 rounded-[16px] p-4 mb-6">
          <p className="text-sm text-[#F5F5F5]">
            <strong className="text-[#F97316]">Hol találom ezeket?</strong>
            {' '}→{' '}
            <a
              href="https://onlineszamla.nav.gov.hu"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-[#F97316] transition-colors"
            >
              onlineszamla.nav.gov.hu
            </a>{' '}
            → Bejelentkezés → Felhasználók → Technikai felhasználó kezelése
          </p>
        </div>

        {/* Form */}
        <div className="bg-[#1A1A1A] rounded-[16px] border border-[#2A2A2A] p-6 space-y-5">
          {/* Username */}
          <div>
            <label className={LABEL_CLASS}>NAV technikai felhasználónév</label>
            <input
              type="text"
              className={INPUT_CLASS}
              placeholder="pl. MESTER_TECH_01"
              value={form.nav_username}
              onChange={(e) => handleChange('nav_username', e.target.value)}
              autoComplete="off"
            />
          </div>

          {/* Password */}
          <div>
            <label className={LABEL_CLASS}>NAV jelszó</label>
            <input
              type="password"
              className={INPUT_CLASS}
              placeholder="••••••••"
              value={form.nav_password}
              onChange={(e) => handleChange('nav_password', e.target.value)}
              autoComplete="new-password"
            />
            <p className="mt-1.5 text-xs text-[#A3A3A3]">
              A jelszó titkosítva lesz tárolva. Ha nem változtatod, hagyd üresen.
            </p>
          </div>

          {/* Signature key */}
          <div>
            <label className={LABEL_CLASS}>Aláírókulcs (signatureKey)</label>
            <input
              type="text"
              className={INPUT_CLASS}
              placeholder="32 karakteres hex"
              value={form.nav_signature_key}
              onChange={(e) => handleChange('nav_signature_key', e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          {/* Exchange key */}
          <div>
            <label className={LABEL_CLASS}>Cserekulcs (exchangeKey)</label>
            <input
              type="text"
              className={INPUT_CLASS}
              placeholder="32 karakteres hex"
              value={form.nav_exchange_key}
              onChange={(e) => handleChange('nav_exchange_key', e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          {/* Environment */}
          <div>
            <label className={LABEL_CLASS}>Környezet</label>
            <div className="flex gap-4 mt-1">
              {(['test', 'prod'] as const).map((env) => (
                <label
                  key={env}
                  className="flex items-center gap-2 cursor-pointer select-none"
                >
                  <div
                    role="radio"
                    aria-checked={form.nav_environment === env}
                    tabIndex={0}
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors cursor-pointer ${
                      form.nav_environment === env
                        ? 'border-[#F97316]'
                        : 'border-[#2A2A2A]'
                    }`}
                    onClick={() => handleChange('nav_environment', env)}
                    onKeyDown={(e) => {
                      if (e.key === ' ' || e.key === 'Enter') {
                        handleChange('nav_environment', env);
                      }
                    }}
                  >
                    {form.nav_environment === env && (
                      <div className="w-2.5 h-2.5 rounded-full bg-[#F97316]" />
                    )}
                  </div>
                  <span className="text-sm text-[#F5F5F5]">
                    {env === 'test' ? 'Teszt' : 'Éles'}
                  </span>
                </label>
              ))}
            </div>
            {form.nav_environment === 'prod' && (
              <p className="mt-2 text-xs text-[#F97316]">
                Figyelem: éles módban valódi bejelentések történnek a NAV-hoz.
              </p>
            )}
          </div>
        </div>

        {/* Test result */}
        {testResult && (
          <div
            className={`mt-4 rounded-[12px] px-4 py-3 text-sm border ${
              testResult.type === 'success'
                ? 'bg-[#2D9B6F]/10 border-[#2D9B6F]/30 text-[#2D9B6F]'
                : 'bg-[#E05252]/10 border-[#E05252]/30 text-[#E05252]'
            }`}
          >
            {testResult.type === 'success' ? '✅' : '❌'} {testResult.message}
          </div>
        )}

        {/* Save message */}
        {saveMessage && (
          <div className="mt-4 rounded-[12px] px-4 py-3 text-sm border bg-[#1A1A1A] border-[#2A2A2A] text-[#A3A3A3]">
            {saveMessage}
          </div>
        )}

        {/* Action buttons */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => void handleTest()}
            disabled={testing || !form.nav_username || !form.nav_password}
            className="flex-1 min-h-[44px] rounded-[12px] border border-[#2A2A2A] bg-transparent text-[#F5F5F5] text-sm font-medium hover:border-[#F97316] hover:text-[#F97316] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {testing ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Tesztelés...
              </span>
            ) : (
              'Kapcsolat tesztelése'
            )}
          </button>

          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || !masterId}
            className="flex-1 min-h-[44px] rounded-[12px] bg-[#F97316] text-[#0F0F0F] text-sm font-semibold hover:bg-[#ea6c0e] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-[#0F0F0F] border-t-transparent rounded-full animate-spin" />
                Mentés...
              </span>
            ) : (
              'Mentés'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
