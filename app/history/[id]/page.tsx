import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DeleteButton from '@/components/DeleteButton'
import BackLink from '@/components/BackLink'
import Icon from '@/components/Icon'
import { epley, fmtCardio, fmtDate, fmtDuration, fmtNum } from '@/lib/format'

type SetRow = { position: number; set_index: number; weight: number; reps: number; set_type: string; exercise_id: string; distance_m: number | null; duration_s: number | null; exercises: { name: string; kind?: string | null } | null }

export default async function WorkoutDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: w } = await supabase
    .from('workouts')
    .select('id,name,started_at,ended_at,workout_sets(position,set_index,weight,reps,set_type,exercise_id,distance_m,duration_s,exercises(name,kind))')
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
    <div className="space-y-6">
      <header className="space-y-3 pt-2">
        <BackLink href="/history" label="Riwayat" />
        <div>
          <h1 className="title">{w.name}</h1>
          <p className="muted mt-2">{fmtDate(w.started_at)}</p>
        </div>
      </header>

      <div className="grid grid-cols-3 divide-x divide-[#202637] rounded-[20px] border border-[#202637] bg-[#11141B] py-3.5 shadow-plate">
        {[
          ['Durasi', fmtDuration(dur), ''],
          ['Volume', fmtNum(vol), 'kg'],
          ['Set', String(sets.length), ''],
        ].map(([l, v, u]) => (
          <div key={l} className="px-4">
            <div className="text-[12px] font-bold uppercase tracking-wider text-slate-400">{l}</div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="num text-2xl font-black text-white">{v}</span>
              {u && <span className="text-xs font-semibold text-slate-400">{u}</span>}
            </div>
          </div>
        ))}
      </div>

      {groups.map((g, gi) => {
        const prev = bestBefore.get(g.exerciseId)
        let n = 0
        return (
          <section key={gi} className="rounded-[20px] border border-[#202637] bg-[#11141B] shadow-plate">
            <Link href={`/exercises/${g.exerciseId}`} className="flex items-center justify-between px-4 pb-2 pt-4 transition hover:text-[#FF5500]">
              <span className="font-display text-[20px] font-bold text-white hover:text-[#FF5500]">{g.name}</span>
              <Icon name="right" size={16} className="text-slate-500" />
            </Link>
            <div className="divide-y divide-[#202637] px-4 pb-2">
              {g.sets.map((s, i) => {
                if (s.set_type === 'normal') n++
                const e = epley(Number(s.weight), s.reps)
                const cardio = s.exercises?.kind === 'cardio'
                const isPR = !cardio && prev ? (Number(s.weight) > prev.w || e > prev.e1rm) && s.set_type !== 'warmup' : false
                return (
                  <div key={i} className="flex items-center gap-3 py-2.5">
                    <span className={`num w-6 text-lg ${s.set_type === 'warmup' ? 'text-plate-yellow' : 'text-steel'}`}>
                      {s.set_type === 'normal' ? n : s.set_type[0].toUpperCase()}
                    </span>
                    <span className="num flex-1 text-lg">{cardio ? fmtCardio(s.distance_m, s.duration_s) : `${fmtNum(Number(s.weight))} kg × ${s.reps}`}</span>
                    {isPR && (
                      <span className="tag inline-flex items-center gap-1 bg-plate-yellow/20 text-[#8A6700]">
                        <Icon name="trophy" size={13} />Rekor
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}

      <DeleteButton table="workouts" id={w.id} redirect="/history" label="Hapus latihan ini" />
    </div>
  )
}
