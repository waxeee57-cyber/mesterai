'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('A jelszavak nem egyeznek!'); return; }
    if (password.length < 6) { setError('A jelszó legalább 6 karakter legyen!'); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/dashboard` },
      });
      if (error) throw error;
      setSuccess(true);
    } catch (err: any) {
      setError(err.message ?? 'Regisztráció sikertelen');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <main className="min-h-screen bg-bg flex items-center justify-center p-6">
        <div className="w-full max-w-sm text-center">
          <div className="text-5xl mb-4">📧</div>
          <h2 className="text-xl font-bold text-[#F5F5F5] mb-2">Ellenőrizd az emailed!</h2>
          <p className="text-[#A3A3A3] text-sm mb-6">
            Küldtünk egy megerősítő linket a <strong className="text-[#F5F5F5]">{email}</strong> címre.
          </p>
          <Link href="/login" className="text-accent hover:underline text-sm font-semibold">
            ← Vissza a bejelentkezéshez
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-bg flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent mb-4">
            <span className="text-white font-black text-2xl">M</span>
          </div>
          <h1 className="text-2xl font-black text-[#F5F5F5]">Regisztráció</h1>
          <p className="text-[#A3A3A3] text-sm mt-1">14 napos Pro próba · Bankkártya nélkül</p>
        </div>

        <form onSubmit={handleRegister} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-semibold text-[#A3A3A3] mb-1.5">Email cím</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="email@example.com"
              required
              className="w-full bg-surface border border-border rounded-input px-4 py-3 text-[#F5F5F5] placeholder-[#525252] focus:outline-none focus:border-accent transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#A3A3A3] mb-1.5">Jelszó</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Min. 6 karakter"
              required
              className="w-full bg-surface border border-border rounded-input px-4 py-3 text-[#F5F5F5] placeholder-[#525252] focus:outline-none focus:border-accent transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#A3A3A3] mb-1.5">Jelszó megerősítése</label>
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Ismételd meg a jelszót"
              required
              className="w-full bg-surface border border-border rounded-input px-4 py-3 text-[#F5F5F5] placeholder-[#525252] focus:outline-none focus:border-accent transition-colors"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent hover:bg-[#FB923C] disabled:opacity-50 text-white font-bold py-3.5 rounded-btn transition-colors"
          >
            {loading ? 'Regisztráció...' : 'Regisztráció →'}
          </button>
        </form>

        <p className="text-center text-sm text-[#525252] mt-6">
          Már van fiókod?{' '}
          <Link href="/login" className="text-accent hover:underline font-semibold">
            Bejelentkezés
          </Link>
        </p>
      </div>
    </main>
  );
}
