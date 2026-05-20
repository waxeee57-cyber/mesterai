import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getOrCreateMaster } from '@/lib/supabase/getMaster';

const PLANS = [
  {
    name: 'Ingyenes',
    price: '0 Ft',
    period: '/hó',
    tier: 'free',
    features: ['10 munka/hó', '5 ügyfél', 'Alapszámlázás', 'WhatsApp küldés'],
    cta: 'Jelenlegi csomag',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '4.900 Ft',
    period: '/hó',
    tier: 'pro',
    features: ['Korlátlan munka', 'Korlátlan ügyfél', 'NAV integráció', 'PDF számla', 'Bevétel riport', 'Prioritásos support'],
    cta: 'Pro-ra váltás',
    highlight: true,
  },
  {
    name: 'Business',
    price: '9.900 Ft',
    period: '/hó',
    tier: 'business',
    features: ['Minden Pro funkció', 'Csapattagok (3 fő)', 'Árjegyzék sablon', 'Árajánlat modul', 'API hozzáférés', 'Dedikált support'],
    cta: 'Business-re váltás',
    highlight: false,
  },
];

export default async function BillingPage() {
  const supabase = await createClient();
  const master = await getOrCreateMaster();
  const currentTier = master?.subscription_tier ?? 'free';

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/settings" className="text-[#A3A3A3] hover:text-[#F5F5F5] text-sm">← Beállítások</Link>
        <h1 className="text-2xl font-black">Előfizetés</h1>
      </div>

      {currentTier !== 'free' && (
        <div className="bg-accent/10 border border-accent/30 rounded-card p-4 mb-6 flex items-center gap-3">
          <span className="text-2xl">⭐</span>
          <div>
            <p className="font-bold text-accent">
              {currentTier === 'pro' ? 'Pro csomag aktív' : 'Business csomag aktív'}
            </p>
            {master?.subscription_expires_at && (
              <p className="text-sm text-[#A3A3A3]">
                Érvényes: {new Date(master.subscription_expires_at).toLocaleDateString('hu-HU')}
              </p>
            )}
          </div>
        </div>
      )}

      {currentTier === 'free' && master?.trial_expires_at && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-card p-4 mb-6">
          <p className="text-sm text-blue-300">
            🎁 Pro próba aktív — {new Date(master.trial_expires_at).toLocaleDateString('hu-HU')}-ig ingyenes
          </p>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-4 mb-8">
        {PLANS.map(plan => {
          const isCurrent = plan.tier === currentTier;
          return (
            <div key={plan.tier} className={`bg-surface border rounded-card p-5 flex flex-col ${
              plan.highlight
                ? 'border-accent ring-1 ring-accent/30'
                : 'border-border'
            }`}>
              {plan.highlight && (
                <span className="text-xs font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-full self-start mb-3">
                  Legnépszerűbb
                </span>
              )}
              <h3 className="font-black text-lg">{plan.name}</h3>
              <div className="flex items-baseline gap-1 my-3">
                <span className={`text-3xl font-black ${plan.highlight ? 'text-accent' : ''}`}>{plan.price}</span>
                <span className="text-[#A3A3A3] text-sm">{plan.period}</span>
              </div>
              <ul className="flex flex-col gap-2 mb-6 flex-1">
                {plan.features.map(f => (
                  <li key={f} className="text-sm text-[#A3A3A3] flex items-center gap-2">
                    <span className="text-green-400">✓</span> {f}
                  </li>
                ))}
              </ul>
              {isCurrent ? (
                <span className="text-center text-sm text-[#525252] border border-border rounded-btn py-2.5">
                  Jelenlegi csomag
                </span>
              ) : (
                <button
                  disabled
                  className={`w-full py-2.5 rounded-btn text-sm font-bold transition-colors disabled:cursor-not-allowed ${
                    plan.highlight
                      ? 'bg-accent hover:bg-[#FB923C] text-white disabled:opacity-70'
                      : 'border border-border text-[#A3A3A3] disabled:opacity-50'
                  }`}
                >
                  {plan.cta} — hamarosan
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-surface border border-border rounded-card p-5 text-center">
        <p className="text-sm text-[#A3A3A3]">
          Kérdésed van? Írj nekünk: <a href="mailto:hello@mesterai.hu" className="text-accent hover:underline">hello@mesterai.hu</a>
        </p>
      </div>
    </div>
  );
}
