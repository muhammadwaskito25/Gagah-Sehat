import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { buildCoachReport, fmtD, type Note } from '@/lib/coach-rules'
import CoachApplyButton from '@/components/CoachApplyButton'

export const dynamic = 'force-dynamic'

const ICON: Record<Note['level'], string> = { action: '👉', warn: '⚠️', good: '✅', info: 'ℹ️' }
const COLOR: Record<Note['level'], string> = {
  action: 'border-blue-500/40 bg-blue-500/10',
  warn: 'border-amber-500/40 bg-amber-500/10',
  good: 'border-green-500/30 bg-green-500/5',
  info: 'border-neutral-800 bg-neutral-900',
}
const STATUS: Record<string, { label: string; cls: string }> = {
  up: { label: '↑ Rekor', cls: 'bg-green-500/20 text-green-400' },
  steady: { label: '→ Stabil', cls: 'bg-neutral-800 text-neutral-300' },
  stuck: { label: '■ Stagnan', cls: 'bg-amber-500/20 text-amber-400' },
  down: { label: '↓ Turun', cls: 'bg-red-500/20 text-red-400' },
  new: { label: 'Baru', cls: 'bg-blue-500/20 text-blue-300' },
}

function Notes({ notes }: { notes: Note[] }) {
  return (
    <div className="space-y-2">
      {notes.map((n, i) => (
        <div key={i} className={`flex gap-2 rounded-xl border p-3 text-sm ${COLOR[n.level]}`}>
          <span>{ICON[n.level]}</span>
          <span>{n.text}</span>
        </div>
      ))}
    </div>
  )
}

export default async function CoachPage() {
  const supabase = await createClient()
  const r = await buildCoachReport(supabase)
  // Coach butuh input data diri dulu
  if (!r.profile) redirect('/coach/profile')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="h1">Coach</h1>
          <p className="muted">{r.profile.goal}</p>
        </div>
        <Link href="/coach/profile" className="text-sm text-blue-400">Ubah data</Link>
      </div>

      {r.focus.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-semibold">🎯 Fokus minggu ini</h2>
          <Notes notes={r.focus} />
        </section>
      )}

      <section className="space-y-2">
        <h2 className="font-semibold">🏋 Target sesi berikutnya</h2>
        {!r.targets.length && <p className="muted">Belum ada data latihan</p>}
        {r.targets.map((t) => (
          <Link key={t.exerciseId} href={`/exercises/${t.exerciseId}`} className="card block p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{t.name}</span>
              <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs ${STATUS[t.status].cls}`}>{STATUS[t.status].label}</span>
            </div>
            <div className="mt-1 text-sm text-neutral-400">Terakhir {fmtD(t.lastDate)}: {t.last}</div>
            <div className="mt-1 text-sm">Berikutnya: <span className="font-semibold text-blue-400">{t.next}</span></div>
            <div className="mt-1 text-xs text-neutral-500">{t.note}</div>
          </Link>
        ))}
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">📊 Evaluasi gym</h2>
        <Notes notes={r.gym} />
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">🏃 Evaluasi lari</h2>
        <Notes notes={r.run} />
        {r.zones && (
          <div className="card p-3">
            <div className="mb-2 text-sm font-semibold">Zona pace kamu</div>
            {r.zones.map((z) => (
              <div key={z.label} className="flex items-baseline justify-between gap-2 border-t border-neutral-800 py-2 text-sm first:border-0">
                <div>
                  <div className="font-medium">{z.label}</div>
                  <div className="text-xs text-neutral-500">{z.desc}</div>
                </div>
                <div className="shrink-0 tabular-nums text-blue-400">{z.pace} /km</div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">🗓 Jadwal mingguan</h2>
        <div className="card divide-y divide-neutral-800 p-0">
          {r.week.map((d) => (
            <div key={d.day} className="flex gap-3 px-4 py-2.5 text-sm">
              <span className="w-14 shrink-0 font-medium">{d.day}</span>
              <span className={d.items[0].startsWith('Istirahat') ? 'text-neutral-500' : ''}>{d.items.join(' + ')}</span>
            </div>
          ))}
        </div>
      </section>

      {r.plan.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-semibold">📋 Program gym yang disarankan</h2>
          <p className="muted">Disusun dari tujuan, level, jumlah hari, dan alatmu</p>
          {r.plan.map((p) => (
            <div key={p.name} className="card p-3">
              <div className="mb-1 font-medium">{p.name.replace(' (Coach)', '')}</div>
              {p.exercises.map((e) => (
                <div key={e.name} className="flex justify-between text-sm text-neutral-300">
                  <span>{e.name}</span>
                  <span className="text-neutral-500">{e.sets} × {e.reps} · rest {e.rest}s</span>
                </div>
              ))}
            </div>
          ))}
          <CoachApplyButton routines={r.plan} />
        </section>
      )}
    </div>
  )
}
