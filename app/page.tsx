import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { fmtDate, fmtDuration, fmtKm, fmtNum, fmtPace, startOfWeekISO } from '@/lib/format'

export default async function Home() {
  const supabase = await createClient()
  const weekStart = startOfWeekISO()
  const [{ data: weekWorkouts }, { data: weekRuns }, { data: recentW }, { data: recentR }] = await Promise.all([
    supabase.from('workouts').select('id,started_at,ended_at,workout_sets(weight,reps)').gte('started_at', weekStart),
    supabase.from('runs').select('distance_m,moving_time_s').gte('start_date', weekStart),
    supabase.from('workouts').select('id,name,started_at,ended_at,workout_sets(weight,reps)').order('started_at', { ascending: false }).limit(5),
    supabase.from('runs').select('id,name,start_date,distance_m,moving_time_s').order('start_date', { ascending: false }).limit(5),
  ])

  const wCount = weekWorkouts?.length ?? 0
  const wVol = (weekWorkouts ?? []).flatMap((w) => w.workout_sets ?? []).reduce((v, s) => v + Number(s.weight) * s.reps, 0)
  const rKm = (weekRuns ?? []).reduce((s, r) => s + Number(r.distance_m), 0)

  type Item = { key: string; date: string; el: React.ReactNode }
  const feed: Item[] = [
    ...(recentW ?? []).map((w) => {
      const vol = (w.workout_sets ?? []).reduce((v, s) => v + Number(s.weight) * s.reps, 0)
      const dur = w.ended_at ? (new Date(w.ended_at).getTime() - new Date(w.started_at).getTime()) / 1000 : 0
      return {
        key: 'w' + w.id,
        date: w.started_at,
        el: (
          <Link href={`/history/${w.id}`} className="card block p-3">
            <div className="flex justify-between"><span className="font-medium">🏋 {w.name}</span><span className="muted">{fmtDate(w.started_at)}</span></div>
            <div className="muted mt-1">{fmtDuration(dur)} · {fmtNum(vol)} kg · {w.workout_sets?.length ?? 0} set</div>
          </Link>
        ),
      }
    }),
    ...(recentR ?? []).map((r) => ({
      key: 'r' + r.id,
      date: r.start_date,
      el: (
        <Link href="/runs" className="card block p-3">
          <div className="flex justify-between"><span className="font-medium">🏃 {r.name ?? 'Lari'}</span><span className="muted">{fmtDate(r.start_date)}</span></div>
          <div className="muted mt-1">{fmtKm(Number(r.distance_m))} · {fmtDuration(r.moving_time_s)} · {fmtPace(r.moving_time_s, Number(r.distance_m))}</div>
        </Link>
      ),
    })),
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 8)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="h1">Minggu ini</h1>
        <Link href="/history" className="text-sm text-blue-400">Riwayat</Link>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="card p-3"><div className="muted">Latihan</div><div className="text-xl font-bold">{wCount}</div></div>
        <div className="card p-3"><div className="muted">Volume</div><div className="text-xl font-bold">{fmtNum(wVol / 1000)}t</div></div>
        <div className="card p-3"><div className="muted">Lari</div><div className="text-xl font-bold">{(rKm / 1000).toFixed(1)}km</div></div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Link href="/routines" className="btn-primary text-center">Mulai Routine</Link>
        <Link href="/workout" className="btn-ghost text-center">Latihan Kosong</Link>
      </div>

      <Link href="/coach" className="card flex items-center justify-between border-blue-500/40 bg-blue-500/10">
        <div>
          <div className="font-semibold">✦ Tanya Coach</div>
          <div className="muted">Evaluasi program gym + lari dari datamu</div>
        </div>
        <span className="text-blue-400">→</span>
      </Link>

      <div className="space-y-2">
        <h2 className="font-semibold">Aktivitas terakhir</h2>
        {!feed.length && <p className="muted">Belum ada aktivitas. Gas latihan pertama 💪</p>}
        {feed.map((f) => <div key={f.key}>{f.el}</div>)}
      </div>
    </div>
  )
}
