import { createClient } from '@/lib/supabase/server';
import { getOrCreateMaster } from '@/lib/supabase/getMaster';

const DAYS = ['H', 'K', 'Sz', 'Cs', 'P', 'Szo', 'V'];
const MONTHS = [
  'Január', 'Február', 'Március', 'Április', 'Május', 'Június',
  'Július', 'Augusztus', 'Szeptember', 'Október', 'November', 'December',
];

export default async function CalendarPage() {
  const supabase = await createClient();
  const master = await getOrCreateMaster();

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // isoDateString for range query
  const rangeStart = firstDay.toISOString();
  const rangeEnd = new Date(year, month + 1, 1).toISOString();

  type CalJobRow = {
    id: string;
    title: string;
    status: string;
    scheduled_at: string | null;
    clients: { name: string } | null;
  };

  const jobs: CalJobRow[] = master
    ? ((await supabase
        .from('jobs')
        .select('id, title, status, scheduled_at, clients(name)')
        .eq('master_id', master.id)
        .gte('scheduled_at', rangeStart)
        .lt('scheduled_at', rangeEnd)
        .order('scheduled_at')).data ?? []) as unknown as CalJobRow[]
    : [];

  // Map day-of-month → jobs
  const jobsByDay: Record<number, typeof jobs> = {};
  for (const job of jobs) {
    if (!job.scheduled_at) continue;
    const d = new Date(job.scheduled_at).getDate();
    if (!jobsByDay[d]) jobsByDay[d] = [];
    jobsByDay[d].push(job);
  }

  // Build calendar grid: Mon-Sun week start
  // getDay() returns 0=Sun, 1=Mon, ...; we want Mon=0
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = lastDay.getDate();
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;
  const cells: (number | null)[] = [];
  for (let i = 0; i < totalCells; i++) {
    const day = i - startOffset + 1;
    cells.push(day >= 1 && day <= daysInMonth ? day : null);
  }

  const today = now.getDate();
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() === month;

  const STATUS_DOT: Record<string, string> = {
    new: 'bg-blue-400',
    in_progress: 'bg-yellow-400',
    done: 'bg-green-400',
    invoiced: 'bg-accent',
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black">
          {MONTHS[month]} {year}
        </h1>
        <span className="text-sm text-[#A3A3A3]">{jobs.length} ütemezett munka</span>
      </div>

      <div className="bg-surface border border-border rounded-card overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-border">
          {DAYS.map(d => (
            <div key={d} className="py-3 text-center text-xs font-semibold text-[#525252] uppercase tracking-wider">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar cells */}
        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            const isToday = isCurrentMonth && day === today;
            const dayJobs = day ? (jobsByDay[day] ?? []) : [];
            return (
              <div
                key={i}
                className={`min-h-[100px] p-2 border-b border-r border-border ${
                  !day ? 'bg-[#0A0A0A]' : ''
                } ${i % 7 === 6 ? 'border-r-0' : ''}`}
              >
                {day && (
                  <>
                    <span
                      className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-semibold mb-1 ${
                        isToday
                          ? 'bg-accent text-white'
                          : 'text-[#A3A3A3]'
                      }`}
                    >
                      {day}
                    </span>
                    <div className="flex flex-col gap-1">
                      {dayJobs.slice(0, 2).map((job) => (
                        <div key={job.id} className="flex items-center gap-1">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[job.status] ?? 'bg-[#525252]'}`} />
                          <span className="text-xs text-[#A3A3A3] truncate">{job.title}</span>
                        </div>
                      ))}
                      {dayJobs.length > 2 && (
                        <span className="text-xs text-accent">+{dayJobs.length - 2} több</span>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-4 text-xs text-[#525252]">
        {[
          { color: 'bg-blue-400', label: 'Új' },
          { color: 'bg-yellow-400', label: 'Folyamatban' },
          { color: 'bg-green-400', label: 'Kész' },
          { color: 'bg-accent', label: 'Számlázva' },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${l.color}`} />
            {l.label}
          </div>
        ))}
      </div>
    </div>
  );
}
