import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { buildCoachReport, fmtD, type Note } from '@/lib/coach-rules'
import CoachApplyButton from '@/components/CoachApplyButton'
import Icon from '@/components/Icon'

export const dynamic = 'force-dynamic'

const BAR: Record<Note['level'], string> = {
  action: 'bg-plate-blue',
  warn: 'bg-plate-yellow',
  good: 'bg-plate-green',
  info: 'bg-line',
}
const STATUS: Record<string, { label: string; cls: string }> = {
  up: { label: 'Rekor', cls: 'bg-plate-green/15 text-plate-green' },
  steady: { label: 'Stabil', cls: 'bg-chalk text-steel' },
  stuck: { label: 'Stagnan', cls: 'bg-plate-yellow/20 text-[#8A6700]' },
  down: { label: 'Turun', cls: 'bg-plate-red/10 text-plate-red' },
  new: { label: 'Baru', cls: 'bg-plate-blue/10 text-plate-blue' },
}

function Notes({ notes }: { notes: Note[] }) {
  if (!notes.length) return null
  return (
    <div className="list">
      {notes.map((n, i) => (
        <div key={i} className="flex gap-3 px-4 py-3.5">
          <span className={`mt-1 w-1 shrink-0 self-stretch rounded-full ${BAR[n.level]}`} />
          <p className="text-[15px] leading-relaxed">{n.text}</p>
        </div>
      ))}
    </div>
  )
}

export default async function CoachPage() {
  const supabase = await createClient()
  const r = await buildCoachReport(supabase)
  if (!r.profile) redirect('/coach/profile')

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between gap-3 pt-2">
        <div className="min-w-0">
          <h1 className="title">Coach</h1>
          <p className="muted mt-2 truncate">{r.profile.goal}</p>
        </div>
        <Link href="/coach/profile" className="btn-ghost btn-sm shrink-0">Ubah data</Link>
      </header>

      {r.focus.length > 0 && (
        <section className="space-y-3">
          <h2 className="section">Fokus minggu ini</h2>
          <ol className="space-y-2">
            {r.focus.map((n, i) => (
              <li key={i} className="flex gap-3 rounded-[18px] bg-ink p-4 text-white">
                <span className="num flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-base">{i + 1}</span>
                <p className="text-[15px] leading-relaxed text-white/90">{n.text}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="section">Target sesi berikutnya</h2>
        {!r.targets.length ? (
          <div className="card muted text-center">Selesaikan latihan dulu untuk dapat target</div>
        ) : (
          <div className="list">
            {r.targets.map((t) => (
              <Link key={t.exerciseId} href={`/exercises/${t.exerciseId}`} className="block px-4 py-3.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-semibold">{t.name}</span>
                  <span className={`tag shrink-0 ${STATUS[t.status].cls}`}>{STATUS[t.status].label}</span>
                </div>
                <div className="num mt-1.5 text-[22px] leading-tight text-plate-blue">{t.next}</div>
                <div className="mt-1 text-sm text-steel">Terakhir {fmtD(t.lastDate)}: {t.last}</div>
                <div className="mt-1 text-[13px] leading-snug text-steel/90">{t.note}</div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="section">Evaluasi gym</h2>
        <Notes notes={r.gym} />
      </section>

      <section className="space-y-3">
        <h2 className="section">Evaluasi lari</h2>
        <Notes notes={r.run} />
        {r.zones && (
          <div className="list">
            {r.zones.map((z) => (
              <div key={z.label} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <div className="font-semibold">{z.label}</div>
                  <div className="text-[13px] text-steel">{z.desc}</div>
                </div>
                <div className="num shrink-0 text-lg">{z.pace}<span className="ml-1 text-sm font-normal text-steel">/km</span></div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="section">Jadwal mingguan</h2>
        <div className="list">
          {r.week.map((d) => {
            const rest = d.items[0].startsWith('Istirahat')
            return (
              <div key={d.day} className="grid grid-cols-[4.5rem_1fr] gap-2 px-4 py-3">
                <span className="font-semibold">{d.day}</span>
                <div className="space-y-1">
                  {d.items.map((it, i) => (
                    <div key={i} className={`flex items-center gap-2 text-[15px] ${rest ? 'text-steel' : ''}`}>
                      {!rest && <span className={`h-4 w-[5px] shrink-0 rounded-[2px] ${it.startsWith('Gym') ? 'bg-plate-blue' : 'bg-plate-red'}`} />}
                      {it.replace(/^Gym: /, '')}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {r.plan.length > 0 && (
        <section className="space-y-3">
          <div>
            <h2 className="section">Program gym yang disarankan</h2>
            <p className="muted mt-1">Disusun dari tujuan, level, jumlah hari, dan alatmu</p>
          </div>
          {r.plan.map((p) => (
            <div key={p.name} className="card">
              <div className="mb-2 font-display text-[20px] font-semibold">{p.name.replace(' (Coach)', '')}</div>
              <div className="divide-y divide-line">
                {p.exercises.map((e) => (
                  <div key={e.name} className="flex items-center justify-between gap-3 py-2 text-[15px]">
                    <span className="truncate">{e.name}</span>
                    <span className="num shrink-0 text-steel">{e.sets} × {e.reps}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <CoachApplyButton routines={r.plan} />
        </section>
      )}
    </div>
  )
}
