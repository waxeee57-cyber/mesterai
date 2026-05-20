import Link from 'next/link';

export default function WebDashboard() {
  return (
    <main className="min-h-screen bg-bg text-[#F5F5F5] p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center text-white font-bold">M</div>
            <span className="font-bold text-lg">MesterAI Dashboard</span>
          </div>
          <Link href="/" className="text-sm text-[#A3A3A3] hover:text-[#F5F5F5]">← Vissza</Link>
        </div>
        <div className="bg-surface border border-border rounded-card p-8 text-center">
          <div className="text-5xl mb-4">🚀</div>
          <h1 className="text-2xl font-bold mb-2">Web Dashboard</h1>
          <p className="text-[#A3A3A3] mb-6">A teljes webes irányítópult a mobil apphoz csatlakozva.</p>
          <p className="text-sm text-[#525252]">Supabase authentikáció + asztali munkakezelés hamarosan.</p>
        </div>
      </div>
    </main>
  );
}
