import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function ExercisesPage() {
  const supabase = await createClient()
  const [{ data: exercises }, { data: sets }] = await Promise.all([
    supabase.from('exercises').select('id,name,muscle_group,equipment').order('name'),
    supabase.from('workout_sets').select('exercise_id'),
  ])
  const count = new Map<string, number>()
  for (const s of sets ?? []) count.set(s.exercise_id, (count.get(s.exercise_id) ?? 0) + 1)

  const used = (exercises ?? []).filter((e) => count.has(e.id)).sort((a, b) => count.get(b.id)! - count.get(a.id)!)
  const unused = (exercises ?? []).filter((e) => !count.has(e.id))

  return (
    <div className="space-y-4">
      <h1 className="h1">Progres Latihan</h1>
      {!used.length && <p className="muted">Selesaikan latihan pertama untuk lihat grafik progres</p>}
      <div className="space-y-2">
        {used.map((e) => (
          <Link key={e.id} href={`/exercises/${e.id}`} className="card flex items-center justify-between p-3">
            <div>
              <div className="font-medium">{e.name}{e.equipment && <span className="text-neutral-400"> ({e.equipment})</span>}</div>
              <div className="muted">{e.muscle_group}</div>
            </div>
            <span className="muted">{count.get(e.id)} set →</span>
          </Link>
        ))}
      </div>
      {unused.length > 0 && (
        <details className="card">
          <summary className="cursor-pointer text-neutral-300">Belum pernah dilakukan ({unused.length})</summary>
          <ul className="mt-2 space-y-1 text-sm text-neutral-400">
            {unused.map((e) => <li key={e.id}>{e.name} · {e.muscle_group}</li>)}
          </ul>
        </details>
      )}
      <Link href="/history" className="btn-ghost block text-center">Lihat riwayat latihan</Link>
    </div>
  )
}
