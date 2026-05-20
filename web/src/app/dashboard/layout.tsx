import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getOrCreateMaster } from '@/lib/supabase/getMaster';
import Sidebar from '@/components/dashboard/Sidebar';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const master = await getOrCreateMaster();

  // Redirect new users to onboarding
  if (master && master.onboarded === false) {
    redirect('/onboarding');
  }

  return (
    <div className="min-h-screen bg-bg text-[#F5F5F5] flex">
      <Sidebar email={user.email ?? ''} />
      {/* pt-16 on mobile to clear fixed hamburger button */}
      <main className="flex-1 overflow-y-auto p-4 pt-16 lg:p-8 lg:pt-8">
        {children}
      </main>
    </div>
  );
}
