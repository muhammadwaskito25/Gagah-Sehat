import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function RoutinesPage() {
  const supabase = await createClient()
  const { data: routines } = await supabase
    .from('routines')
    .select('id,name,routine_exercises(position,exercises(name))')
    .order('created_at')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="h1">Routine</h1>
        <Link href="/routines/new" className="btn-primary py-1.5 text-sm">+ Baru</Link>
      </div>

      <Link href="/workout" className="btn-ghost block text-center">Mulai latihan kosong</Link>

      {!routines?.length && <p className="muted">Belum ada routine. Bikin dulu, misal Push / Pull / Legs</p>}

      {routines?.map((r) => {
        const names = [...(r.routine_exercises ?? [])]
          .sort((a, b) => a.position - b.position)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((re: any) => re.exercises?.name)
          .filter(Boolean)
        return (
          <div key={r.id} className="card space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="font-semibold">{r.name}</h2>
                <p className="muted line-clamp-2">{names.join(', ') || 'Belum ada latihan'}</p>
              </div>
              <Link href={`/routines/${r.id}`} className="text-sm text-neutral-400">Edit</Link>
            </div>
            <Link href={`/workout?routine=${r.id}`} className="btn-primary block text-center">Mulai Routine</Link>
          </div>
        )
      })}
    </div>
  )
}
