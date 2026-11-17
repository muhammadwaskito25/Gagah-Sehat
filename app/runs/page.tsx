import { createClient } from '@/lib/supabase/server'
import StravaPanel from '@/components/StravaPanel'
import ManualRunForm from '@/components/ManualRunForm'
import RunCharts, { type PacePoint, type WeekPoint } from '@/components/RunCharts'
import { fmtDate, fmtDuration, fmtKm, fmtPace, startOfWeekISO } from '@/lib/format'

export default async function RunsPage({ searchParams }: { searchParams: Promise<{ strava?: string }> }) {
  const { strava } = await searchParams
  const supabase = await createClient()
  const [{ data: runs }, { data: tok }] = await Promise.all([
    supabase.from('runs').select('*').order('start_date', { ascending: false }),
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
    <div className="space-y-4">
      <h1 className="h1">Lari</h1>
      {strava === 'connected' && <p className="text-sm text-green-400">Strava terhubung. Tekan Sync untuk tarik data</p>}
      {strava === 'error' && <p className="text-sm text-red-400">Gagal menghubungkan Strava, coba lagi</p>}

      <StravaPanel connected={!!tok} />

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="card p-3"><div className="muted">Total</div><div className="font-semibold">{(total / 1000).toFixed(0)} km</div></div>
        <div className="card p-3"><div className="muted">Terjauh</div><div className="font-semibold">{(longest / 1000).toFixed(1)} km</div></div>
        <div className="card p-3"><div className="muted">Pace 5K+</div><div className="font-semibold">{isFinite(best5k) ? fmtPace(best5k, 1000).replace(' /km', '') : '-'}</div></div>
      </div>

      <RunCharts weeks={weeks} paces={paces} />
      <ManualRunForm />

      <h2 className="font-semibold">Aktivitas</h2>
      {!list.length && <p className="muted">Belum ada data lari</p>}
      {list.slice(0, 50).map((r) => (
        <div key={r.id} className="card p-3">
          <div className="flex justify-between">
            <span className="font-medium">{r.name ?? 'Lari'}</span>
            <span className="muted">{fmtDate(r.start_date)}</span>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 text-sm text-neutral-300">
            <span>{fmtKm(Number(r.distance_m))}</span>
            <span>{fmtDuration(r.moving_time_s)}</span>
            <span>{fmtPace(r.moving_time_s, Number(r.distance_m))}</span>
            {r.avg_hr && <span>♥ {Math.round(Number(r.avg_hr))}</span>}
            {r.source === 'strava' && <span className="text-[#fc4c02]">Strava</span>}
          </div>
        </div>
      ))}
    </div>
  )
}
