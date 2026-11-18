import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import Icon from '@/components/Icon'
import { fmtDate, fmtDuration, fmtKm, fmtNum, fmtPace, startOfWeekISO } from '@/lib/format'

const DAY_LABEL = ['SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB', 'MIN']

// index hari 0=Senin ... 6=Minggu, waktu WIB
function dayIdx(iso: string) {
  const d = new Date(new Date(iso).getTime() + 7 * 3600e3)
  return (d.getUTCDay() + 6) % 7
}

export default async function Home() {
  const supabase = await createClient()
  const weekStart = startOfWeekISO()
  const [{ data: { user } }, { data: weekWorkouts }, { data: weekRuns }, { data: recentW }, { data: recentR }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('workouts').select('id,started_at,ended_at,workout_sets(weight,reps)').gte('started_at', weekStart),
    supabase.from('runs').select('start_date,distance_m,moving_time_s').gte('start_date', weekStart),
    supabase.from('workouts').select('id,name,started_at,ended_at,workout_sets(weight,reps)').order('started_at', { ascending: false }).limit(6),
    supabase.from('runs').select('id,name,start_date,distance_m,moving_time_s').order('start_date', { ascending: false }).limit(6),
  ])

  const wCount = weekWorkouts?.length ?? 0
  const allSets = (weekWorkouts ?? []).flatMap((w) => w.workout_sets ?? [])
  const wVol = allSets.reduce((v, s) => v + Number(s.weight) * s.reps, 0)
  const wDur = (weekWorkouts ?? []).reduce((t, w) => {
    return t + (w.ended_at ? (new Date(w.ended_at).getTime() - new Date(w.started_at).getTime()) / 1000 : 0)
  }, 0)

  const rCount = weekRuns?.length ?? 0
  const rKm = (weekRuns ?? []).reduce((s, r) => s + Number(r.distance_m), 0) / 1000
  const rDur = (weekRuns ?? []).reduce((t, r) => t + (r.moving_time_s ?? 0), 0)

  const totalSessions = wCount + rCount
  const totalDuration = wDur + rDur

  const days = DAY_LABEL.map(() => ({ gym: 0, run: 0 }))
  for (const w of weekWorkouts ?? []) days[dayIdx(w.started_at)].gym++
  for (const r of weekRuns ?? []) days[dayIdx(r.start_date)].run++
  const today = dayIdx(new Date().toISOString())
  const daysActive = days.filter((d) => d.gym > 0 || d.run > 0).length

  type Item = { key: string; date: string; kind: 'gym' | 'run'; href: string; title: string; meta: string; sub: string }
  const feed: Item[] = [
    ...(recentW ?? []).map((w) => {
      const sets = w.workout_sets ?? []
      const vol = sets.reduce((v, s) => v + Number(s.weight) * s.reps, 0)
      const dur = w.ended_at ? (new Date(w.ended_at).getTime() - new Date(w.started_at).getTime()) / 1000 : 0
      return {
        key: 'w' + w.id,
        date: w.started_at,
        kind: 'gym' as const,
        href: `/history/${w.id}`,
        title: w.name,
        meta: `${sets.length} Set · ${fmtNum(vol)} kg`,
        sub: fmtDuration(dur),
      }
    }),
    ...(recentR ?? []).map((r) => ({
      key: 'r' + r.id,
      date: r.start_date,
      kind: 'run' as const,
      href: '/runs',
      title: r.name ?? 'Lari',
      meta: `${fmtKm(Number(r.distance_m))} · ${fmtPace(r.moving_time_s, Number(r.distance_m))}`,
      sub: fmtDuration(r.moving_time_s),
    })),
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5)

  const username = user?.email?.split('@')[0] ?? 'Bro'

  return (
    <div className="space-y-6 pb-6">
      {/* Header Identitas Gagah */}
      <header className="flex items-center justify-between pt-1">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-[#FF5500] animate-pulse" />
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#FF5500]">GAGAH TRAINING</span>
          </div>
          <h1 className="title mt-0.5 tracking-tight">Halo, {username}</h1>
        </div>
        <Link
          href="/profile"
          aria-label="Profile"
          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#202637] bg-[#11141B] text-slate-200 transition hover:border-[#FF5500]/50 hover:text-white"
        >
          <Icon name="user" size={20} />
        </Link>
      </header>

      {/* Hero Progres & Barbel Aktivitas Mingguan */}
      <section className="relative overflow-hidden rounded-[24px] border border-[#202637] bg-gradient-to-b from-[#141924] to-[#0F1219] p-5 shadow-2xl">
        {/* Glow ambient background */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#FF5500]/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 -bottom-16 h-48 w-48 rounded-full bg-[#00B4D8]/10 blur-3xl" />

        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">AKTIVITAS MINGGU INI</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="num text-3xl font-extrabold text-white">{daysActive}</span>
              <span className="text-sm font-semibold text-slate-400">/ 7 hari aktif</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1">
            <Icon name="flame" size={15} className="text-[#FF5500]" />
            <span className="text-xs font-bold text-[#FF5500]">
              {daysActive >= 4 ? 'DISIPLIN TINGGI' : daysActive >= 1 ? 'ON TRACK' : 'SIAP TEMPUR'}
            </span>
          </div>
        </div>

        {/* Barbel Aktivitas Harian */}
        <div className="mt-6 rounded-2xl border border-[#1F2537] bg-[#0A0C11]/70 p-4">
          <div className="relative grid grid-cols-7 gap-1">
            {/* Batang Besi Barbel */}
            <div className="absolute inset-x-2 top-[32px] h-[4px] rounded-full bg-[#202637]" />

            {days.map((d, i) => {
              const isToday = i === today
              const hasActivity = d.gym > 0 || d.run > 0
              return (
                <div key={i} className="relative flex flex-col items-center">
                  {/* Piringan Beban Barbel */}
                  <div className="flex h-[66px] items-center justify-center gap-[3px]">
                    {Array.from({ length: d.gym }).map((_, k) => (
                      <span
                        key={'g' + k}
                        title="Gym Session"
                        className="h-[58px] w-[8px] rounded-[3px] bg-gradient-to-t from-[#FF4500] to-[#FF6B00] shadow-[0_0_8px_rgba(255,85,0,0.4)]"
                      />
                    ))}
                    {Array.from({ length: d.run }).map((_, k) => (
                      <span
                        key={'r' + k}
                        title="Run Session"
                        className="h-[44px] w-[8px] rounded-[3px] bg-gradient-to-t from-[#0090B0] to-[#00D4FF] shadow-[0_0_8px_rgba(0,180,216,0.4)]"
                      />
                    ))}
                    {!hasActivity && (
                      <span
                        className={`h-2.5 w-2.5 rounded-full transition ${
                          isToday ? 'border-2 border-[#FF5500] bg-transparent' : 'bg-[#1F2537]'
                        }`}
                      />
                    )}
                  </div>

                  {/* Label Hari */}
                  <div className="mt-2 text-center">
                    <span
                      className={`block rounded-lg px-1.5 py-0.5 text-[10px] font-black tracking-tight ${
                        isToday
                          ? 'bg-[#FF5500] text-white shadow-md shadow-orange-500/30'
                          : hasActivity
                          ? 'text-white'
                          : 'text-slate-500'
                      }`}
                    >
                      {DAY_LABEL[i]}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Legenda Indikator */}
          <div className="mt-4 flex items-center justify-center gap-5 border-t border-[#1C212F] pt-3 text-[11px] font-semibold text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-[#FF5500]" /> Gym ({wCount})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-[#00B4D8]" /> Lari ({rCount})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full border border-slate-600" /> Istirahat
            </span>
          </div>
        </div>

        {/* 4 Kartu Metrik Tempur (2x2 Grid) */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          {/* Card 1: Volume */}
          <div className="rounded-2xl border border-[#202637] bg-[#0E1118] p-3.5 transition hover:border-slate-700">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-bold uppercase tracking-wider">Total Volume</span>
              <span className="text-[#FF5500]">🏋️</span>
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="num text-2xl font-black text-white">{wVol > 0 ? fmtNum(wVol / 1000) : '0'}</span>
              <span className="text-xs font-semibold text-slate-400">ton</span>
            </div>
            <span className="mt-1 block text-[11px] text-slate-400">{allSets.length} set terselesaikan</span>
          </div>

          {/* Card 2: Lari */}
          <Link
            href="/runs"
            className="group rounded-2xl border border-[#202637] bg-[#0E1118] p-3.5 transition hover:border-[#00B4D8]/50"
          >
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-bold uppercase tracking-wider group-hover:text-[#00B4D8] transition">Jarak Lari</span>
              <Icon name="right" size={14} className="text-slate-500 group-hover:text-[#00B4D8] transition" />
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="num text-2xl font-black text-white">{rKm.toFixed(1)}</span>
              <span className="text-xs font-semibold text-slate-400">km</span>
            </div>
            <span className="mt-1 block text-[11px] text-slate-400">{rCount} sesi lari minggu ini</span>
          </Link>

          {/* Card 3: Total Sesi */}
          <div className="rounded-2xl border border-[#202637] bg-[#0E1118] p-3.5 transition hover:border-slate-700">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-bold uppercase tracking-wider">Total Sesi</span>
              <Icon name="dumbbell" size={14} className="text-slate-400" />
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="num text-2xl font-black text-white">{totalSessions}</span>
              <span className="text-xs font-semibold text-slate-400">sesi</span>
            </div>
            <span className="mt-1 block text-[11px] text-slate-400">{wCount} Gym + {rCount} Lari</span>
          </div>

          {/* Card 4: Waktu Latihan */}
          <div className="rounded-2xl border border-[#202637] bg-[#0E1118] p-3.5 transition hover:border-slate-700">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-bold uppercase tracking-wider">Durasi Aktif</span>
              <Icon name="clock" size={14} className="text-slate-400" />
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="num text-2xl font-black text-white">
                {totalDuration > 0 ? fmtDuration(totalDuration) : '0m'}
              </span>
            </div>
            <span className="mt-1 block text-[11px] text-slate-400">Waktu bergerak efektif</span>
          </div>
        </div>
      </section>

      {/* Tombol Aksi Cepat (Action Launchpad) */}
      <section className="grid grid-cols-2 gap-3">
        <Link
          href="/workout"
          className="group relative flex flex-col justify-between overflow-hidden rounded-[22px] border border-orange-500/30 bg-gradient-to-br from-[#FF5500] to-[#CC3700] p-4 text-white shadow-lg shadow-orange-500/20 transition active:scale-[0.98]"
        >
          <div className="flex items-center justify-between">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-black/25 text-white backdrop-blur">
              <Icon name="dumbbell" size={20} strokeWidth={2.4} />
            </span>
            <Icon name="plus" size={18} strokeWidth={3} className="text-white/80" />
          </div>
          <div className="mt-4">
            <span className="block font-display text-[20px] font-black uppercase leading-tight tracking-wide">
              MULAI GYM
            </span>
            <span className="block text-xs font-medium text-white/80">Catat beban & set</span>
          </div>
        </Link>

        <Link
          href="/runs"
          className="group relative flex flex-col justify-between overflow-hidden rounded-[22px] border border-[#202637] bg-[#11141B] p-4 text-white shadow-plate transition hover:border-[#00B4D8]/50 active:scale-[0.98]"
        >
          <div className="flex items-center justify-between">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00B4D8]/10 text-[#00B4D8]">
              <Icon name="run" size={20} strokeWidth={2.4} />
            </span>
            <Icon name="right" size={16} className="text-slate-500 group-hover:text-[#00B4D8] transition" />
          </div>
          <div className="mt-4">
            <span className="block font-display text-[20px] font-black uppercase leading-tight tracking-wide">
              LARI / CARDIO
            </span>
            <span className="block text-xs font-medium text-slate-400">Pace, interval & Strava</span>
          </div>
        </Link>
      </section>

      {/* Aktivitas Terakhir (Log Tempur) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="section">Log Terakhir</h2>
          <Link href="/history" className="text-xs font-bold uppercase tracking-wider text-[#FF5500] hover:underline">
            Lihat Semua →
          </Link>
        </div>

        {!feed.length ? (
          <div className="card py-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#1A1F2D] text-slate-400">
              <Icon name="dumbbell" size={24} />
            </div>
            <p className="mt-3 font-display text-lg font-bold uppercase text-white">Belum Ada Catatan Tempur</p>
            <p className="muted mx-auto mt-1 max-w-[20rem]">
              Selesaikan sesi gym pertamamu atau sinkronkan lari Strava untuk melihat data progres.
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <Link href="/workout" className="btn-primary btn-sm">Mulai Latihan</Link>
              <Link href="/runs" className="btn-dark btn-sm">Buka Lari</Link>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {feed.map((f) => {
              const isGym = f.kind === 'gym'
              return (
                <Link
                  key={f.key}
                  href={f.href}
                  className="group flex items-center gap-3.5 rounded-2xl border border-[#202637] bg-[#11141B] p-3.5 transition hover:border-slate-600 hover:bg-[#151923]"
                >
                  {/* Indikator Jenis Latihan */}
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                      isGym
                        ? 'border border-orange-500/20 bg-orange-500/10 text-[#FF5500]'
                        : 'border border-cyan-500/20 bg-cyan-500/10 text-[#00B4D8]'
                    }`}
                  >
                    <Icon name={isGym ? 'dumbbell' : 'run'} size={20} strokeWidth={2.2} />
                  </div>

                  {/* Detail Latihan */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-display text-[17px] font-bold text-white group-hover:text-[#FF5500] transition">
                        {f.title}
                      </span>
                      <span className="shrink-0 text-xs font-semibold text-slate-400">{fmtDate(f.date)}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                      <span className="font-semibold text-slate-300">{f.meta}</span>
                      <span>·</span>
                      <span>{f.sub}</span>
                    </div>
                  </div>

                  <Icon name="right" size={16} className="text-slate-600 transition group-hover:text-white" />
                </Link>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
