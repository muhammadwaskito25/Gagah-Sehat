import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import BackLink from '@/components/BackLink'
import Icon from '@/components/Icon'
import LogoutButton from '@/components/LogoutButton'
import { fmtNum } from '@/lib/format'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const [{ count: workoutCount }, { data: sets }, { data: runs }, { data: tok }] = await Promise.all([
    supabase.from('workouts').select('id', { count: 'exact', head: true }),
    supabase.from('workout_sets').select('weight,reps'),
    supabase.from('runs').select('distance_m'),
    supabase.from('strava_tokens').select('athlete_id').maybeSingle(),
  ])
  const volume = (sets ?? []).reduce((v, s) => v + Number(s.weight) * s.reps, 0)
  const km = (runs ?? []).reduce((s, r) => s + Number(r.distance_m), 0) / 1000
  const since = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('id-ID', { month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' })
    : ''
  const initial = (user?.email ?? '?')[0].toUpperCase()

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <BackLink href="/" label="Home" />
        <div className="flex items-center gap-4">
          <span className="num flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FF5500] to-[#CC3700] text-3xl font-black text-white shadow-lg shadow-orange-500/25">
            {initial}
          </span>
          <div className="min-w-0">
            <h1 className="truncate font-display text-[26px] font-bold uppercase text-white">{user?.email}</h1>
            {since && <p className="muted">Bergabung sejak {since}</p>}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-3 divide-x divide-[#202637] rounded-[20px] border border-[#202637] bg-[#11141B] py-3.5 shadow-plate">
        {[
          ['Latihan', String(workoutCount ?? 0), 'sesi'],
          ['Volume', fmtNum(volume / 1000), 'ton'],
          ['Lari', km.toFixed(0), 'km'],
        ].map(([l, v, u]) => (
          <div key={l} className="px-4">
            <div className="text-[12px] font-bold uppercase tracking-wider text-slate-400">{l}</div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="num text-2xl font-black text-white">{v}</span>
              <span className="text-xs font-semibold text-slate-400">{u}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="list">
        <Link href="/history" className="row">
          <Icon name="clock" size={20} className="text-steel" />
          <span className="flex-1 font-medium">Riwayat latihan</span>
          <Icon name="right" size={18} className="text-steel" />
        </Link>
        <Link href="/import" className="row">
          <Icon name="up" size={20} className="text-steel" />
          <span className="flex-1 font-medium">Impor dari Hevy</span>
          <Icon name="right" size={18} className="text-steel" />
        </Link>
        <Link href="/runs" className="row">
          <Icon name="run" size={20} className="text-steel" />
          <span className="flex-1 font-medium">Lari</span>
          <Icon name="right" size={18} className="text-steel" />
        </Link>
        <Link href="/runs" className="row">
          <span className="flex h-5 w-5 items-center justify-center rounded bg-[#FC4C02] text-[11px] font-bold text-white">S</span>
          <span className="flex-1 font-medium">Strava</span>
          <span className={`text-sm ${tok ? 'text-plate-green' : 'text-steel'}`}>{tok ? 'Tersambung' : 'Belum tersambung'}</span>
          <Icon name="right" size={18} className="text-steel" />
        </Link>
      </div>

      <LogoutButton />
    </div>
  )
}
