import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DeleteButton from '@/components/DeleteButton'
import { epley, fmtDate, fmtDuration, fmtNum } from '@/lib/format'

type SetRow = { position: number; set_index: number; weight: number; reps: number; set_type: string; exercise_id: string; exercises: { name: string } | null }

export default async function WorkoutDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: w } = await supabase
    .from('workouts')
    .select('id,name,started_at,ended_at,workout_sets(position,set_index,weight,reps,set_type,exercise_id,exercises(name))')
    .eq('id', id)
    .single()
  if (!w) notFound()

  const sets = (w.workout_sets as unknown as SetRow[]).sort((a, b) => a.position - b.position || a.set_index - b.set_index)
  const groups: { exerciseId: string; name: string; sets: SetRow[] }[] = []
  for (const s of sets) {
    const g = groups.find((x) => x.exerciseId === s.exercise_id && x.sets[0].position === s.position)
    if (g) g.sets.push(s)
    else groups.push({ exerciseId: s.exercise_id, name: s.exercises?.name ?? '', sets: [s] })
  }

  // Cek PR: bandingkan dengan semua set sebelum sesi ini
  const exIds = [...new Set(sets.map((s) => s.exercise_id))]
  const { data: older } = await supabase
    .from('workout_sets')
    .select('exercise_id,weight,reps,workouts!inner(started_at)')
    .in('exercise_id', exIds)
    .lt('workouts.started_at', w.started_at)
  const bestBefore = new Map<string, { w: number; e1rm: number }>()
  for (const o of older ?? []) {
    const b = bestBefore.get(o.exercise_id) ?? { w: 0, e1rm: 0 }
    b.w = Math.max(b.w, Number(o.weight))
    b.e1rm = Math.max(b.e1rm, epley(Number(o.weight), o.reps))
    bestBefore.set(o.exercise_id, b)
  }

  const vol = sets.reduce((v, s) => v + Number(s.weight) * s.reps, 0)
  const dur = w.ended_at ? (new Date(w.ended_at).getTime() - new Date(w.started_at).getTime()) / 1000 : 0

  return (
    <div className="space-y-4">
      <Link href="/history" className="muted">← Riwayat</Link>
      <div>
        <h1 className="h1">{w.name}</h1>
        <p className="muted">{fmtDate(w.started_at)}</p>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="card p-3"><div className="muted">Durasi</div><div className="font-semibold">{fmtDuration(dur)}</div></div>
        <div className="card p-3"><div className="muted">Volume</div><div className="font-semibold">{fmtNum(vol)} kg</div></div>
        <div className="card p-3"><div className="muted">Set</div><div className="font-semibold">{sets.length}</div></div>
      </div>

      {groups.map((g, gi) => {
        const prev = bestBefore.get(g.exerciseId)
        let n = 0
        return (
          <div key={gi} className="card">
            <Link href={`/exercises/${g.exerciseId}`} className="font-semibold text-blue-400">{g.name}</Link>
            <div className="mt-2 space-y-1">
              {g.sets.map((s, i) => {
                if (s.set_type === 'normal') n++
                const e = epley(Number(s.weight), s.reps)
                const isPR = prev ? (Number(s.weight) > prev.w || e > prev.e1rm) && s.set_type !== 'warmup' : false
                return (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="w-8 text-neutral-400">{s.set_type === 'normal' ? n : s.set_type[0].toUpperCase()}</span>
                    <span className="flex-1">{fmtNum(Number(s.weight))} kg × {s.reps}</span>
                    {isPR && <span className="rounded-md bg-amber-500/20 px-2 py-0.5 text-xs text-amber-400">🏆 PR</span>}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      <DeleteButton table="workouts" id={w.id} redirect="/history" label="Hapus latihan ini" />
    </div>
  )
}
