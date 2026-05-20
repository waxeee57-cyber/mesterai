'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

const DEMO_EMAIL = 'demo@demo.hu';
const DEMO_PASSWORD = 'demo1234';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
      console.log('KEY length:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      setError(err.message ?? 'Hibás email vagy jelszó');
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async () => {
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
    setError('');
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
      });
      if (error) throw error;
      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      setError('Demo fiók nem elérhető: ' + (err.message ?? ''));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-bg flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent mb-4">
            <span className="text-white font-black text-2xl">M</span>
          </div>
          <h1 className="text-2xl font-black text-[#F5F5F5]">MesterAI</h1>
          <p className="text-[#A3A3A3] text-sm mt-1">Magyar mesteremberek appja</p>
        </div>

        {/* Trial badge */}
        <div className="bg-[#F9731620] border border-accent/30 rounded-xl p-3 text-center mb-6">
          <p className="text-accent text-sm font-semibold">🎁 14 napos Pro próba · Bankkártya nélkül</p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
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
              placeholder="••••••••"
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
            {loading ? 'Belépés...' : 'Bejelentkezés'}
          </button>
        </form>

        <button
          onClick={handleDemo}
          disabled={loading}
          className="w-full mt-3 border border-border hover:border-accent/50 text-[#A3A3A3] hover:text-[#F5F5F5] font-semibold py-3.5 rounded-btn transition-colors"
        >
          Demo belépés
        </button>

        <p className="text-center text-sm text-[#525252] mt-6">
          Még nincs fiókod?{' '}
          <Link href="/register" className="text-accent hover:underline font-semibold">
            Regisztráció
          </Link>
        </p>
      </div>
    </main>
  );
}
