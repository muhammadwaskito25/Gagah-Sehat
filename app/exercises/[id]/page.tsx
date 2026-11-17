import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ExerciseChart, { type ExPoint } from '@/components/ExerciseChart'
import BackLink from '@/components/BackLink'
import { epley, fmtCardio, fmtDate, fmtNum } from '@/lib/format'

type Row = { weight: number; reps: number; set_type: string; workout_id: string; distance_m: number | null; duration_s: number | null; workouts: { started_at: string; name: string } }

export default async function ExerciseDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const [{ data: ex }, { data: raw }] = await Promise.all([
    supabase.from('exercises').select('id,name,muscle_group,equipment,kind').eq('id', id).single(),
    supabase
      .from('workout_sets')
      .select('weight,reps,set_type,workout_id,distance_m,duration_s,workouts!inner(started_at,name)')
      .eq('exercise_id', id),
  ])
  if (!ex) notFound()

  const rows = ((raw ?? []) as unknown as Row[]).filter((r) => r.set_type !== 'warmup')

  // Agregasi per sesi
  const bySession = new Map<string, { started: string; name: string; sets: Row[] }>()
  for (const r of rows) {
    const s = bySession.get(r.workout_id) ?? { started: r.workouts.started_at, name: r.workouts.name, sets: [] }
    s.sets.push(r)
    bySession.set(r.workout_id, s)
  }
  const sessions = [...bySession.values()].sort((a, b) => a.started.localeCompare(b.started))
  const points: ExPoint[] = sessions.map((s) => ({
    date: new Date(s.started).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
    e1rm: Math.max(...s.sets.map((x) => epley(Number(x.weight), x.reps))),
    maxWeight: Math.max(...s.sets.map((x) => Number(x.weight))),
    volume: s.sets.reduce((v, x) => v + Number(x.weight) * x.reps, 0),
    bestReps: Math.max(...s.sets.map((x) => x.reps)),
  }))

  // ----- Latihan cardio: jarak dan durasi
  if (ex.kind === 'cardio') {
    const cPoints: ExPoint[] = sessions.map((s) => {
      const dist = s.sets.reduce((v, x) => v + Number(x.distance_m ?? 0), 0)
      const dur = s.sets.reduce((v, x) => v + Number(x.duration_s ?? 0), 0)
      return {
        date: new Date(s.started).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
        km: Math.round((dist / 1000) * 100) / 100,
        menit: Math.round((dur / 60) * 10) / 10,
      }
    })
    const totalKm = cPoints.reduce((v, p) => v + Number(p.km), 0)
    const totalMin = cPoints.reduce((v, p) => v + Number(p.menit), 0)
    return (
      <div className="space-y-6">
        <header className="space-y-3 pt-2">
          <BackLink href="/exercises" label="Progres" />
          <div>
            <h1 className="title">{ex.name}</h1>
            <p className="muted mt-2">Cardio{ex.equipment ? `, ${ex.equipment}` : ''}</p>
          </div>
        </header>
        {cPoints.length ? (
          <ExerciseChart data={cPoints} metrics={[{ key: 'menit', label: 'Durasi', unit: 'mnt' }, { key: 'km', label: 'Jarak', unit: 'km' }]} />
        ) : (
          <div className="card muted text-center">Belum ada data</div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Total durasi" value={fmtNum(totalMin)} unit="mnt" />
          <Stat label="Total jarak" value={fmtNum(totalKm)} unit="km" />
        </div>
        <section className="space-y-3">
          <h2 className="section">Riwayat</h2>
          <div className="list">
            {[...sessions].reverse().slice(0, 15).map((s, i) => (
              <div key={i} className="flex justify-between gap-3 px-4 py-3">
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{s.name}</span>
                  <span className="block text-sm text-steel">{fmtDate(s.started)}</span>
                </span>
                <span className="num shrink-0 text-lg">
                  {fmtCardio(s.sets.reduce((v, x) => v + Number(x.distance_m ?? 0), 0), s.sets.reduce((v, x) => v + Number(x.duration_s ?? 0), 0))}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    )
  }

  const heaviest = rows.reduce<Row | null>((b, r) => (!b || Number(r.weight) > Number(b.weight) ? r : b), null)
  const best1rm = rows.reduce((b, r) => Math.max(b, epley(Number(r.weight), r.reps)), 0)
  const bestSetVol = rows.reduce<Row | null>((b, r) => (!b || Number(r.weight) * r.reps > Number(b.weight) * b.reps ? r : b), null)
  const bestSessionVol = Math.max(0, ...points.map((p) => Number(p.volume)))

  return (
    <div className="space-y-6">
      <header className="space-y-3 pt-2">
        <BackLink href="/exercises" label="Progres" />
        <div>
          <h1 className="title">{ex.name}</h1>
          <p className="muted mt-2">{[ex.muscle_group, ex.equipment].filter(Boolean).join(', ')}</p>
        </div>
      </header>

      {points.length ? <ExerciseChart data={points} /> : <div className="card muted text-center">Belum ada data</div>}

      <section className="space-y-3">
        <h2 className="section">Rekor pribadi</h2>
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Beban terberat" value={heaviest ? fmtNum(Number(heaviest.weight)) : '-'} unit="kg" sub={heaviest ? `${heaviest.reps} reps` : ''} />
          <Stat label="Est. 1RM" value={best1rm ? fmtNum(best1rm) : '-'} unit="kg" />
          <Stat label="Set terbaik" value={bestSetVol ? `${fmtNum(Number(bestSetVol.weight))}×${bestSetVol.reps}` : '-'} />
          <Stat label="Volume sesi" value={fmtNum(bestSessionVol)} unit="kg" />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="section">Riwayat</h2>
        <div className="list">
          {[...sessions].reverse().slice(0, 15).map((s, i) => (
            <div key={i} className="px-4 py-3">
              <div className="flex justify-between gap-3 text-sm">
                <span className="truncate font-semibold">{s.name}</span>
                <span className="shrink-0 text-steel">{fmtDate(s.started)}</span>
              </div>
              <div className="num mt-1 text-[17px] text-ink/80">
                {s.sets.map((x) => `${fmtNum(Number(x.weight))}×${x.reps}`).join('   ')}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function Stat({ label, value, unit, sub }: { label: string; value: string; unit?: string; sub?: string }) {
  return (
    <div className="card">
      <div className="text-[13px] text-steel">{label}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="num text-[28px] leading-none">{value}</span>
        {unit && <span className="text-sm text-steel">{unit}</span>}
      </div>
      {sub && <div className="mt-1 text-xs text-steel">{sub}</div>}
    </div>
  )
}
