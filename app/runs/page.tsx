import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import StravaPanel from '@/components/StravaPanel'
import ManualRunForm from '@/components/ManualRunForm'
import RunCharts, { type PacePoint, type WeekPoint } from '@/components/RunCharts'
import { runTypeLabel } from '@/lib/run'
import { fmtDate, fmtDuration, fmtKm, fmtPace, startOfWeekISO } from '@/lib/format'

export default async function RunsPage({ searchParams }: { searchParams: Promise<{ strava?: string }> }) {
  const { strava } = await searchParams
  const supabase = await createClient()
  const [{ data: runs }, { data: tok }] = await Promise.all([
    supabase.from('runs').select('*, run_routines(name,run_type)').order('start_date', { ascending: false }),
    supabase.from('strava_tokens').select('athlete_id').maybeSingle(),
  ])
  const list = runs ?? []

  // Jarak per minggu, 12 minggu terakhir
  const thisWeek = new Date(startOfWeekISO()).getTime()
  const WEEK = 7 * 86400e3
  const weeks: WeekPoint[] = Array.from({ length: 12 }, (_, i) => {
    const start = thisWeek - (11 - i) * WEEK
    const km = list
      .filter((r) => {
        const t = new Date(r.start_date).getTime()
        return t >= start && t < start + WEEK
      })
      .reduce((s, r) => s + Number(r.distance_m) / 1000, 0)
    const d = new Date(start + 7 * 3600e3)
    return { week: `${d.getUTCDate()}/${d.getUTCMonth() + 1}`, km: Math.round(km * 10) / 10 }
  })

  // Pace 20 lari terakhir (min 1 km)
  const paces: PacePoint[] = list
    .filter((r) => Number(r.distance_m) >= 1000)
    .slice(0, 20)
    .reverse()
    .map((r) => ({
      date: new Date(r.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
      pace: Math.round(r.moving_time_s / (Number(r.distance_m) / 1000)),
    }))

  const total = list.reduce((s, r) => s + Number(r.distance_m), 0)
  const longest = list.reduce((m, r) => Math.max(m, Number(r.distance_m)), 0)
  const best5k = list
    .filter((r) => Number(r.distance_m) >= 5000)
    .reduce((m, r) => Math.min(m, r.moving_time_s / (Number(r.distance_m) / 1000)), Infinity)

  return (
    <div className="space-y-6">
      <header className="pt-2">
        <h1 className="title">Lari</h1>
      </header>

      {strava === 'connected' && <p className="card border-plate-green/40 text-sm">Strava tersambung. Tekan Sinkronkan untuk menarik data lari</p>}
      {strava === 'error' && <p className="card border-plate-red/40 text-sm">Gagal menyambungkan Strava. Coba lagi</p>}

      <div className="grid grid-cols-3 divide-x divide-line rounded-[18px] border border-line bg-white py-3">
        {[
          ['Total', (total / 1000).toFixed(0), 'km'],
          ['Terjauh', (longest / 1000).toFixed(1), 'km'],
          ['Pace 5K+', isFinite(best5k) ? fmtPace(best5k, 1000).replace(' /km', '') : '-', '/km'],
        ].map(([l, v, u]) => (
          <div key={l} className="px-4">
            <div className="text-[13px] text-steel">{l}</div>
            <div className="mt-0.5 flex items-baseline gap-1"><span className="num text-2xl leading-none">{v}</span><span className="text-sm text-steel">{u}</span></div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link href="/runs/start" className="btn h-12 bg-plate-red text-white">Mulai lari</Link>
        <Link href="/routines" className="btn-ghost h-12">Routine lari</Link>
      </div>

      <StravaPanel connected={!!tok} />
      <RunCharts weeks={weeks} paces={paces} />
      <ManualRunForm />

      <section className="space-y-3">
        <h2 className="section">Aktivitas</h2>
        {!list.length ? (
          <div className="card py-8 text-center">
            <p className="font-semibold">Belum ada data lari</p>
            <p className="muted mt-1">Sambungkan Strava atau catat lari secara manual</p>
          </div>
        ) : (
          <div className="list">
            {list.slice(0, 50).map((r) => (
              <div key={r.id} className="row">
                <span className="h-9 w-[7px] shrink-0 rounded-[3px] bg-plate-red" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate font-semibold">{r.name ?? 'Lari'}</span>
                    {r.source === 'strava' && <span className="tag shrink-0 bg-[#FC4C02]/10 text-[#C23A00]">Strava</span>}
                    {r.run_routines && <span className="tag shrink-0 bg-plate-red/10 text-plate-red">{runTypeLabel(r.run_routines.run_type)}</span>}
                  </span>
                  <span className="block text-sm text-steel">
                    {fmtKm(Number(r.distance_m))}, {fmtDuration(r.moving_time_s)}, {fmtPace(r.moving_time_s, Number(r.distance_m))}
                    {r.avg_hr ? `, ${Math.round(Number(r.avg_hr))} bpm` : ''}
                  </span>
                  {r.notes && <span className="block truncate text-[13px] text-steel/80">{r.notes}</span>}
                </span>
                <span className="shrink-0 text-sm text-steel">{fmtDate(r.start_date)}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
