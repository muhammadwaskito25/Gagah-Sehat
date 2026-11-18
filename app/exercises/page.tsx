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
        <Link href="/history" className="text-xs font-bold uppercase tracking-wider text-[#FF5500] hover:underline">
          Riwayat Latihan →
        </Link>
      </header>

      {!used.length ? (
        <div className="card py-10 text-center">
          <p className="font-semibold text-white">Grafik muncul setelah latihan pertama</p>
          <p className="muted mt-1">Selesaikan satu sesi untuk mulai melihat progres beban</p>
          <Link href="/workout" className="btn-primary btn-sm mt-4">Mulai latihan</Link>
        </div>
      ) : (
        <div className="list">
          {used.map((e) => (
            <Link key={e.id} href={`/exercises/${e.id}`} className="row">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-display text-[17px] font-bold text-white">{e.name}</span>
                <span className="block text-xs font-medium text-slate-400">{[e.muscle_group, e.equipment].filter(Boolean).join(' · ')}</span>
              </span>
              <span className="shrink-0 rounded-lg border border-[#202637] bg-[#171B26] px-2.5 py-1 text-xs font-bold text-[#FF5500]">
                {count.get(e.id)} set
              </span>
              <Icon name="right" size={16} className="shrink-0 text-slate-500" />
            </Link>
          ))}
        </div>
      )}

      {unused.length > 0 && (
        <details className="group rounded-[20px] border border-[#202637] bg-[#11141B] shadow-plate">
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3.5 text-sm font-bold uppercase tracking-wider text-slate-300">
            Belum pernah dilakukan
            <span className="flex items-center gap-2 text-xs font-bold text-slate-500">
              {unused.length} latihan
              <Icon name="down" size={16} className="transition group-open:rotate-180" />
            </span>
          </summary>
          <ul className="divide-y divide-[#202637] border-t border-[#202637] px-4">
            {unused.map((e) => (
              <li key={e.id} className="flex justify-between py-2.5 text-xs font-medium">
                <span className="text-slate-300">{e.name}</span>
                <span className="text-slate-500">{e.muscle_group}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}
