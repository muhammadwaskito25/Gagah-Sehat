import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import Icon from '@/components/Icon'

export default async function RoutinesPage() {
  const supabase = await createClient()
  const { data: routines } = await supabase
    .from('routines')
    .select('id,name,routine_exercises(position,target_sets,exercises(name))')
    .order('created_at')

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between pt-2">
        <h1 className="title">Workout</h1>
        <Link href="/routines/new" className="btn-dark btn-sm"><Icon name="plus" size={16} strokeWidth={2.5} />Baru</Link>
      </header>

      <Link href="/workout" className="card flex items-center gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-chalk"><Icon name="dumbbell" size={20} /></span>
        <span className="flex-1">
          <span className="block font-semibold">Latihan kosong</span>
          <span className="block text-sm text-steel">Tambah latihan sambil jalan</span>
        </span>
        <Icon name="right" size={18} className="text-steel" />
      </Link>

      {!routines?.length && (
        <div className="card py-10 text-center">
          <p className="font-semibold">Belum ada routine</p>
          <p className="muted mx-auto mt-1 max-w-[16rem]">Bikin template seperti Push, Pull, atau Legs biar tinggal mulai</p>
          <div className="mt-4 flex justify-center gap-2">
            <Link href="/routines/new" className="btn-dark btn-sm">Buat routine</Link>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {routines?.map((r) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const items = [...(r.routine_exercises ?? [])].sort((a: any, b: any) => a.position - b.position) as any[]
          const sets = items.reduce((n, x) => n + (x.target_sets ?? 0), 0)
          return (
            <article key={r.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate font-display text-[22px] font-semibold leading-tight">{r.name}</h2>
                  <p className="text-sm text-steel">{items.length} latihan, {sets} set</p>
                </div>
                <Link href={`/routines/${r.id}`} aria-label="Edit routine" className="-mr-2 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-steel active:bg-chalk">
                  <Icon name="edit" size={18} />
                </Link>
              </div>
              {items.length > 0 && (
                <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-ink/80">
                  {items.map((x) => x.exercises?.name).filter(Boolean).join(', ')}
                </p>
              )}
              <Link href={`/workout?routine=${r.id}`} className="btn-primary mt-4 w-full">Mulai</Link>
            </article>
          )
        })}
      </div>
    </div>
  )
}
