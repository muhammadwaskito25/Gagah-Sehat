import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import BackLink from '@/components/BackLink'
import { fmtDate, fmtDuration, fmtNum } from '@/lib/format'

export default async function HistoryPage() {
  const supabase = await createClient()
  const { data: workouts } = await supabase
    .from('workouts')
    .select('id,name,started_at,ended_at,workout_sets(weight,reps,exercise_id)')
    .order('started_at', { ascending: false })
    .limit(100)

  return (
    <div className="space-y-6">
      <header className="space-y-3 pt-2">
        <BackLink href="/" label="Beranda" />
        <h1 className="title">Riwayat</h1>
      </header>

      {!workouts?.length && (
        <div className="card py-10 text-center">
          <p className="font-semibold">Belum ada latihan tersimpan</p>
          <p className="muted mt-1">Latihan yang kamu selesaikan muncul di sini</p>
        </div>
      )}

      {!!workouts?.length && (
        <div className="list">
          {workouts.map((w) => {
            const sets = w.workout_sets ?? []
            const vol = sets.reduce((v, s) => v + Number(s.weight) * s.reps, 0)
            const exCount = new Set(sets.map((s) => s.exercise_id)).size
            const dur = w.ended_at ? (new Date(w.ended_at).getTime() - new Date(w.started_at).getTime()) / 1000 : 0
            return (
              <Link key={w.id} href={`/history/${w.id}`} className="row">
                <span className="h-9 w-[7px] shrink-0 rounded-[3px] bg-plate-blue" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{w.name}</span>
                  <span className="block text-sm text-steel">{fmtDuration(dur)}, {exCount} latihan, {fmtNum(vol)} kg</span>
                </span>
                <span className="shrink-0 text-sm text-steel">{fmtDate(w.started_at)}</span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
