import Link from 'next/link';

const FEATURES = [
  {
    icon: '⚡',
    title: '5 perc alatt új munka',
    desc: 'Ügyfél, cím, időpont — és kész. Fotók csatolása, hangjegyzet, automatikus naptár.',
  },
  {
    icon: '🧾',
    title: '30 mp alatt számla',
    desc: 'A munka tételeiből egy gombnyomás a kész, NAV-kompatibilis PDF számla.',
  },
  {
    icon: '📊',
    title: 'Minden egy helyen',
    desc: 'Ügyfelek, munkák, bevételek, határidők. Semmi Excel, semmi papír.',
  },
];

const PRICING = [
  {
    name: 'Ingyenes',
    price: '0 Ft',
    per: '',
    features: ['10 munka/hó', 'Alap számla', 'Email küldés', 'Ügyféladatbázis'],
    cta: 'Ingyenes kezdés',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '4.900 Ft',
    per: '/hó',
    features: ['Korlátlan munka', 'NAV Online Számla', 'SMS emlékeztető', 'Google Calendar', 'WhatsApp küldés', 'PDF export'],
    cta: 'Pro kipróbálása',
    highlight: true,
  },
  {
    name: 'Business',
    price: '9.900 Ft',
    per: '/hó',
    features: ['Minden Pro funkció', 'Csapat (5 fő)', 'AI hangfelvétel', 'Foglalási widget', 'Prioritás support'],
    cta: 'Business kezdés',
    highlight: false,
  },
];

const TRADES = ['⚡ Villanyszerelő', '💧 Vízvezeték', '🎨 Festő', '🪨 Burkoló', '🪵 Ács', '🧱 Kőműves', '🌿 Kertész', '🔧 Egyéb'];

export default function Home() {
  return (
    <main className="min-h-screen bg-bg text-[#F5F5F5]">
      {/* Nav */}
      <nav className="border-b border-border/50 sticky top-0 z-50 bg-bg/90 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center text-white font-bold">M</div>
            <span className="font-bold text-lg text-[#F5F5F5]">MesterAI</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="#pricing" className="text-sm text-[#A3A3A3] hover:text-[#F5F5F5] transition-colors">Árazás</Link>
            <Link href="/dashboard" className="text-sm bg-accent hover:bg-[#FB923C] text-white px-4 py-2 rounded-btn font-semibold transition-colors">
              Belépés
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 bg-[#F9731620] border border-accent/30 rounded-full px-4 py-1.5 mb-8">
          <span className="text-accent text-sm font-semibold">🔨 Magyar mesterembereknek</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight">
          Több idő <span className="text-accent">a munkára.</span>
          <br />Kevesebb papírmunka.
        </h1>
        <p className="text-xl text-[#A3A3A3] mb-4 max-w-2xl mx-auto">
          MesterAI — az első magyar mesterember app.
        </p>
        <p className="text-[#A3A3A3] mb-10">
          A legtöbb mesterember Excelben vezeti a munkáit. <strong className="text-[#F5F5F5]">Te már nem.</strong>
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            href="/dashboard"
            className="bg-accent hover:bg-[#FB923C] text-white font-bold text-lg px-8 py-4 rounded-btn transition-colors w-full sm:w-auto text-center"
          >
            Ingyenes kezdés — 2 perc alatt
          </Link>
          <span className="text-sm text-[#525252]">14 napos Pro próba · Bankkártya nélkül</span>
        </div>

        <div className="flex flex-wrap justify-center gap-3 mt-12">
          {TRADES.map(t => (
            <span key={t} className="text-sm bg-surface border border-border rounded-full px-4 py-1.5 text-[#A3A3A3]">
              {t}
            </span>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center mb-12">Minden ami kell, semmi ami nem</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {FEATURES.map(f => (
            <div key={f.title} className="bg-surface border border-border rounded-card p-8 hover:border-accent/50 transition-colors">
              <div className="text-4xl mb-4">{f.icon}</div>
              <h3 className="text-xl font-bold mb-3">{f.title}</h3>
              <p className="text-[#A3A3A3] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center mb-4">Egyszerű árazás</h2>
        <p className="text-[#A3A3A3] text-center mb-12">Kezdj ingyen. Fizess csak ha növekszel.</p>
        <div className="grid md:grid-cols-3 gap-6">
          {PRICING.map(p => (
            <div
              key={p.name}
              className={`bg-surface rounded-card p-8 flex flex-col gap-4 ${p.highlight ? 'border-2 border-accent' : 'border border-border'}`}
            >
              {p.highlight && (
                <div className="bg-[#F9731620] rounded-lg px-3 py-1 self-start">
                  <span className="text-accent text-xs font-bold">⭐ LEGJOBB VÁLASZTÁS</span>
                </div>
              )}
              <div>
                <h3 className="text-xl font-bold">{p.name}</h3>
                <div className="flex items-end gap-1 mt-2">
                  <span className={`text-3xl font-black ${p.highlight ? 'text-accent' : ''}`}>{p.price}</span>
                  <span className="text-[#A3A3A3] mb-1">{p.per}</span>
                </div>
              </div>
              <ul className="flex flex-col gap-2 flex-1">
                {p.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-[#A3A3A3]">
                    <span className="text-[#22C55E]">✓</span> {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/dashboard"
                className={`text-center py-3 rounded-btn font-semibold text-sm transition-colors ${p.highlight ? 'bg-accent hover:bg-[#FB923C] text-white' : 'bg-surface2 hover:bg-border text-[#F5F5F5]'}`}
              >
                {p.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-6 py-20 text-center">
        <h2 className="text-4xl font-black mb-4">Készen állsz?</h2>
        <p className="text-[#A3A3A3] mb-8">Csatlakozz a MesterAI-hoz — ingyen, 2 perc alatt.</p>
        <Link href="/dashboard" className="inline-block bg-accent hover:bg-[#FB923C] text-white font-bold text-lg px-10 py-4 rounded-btn transition-colors">
          Próbáld ki ingyen →
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 text-center text-[#525252] text-sm">
        <p>© 2026 MesterAI · <a href="https://mesterai.hu" className="hover:text-accent transition-colors">mesterai.hu</a></p>
      </footer>
    </main>
  );
}
