import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import Icon from '@/components/Icon'

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
    <div className="space-y-6">
      <header className="flex items-end justify-between pt-2">
        <h1 className="title">Progres</h1>
        <Link href="/history" className="text-sm font-semibold text-plate-blue">Riwayat</Link>
      </header>

      {!used.length ? (
        <div className="card py-10 text-center">
          <p className="font-semibold">Grafik muncul setelah latihan pertama</p>
          <p className="muted mt-1">Selesaikan satu sesi untuk mulai melihat progres beban</p>
          <Link href="/workout" className="btn-primary btn-sm mt-4">Mulai latihan</Link>
        </div>
      ) : (
        <div className="list">
          {used.map((e) => (
            <Link key={e.id} href={`/exercises/${e.id}`} className="row">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{e.name}</span>
                <span className="block text-sm text-steel">{[e.muscle_group, e.equipment].filter(Boolean).join(', ')}</span>
              </span>
              <span className="shrink-0 text-sm text-steel">{count.get(e.id)} set</span>
              <Icon name="right" size={18} className="shrink-0 text-steel" />
            </Link>
          ))}
        </div>
      )}

      {unused.length > 0 && (
        <details className="group rounded-[18px] border border-line bg-white">
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3.5 font-semibold">
            Belum pernah dilakukan
            <span className="flex items-center gap-2 text-sm font-normal text-steel">
              {unused.length}
              <Icon name="down" size={16} className="transition group-open:rotate-180" />
            </span>
          </summary>
          <ul className="divide-y divide-line border-t border-line px-4">
            {unused.map((e) => (
              <li key={e.id} className="flex justify-between py-2.5 text-sm">
                <span>{e.name}</span>
                <span className="text-steel">{e.muscle_group}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}
