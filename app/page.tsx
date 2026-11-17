import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import Icon from '@/components/Icon'
import { fmtDate, fmtDuration, fmtKm, fmtNum, fmtPace, startOfWeekISO } from '@/lib/format'

const DAY_LABEL = ['S', 'S', 'R', 'K', 'J', 'S', 'M']

// index hari 0=Senin ... 6=Minggu, waktu WIB
function dayIdx(iso: string) {
  const d = new Date(new Date(iso).getTime() + 7 * 3600e3)
  return (d.getUTCDay() + 6) % 7
}

export default async function Home() {
  const supabase = await createClient()
  const weekStart = startOfWeekISO()
  const [{ data: weekWorkouts }, { data: weekRuns }, { data: recentW }, { data: recentR }] = await Promise.all([
    supabase.from('workouts').select('id,started_at,ended_at,workout_sets(weight,reps)').gte('started_at', weekStart),
    supabase.from('runs').select('start_date,distance_m,moving_time_s').gte('start_date', weekStart),
    supabase.from('workouts').select('id,name,started_at,ended_at,workout_sets(weight,reps)').order('started_at', { ascending: false }).limit(5),
    supabase.from('runs').select('id,name,start_date,distance_m,moving_time_s').order('start_date', { ascending: false }).limit(5),
  ])

  const wCount = weekWorkouts?.length ?? 0
  const wVol = (weekWorkouts ?? []).flatMap((w) => w.workout_sets ?? []).reduce((v, s) => v + Number(s.weight) * s.reps, 0)
  const rKm = (weekRuns ?? []).reduce((s, r) => s + Number(r.distance_m), 0) / 1000

  const days = DAY_LABEL.map(() => ({ gym: 0, run: 0 }))
  for (const w of weekWorkouts ?? []) days[dayIdx(w.started_at)].gym++
  for (const r of weekRuns ?? []) days[dayIdx(r.start_date)].run++
  const today = dayIdx(new Date().toISOString())

  type Item = { key: string; date: string; kind: 'gym' | 'run'; href: string; title: string; meta: string }
  const feed: Item[] = [
    ...(recentW ?? []).map((w) => {
      const vol = (w.workout_sets ?? []).reduce((v, s) => v + Number(s.weight) * s.reps, 0)
      const dur = w.ended_at ? (new Date(w.ended_at).getTime() - new Date(w.started_at).getTime()) / 1000 : 0
      return { key: 'w' + w.id, date: w.started_at, kind: 'gym' as const, href: `/history/${w.id}`, title: w.name, meta: `${fmtDuration(dur)}, ${fmtNum(vol)} kg` }
    }),
    ...(recentR ?? []).map((r) => ({
      key: 'r' + r.id, date: r.start_date, kind: 'run' as const, href: '/runs', title: r.name ?? 'Lari',
      meta: `${fmtKm(Number(r.distance_m))}, ${fmtPace(r.moving_time_s, Number(r.distance_m))}`,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6)

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between pt-2">
        <h1 className="title">Minggu ini</h1>
        <Link href="/history" className="text-sm font-semibold text-plate-blue">Riwayat</Link>
      </header>

      {/* Barbel mingguan: tiap sesi = satu piringan */}
      <section className="card px-3 pb-3 pt-5">
        <div className="relative grid grid-cols-7">
          <div className="absolute inset-x-1 top-[34px] h-[3px] rounded-full bg-line" />
          {days.map((d, i) => (
            <div key={i} className="relative flex flex-col items-center">
              <div className="flex h-[70px] items-center gap-[3px]">
                {Array.from({ length: d.gym }).map((_, k) => <span key={'g' + k} className="h-[62px] w-[9px] rounded-[3px] bg-plate-blue" />)}
                {Array.from({ length: d.run }).map((_, k) => <span key={'r' + k} className="h-[46px] w-[9px] rounded-[3px] bg-plate-red" />)}
                {!d.gym && !d.run && <span className={`h-2 w-2 rounded-full ${i < today ? 'bg-line' : 'border border-line bg-white'}`} />}
              </div>
              <span className={`mt-2 flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${i === today ? 'bg-ink text-white' : 'text-steel'}`}>{DAY_LABEL[i]}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-3 divide-x divide-line border-t border-line pt-4">
          <Stat value={String(wCount)} unit="sesi" label="Gym" dot="bg-plate-blue" />
          <Stat value={fmtNum(wVol / 1000)} unit="ton" label="Volume" />
          <Stat value={rKm.toFixed(1)} unit="km" label="Lari" dot="bg-plate-red" />
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <Link href="/workout" className="btn-primary h-14"><Icon name="plus" size={18} strokeWidth={2.5} />Latihan baru</Link>
        <Link href="/routines" className="btn-ghost h-14"><Icon name="list" size={18} />Pilih routine</Link>
      </section>


      <section className="space-y-3">
        <h2 className="section">Terakhir</h2>
        {!feed.length ? (
          <div className="card text-center">
            <p className="font-semibold">Belum ada aktivitas</p>
            <p className="muted mt-1">Mulai latihan pertama atau sambungkan Strava di tab Lari</p>
          </div>
        ) : (
          <div className="list">
            {feed.map((f) => (
              <Link key={f.key} href={f.href} className="row">
                <span className={`h-9 w-[7px] shrink-0 rounded-[3px] ${f.kind === 'gym' ? 'bg-plate-blue' : 'bg-plate-red'}`} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{f.title}</span>
                  <span className="block text-sm text-steel">{f.meta}</span>
                </span>
                <span className="shrink-0 text-sm text-steel">{fmtDate(f.date)}</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function Stat({ value, unit, label, dot }: { value: string; unit: string; label: string; dot?: string }) {
  return (
    <div className="px-3 first:pl-1">
      <div className="flex items-center gap-1.5 text-[13px] text-steel">
        {dot && <span className={`h-2 w-2 rounded-full ${dot}`} />}
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="num text-[30px] leading-none">{value}</span>
        <span className="text-sm text-steel">{unit}</span>
      </div>
    </div>
  )
}
