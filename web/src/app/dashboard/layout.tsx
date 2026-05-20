import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Sidebar from '@/components/dashboard/Sidebar';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <div className="min-h-screen bg-bg text-[#F5F5F5] flex">
      <Sidebar email={user.email ?? ''} />
      <main className="flex-1 p-8 overflow-y-auto">{children}</main>
    </div>
  );
}
