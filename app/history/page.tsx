import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { fmtDate, fmtDuration, fmtNum } from '@/lib/format'

export default async function HistoryPage() {
  const supabase = await createClient()
  const { data: workouts } = await supabase
    .from('workouts')
    .select('id,name,started_at,ended_at,workout_sets(weight,reps,exercise_id)')
    .order('started_at', { ascending: false })
    .limit(100)

  return (
    <div className="space-y-4">
      <h1 className="h1">Riwayat Latihan</h1>
      {!workouts?.length && <p className="muted">Belum ada latihan tersimpan</p>}
      {workouts?.map((w) => {
        const sets = w.workout_sets ?? []
        const vol = sets.reduce((v, s) => v + Number(s.weight) * s.reps, 0)
        const exCount = new Set(sets.map((s) => s.exercise_id)).size
        const dur = w.ended_at ? (new Date(w.ended_at).getTime() - new Date(w.started_at).getTime()) / 1000 : 0
        return (
          <Link key={w.id} href={`/history/${w.id}`} className="card block">
            <div className="flex justify-between">
              <h2 className="font-semibold">{w.name}</h2>
              <span className="muted">{fmtDate(w.started_at)}</span>
            </div>
            <div className="mt-1 flex gap-4 text-sm text-neutral-300">
              <span>⏱ {fmtDuration(dur)}</span>
              <span>🏋 {fmtNum(vol)} kg</span>
              <span>{exCount} latihan · {sets.length} set</span>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
