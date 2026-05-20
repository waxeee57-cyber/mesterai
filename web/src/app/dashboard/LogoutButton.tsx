'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LogoutButton() {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <button
      onClick={handleLogout}
      className="w-full text-sm text-[#A3A3A3] hover:text-[#F5F5F5] border border-border hover:border-accent/50 px-3 py-1.5 rounded-btn transition-colors"
    >
      Kilépés
    </button>
  );
}
