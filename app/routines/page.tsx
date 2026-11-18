import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import Icon from '@/components/Icon'
import { runTypeLabel, targetText, type RunRoutine } from '@/lib/run'

export default async function RoutinesPage() {
  const supabase = await createClient()
  const [{ data: routines }, { data: runRoutines }] = await Promise.all([
    supabase.from('routines').select('id,name,routine_exercises(position,target_sets,exercises(name))').order('created_at'),
    supabase.from('run_routines').select('*').order('created_at'),
  ])

  return (
    <div className="space-y-8">
      <header className="pt-2">
        <h1 className="title">Workout</h1>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <Link href="/workout" className="card group flex flex-col gap-3 transition hover:border-[#FF5500]/50 hover:bg-[#151924]">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-orange-500/20 bg-orange-500/10 text-[#FF5500]">
            <Icon name="dumbbell" size={20} strokeWidth={2.4} />
          </span>
          <span>
            <span className="block font-display text-[18px] font-bold uppercase tracking-wide text-white group-hover:text-[#FF5500] transition">Gym Kosong</span>
            <span className="block text-xs font-medium text-slate-400">Tambah latihan langsung</span>
          </span>
        </Link>
        <Link href="/runs/start" className="card group flex flex-col gap-3 transition hover:border-[#00B4D8]/50 hover:bg-[#151924]">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-500/20 bg-cyan-500/10 text-[#00B4D8]">
            <Icon name="run" size={20} strokeWidth={2.4} />
          </span>
          <span>
            <span className="block font-display text-[18px] font-bold uppercase tracking-wide text-white group-hover:text-[#00B4D8] transition">Lari Bebas</span>
            <span className="block text-xs font-medium text-slate-400">Stopwatch, lap & GPS</span>
          </span>
        </Link>
      </div>

      {/* ---------- Gym ---------- */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="section">Routine gym</h2>
          <Link href="/routines/new" className="btn-ghost btn-sm"><Icon name="plus" size={16} strokeWidth={2.5} />Baru</Link>
        </div>

        {!routines?.length && (
          <div className="card py-8 text-center">
            <p className="font-semibold">Belum ada routine gym</p>
            <p className="muted mx-auto mt-1 max-w-[16rem]">Bikin sendiri atau tempel routine dari Hevy</p>
            <div className="mt-4 flex justify-center gap-2">
              <Link href="/routines/new" className="btn-dark btn-sm">Buat routine</Link>
              <Link href="/import" className="btn-ghost btn-sm">Impor dari Hevy</Link>
            </div>
          </div>
        )}

        {routines?.map((r) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const items = [...(r.routine_exercises ?? [])].sort((a: any, b: any) => a.position - b.position) as any[]
          const sets = items.reduce((n, x) => n + (x.target_sets ?? 0), 0)
          return (
            <article key={r.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate font-display text-[22px] font-semibold leading-tight">{r.name}</h3>
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
      </section>

      {/* ---------- Lari ---------- */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="section">Routine lari</h2>
          <Link href="/runs/routines/new" className="btn-ghost btn-sm"><Icon name="plus" size={16} strokeWidth={2.5} />Baru</Link>
        </div>

        {!runRoutines?.length && (
          <div className="card py-8 text-center">
            <p className="font-semibold">Belum ada routine lari</p>
            <p className="muted mx-auto mt-1 max-w-[17rem]">Simpan sesi seperti Easy 5K, Interval 6 × 400 m, atau Long run</p>
            <Link href="/runs/routines/new" className="btn-dark btn-sm mt-4">Buat routine lari</Link>
          </div>
        )}

        {(runRoutines as RunRoutine[] | null)?.map((r) => (
          <article key={r.id} className="card">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="truncate font-display text-[22px] font-semibold leading-tight">{r.name}</h3>
                  <span className="tag shrink-0 border border-cyan-500/20 bg-cyan-500/10 text-[#00B4D8]">{runTypeLabel(r.run_type)}</span>
                </div>
                {targetText(r) && <p className="text-sm text-steel">{targetText(r)}</p>}
              </div>
              <Link href={`/runs/routines/${r.id}`} aria-label="Edit routine lari" className="-mr-2 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-steel active:bg-chalk">
                <Icon name="edit" size={18} />
              </Link>
            </div>
            {r.segments && r.segments.length > 0 && <p className="mt-3 text-sm text-ink/80">{r.segments.length} set</p>}
            {!(r.segments && r.segments.length > 0) && r.structure && <p className="mt-3 line-clamp-2 whitespace-pre-line text-sm leading-relaxed text-ink/80">{r.structure}</p>}
            <Link href={`/runs/start?routine=${r.id}`} className="btn mt-4 w-full bg-[#00B4D8] hover:bg-[#0096B4] text-white font-bold shadow-lg shadow-cyan-500/20 active:scale-[0.98]">Mulai</Link>
          </article>
        ))}
      </section>
    </div>
  )
}
