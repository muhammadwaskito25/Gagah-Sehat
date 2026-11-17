'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import ExercisePicker from './ExercisePicker'
import { fmtClock, fmtNum } from '@/lib/format'
import type { DraftExercise, DraftSet, DraftWorkout, Exercise, PrevSet, RoutineWithExercises, SetType } from '@/lib/types'

const KEY = 'liftrun-active-workout'
const TYPE_LABEL: Record<SetType, string> = { normal: '', warmup: 'W', drop: 'D', failure: 'F' }
const TYPE_ORDER: SetType[] = ['normal', 'warmup', 'drop', 'failure']
const emptySet = (): DraftSet => ({ weight: '', reps: '', done: false, type: 'normal' })

export default function WorkoutLogger({ routine }: { routine: RoutineWithExercises | null }) {
  const supabase = createClient()
  const router = useRouter()
  const [draft, setDraft] = useState<DraftWorkout | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [now, setNow] = useState(Date.now())
  const [rest, setRest] = useState<{ end: number; total: number } | null>(null)
  const [saving, setSaving] = useState(false)
  const restDone = useRef(false)

  // Ambil set dari sesi terakhir untuk 1 latihan (kolom "Sebelumnya" ala Hevy)
  const fetchPrev = useCallback(
    async (exerciseId: string): Promise<PrevSet[]> => {
      const { data } = await supabase
        .from('workout_sets')
        .select('weight,reps,set_index,workout_id')
        .eq('exercise_id', exerciseId)
        .order('created_at', { ascending: false })
        .limit(30)
      if (!data?.length) return []
      const lastId = data[0].workout_id
      return data
        .filter((s) => s.workout_id === lastId)
        .sort((a, b) => a.set_index - b.set_index)
        .map((s) => ({ weight: Number(s.weight), reps: s.reps }))
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  // Load draft: dari localStorage (kalau sesi belum selesai), dari routine, atau kosong
  useEffect(() => {
    const saved = localStorage.getItem(KEY)
    if (saved) {
      setDraft(JSON.parse(saved))
      return
    }
    ;(async () => {
      const base: DraftWorkout = {
        name: routine?.name ?? 'Latihan ' + new Date().toLocaleDateString('id-ID', { weekday: 'long' }),
        routineId: routine?.id ?? null,
        startedAt: new Date().toISOString(),
        exercises: [],
      }
      if (routine) {
        const items = [...routine.routine_exercises].sort((a, b) => a.position - b.position)
        base.exercises = await Promise.all(
          items.map(async (re) => ({
            exerciseId: re.exercise_id,
            name: re.exercises?.name ?? 'Latihan',
            rest: re.rest_seconds,
            sets: Array.from({ length: re.target_sets }, emptySet),
            prev: await fetchPrev(re.exercise_id),
          }))
        )
      }
      setDraft(base)
    })()
  }, [routine, fetchPrev])

  // Simpan draft setiap berubah
  useEffect(() => {
    if (draft) localStorage.setItem(KEY, JSON.stringify(draft))
  }, [draft])

  // Ticker untuk durasi + rest timer
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (rest && now >= rest.end && !restDone.current) {
      restDone.current = true
      navigator.vibrate?.([300, 150, 300])
      setRest(null)
    }
  }, [now, rest])

  function update(fn: (d: DraftWorkout) => void) {
    setDraft((d) => {
      if (!d) return d
      const copy: DraftWorkout = structuredClone(d)
      fn(copy)
      return copy
    })
  }

  async function addExercise(ex: Exercise) {
    setPickerOpen(false)
    const prev = await fetchPrev(ex.id)
    const sets = Array.from({ length: Math.max(prev.length, 1) }, emptySet)
    update((d) => {
      d.exercises.push({ exerciseId: ex.id, name: ex.name, rest: 90, sets, prev })
    })
  }

  function toggleDone(ei: number, si: number) {
    const ex = draft!.exercises[ei]
    const set = ex.sets[si]
    const willBeDone = !set.done
    update((d) => {
      const s = d.exercises[ei].sets[si]
      const p = d.exercises[ei].prev[si]
      // Kalau kosong, isi otomatis dari sesi sebelumnya
      if (willBeDone && p) {
        if (s.weight === '') s.weight = String(p.weight)
        if (s.reps === '') s.reps = String(p.reps)
      }
      s.done = willBeDone
    })
    if (willBeDone && set.type !== 'warmup' && ex.rest > 0) {
      restDone.current = false
      setRest({ end: Date.now() + ex.rest * 1000, total: ex.rest })
    }
  }

  async function finish() {
    if (!draft) return
    const rows = draft.exercises.flatMap((ex, ei) =>
      ex.sets
        .filter((s) => s.done)
        .map((s, si) => ({
          exercise_id: ex.exerciseId,
          position: ei,
          set_index: si,
          weight: Number(s.weight) || 0,
          reps: Number(s.reps) || 0,
          set_type: s.type,
        }))
    )
    if (!rows.length) return alert('Belum ada set yang dicentang')
    const skipped = draft.exercises.reduce((n, ex) => n + ex.sets.filter((s) => !s.done).length, 0)
    if (skipped && !confirm(`${skipped} set belum dicentang dan tidak akan disimpan. Lanjut?`)) return

    setSaving(true)
    const { data: w, error } = await supabase
      .from('workouts')
      .insert({
        name: draft.name,
        routine_id: draft.routineId,
        started_at: draft.startedAt,
        ended_at: new Date().toISOString(),
      })
      .select('id')
      .single()
    if (error || !w) {
      setSaving(false)
      return alert(error?.message)
    }
    const { error: e2 } = await supabase.from('workout_sets').insert(rows.map((r) => ({ ...r, workout_id: w.id })))
    setSaving(false)
    if (e2) return alert(e2.message)
    localStorage.removeItem(KEY)
    router.push(`/history/${w.id}`)
    router.refresh()
  }

  function discard() {
    if (!confirm('Buang sesi latihan ini?')) return
    localStorage.removeItem(KEY)
    router.push('/')
  }

  if (!draft) return <p className="muted">Memuat...</p>

  const elapsed = (now - new Date(draft.startedAt).getTime()) / 1000
  const doneSets = draft.exercises.flatMap((e) => e.sets.filter((s) => s.done))
  const volume = doneSets.reduce((v, s) => v + (Number(s.weight) || 0) * (Number(s.reps) || 0), 0)
  const restLeft = rest ? (rest.end - now) / 1000 : 0

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="sticky top-0 z-20 -mx-4 bg-neutral-950/95 px-4 py-2 backdrop-blur">
        <div className="flex items-center justify-between">
          <button onClick={discard} className="text-sm text-red-400">Buang</button>
          <button onClick={finish} disabled={saving} className="btn-primary py-1.5 text-sm">
            {saving ? 'Menyimpan...' : 'Selesai'}
          </button>
        </div>
        <input
          className="mt-2 w-full bg-transparent text-xl font-bold outline-none"
          value={draft.name}
          onChange={(e) => update((d) => { d.name = e.target.value })}
        />
        <div className="mt-1 flex gap-5 text-sm">
          <div><span className="muted">Durasi </span><span className="text-blue-400">{fmtClock(elapsed)}</span></div>
          <div><span className="muted">Volume </span>{fmtNum(volume)} kg</div>
          <div><span className="muted">Set </span>{doneSets.length}</div>
        </div>
      </div>

      {/* Daftar latihan */}
      {draft.exercises.map((ex, ei) => (
        <ExerciseBlock
          key={ei}
          ex={ex}
          onChangeSet={(si, patch) => update((d) => Object.assign(d.exercises[ei].sets[si], patch))}
          onToggle={(si) => toggleDone(ei, si)}
          onCycleType={(si) =>
            update((d) => {
              const s = d.exercises[ei].sets[si]
              s.type = TYPE_ORDER[(TYPE_ORDER.indexOf(s.type) + 1) % TYPE_ORDER.length]
            })
          }
          onAddSet={() =>
            update((d) => {
              const sets = d.exercises[ei].sets
              const last = sets[sets.length - 1]
              sets.push({ ...emptySet(), weight: last?.weight ?? '', reps: last?.reps ?? '' })
            })
          }
          onRemoveSet={(si) => update((d) => { d.exercises[ei].sets.splice(si, 1) })}
          onRest={(sec) => update((d) => { d.exercises[ei].rest = sec })}
          onRemove={() => update((d) => { d.exercises.splice(ei, 1) })}
          onMove={(dir) =>
            update((d) => {
              const j = ei + dir
              if (j < 0 || j >= d.exercises.length) return
              ;[d.exercises[ei], d.exercises[j]] = [d.exercises[j], d.exercises[ei]]
            })
          }
        />
      ))}

      <button className="btn-primary w-full" onClick={() => setPickerOpen(true)}>+ Tambah Latihan</button>

      {/* Rest timer */}
      {rest && (
        <div className="fixed inset-x-0 bottom-[72px] z-40 px-4">
          <div className="mx-auto max-w-lg overflow-hidden rounded-2xl border border-neutral-700 bg-neutral-900 shadow-xl">
            <div className="h-1 bg-blue-500 transition-all" style={{ width: `${(restLeft / rest.total) * 100}%` }} />
            <div className="flex items-center justify-between p-3">
              <button className="btn-ghost py-1.5" onClick={() => setRest({ ...rest, end: rest.end - 15000 })}>-15</button>
              <div className="text-center">
                <div className="muted text-xs">Istirahat</div>
                <div className="text-2xl font-bold tabular-nums">{fmtClock(restLeft)}</div>
              </div>
              <button className="btn-ghost py-1.5" onClick={() => setRest({ end: rest.end + 15000, total: rest.total + 15 })}>+15</button>
              <button className="btn-primary py-1.5" onClick={() => setRest(null)}>Skip</button>
            </div>
          </div>
        </div>
      )}

      <ExercisePicker open={pickerOpen} onClose={() => setPickerOpen(false)} onPick={addExercise} />
    </div>
  )
}

function ExerciseBlock({
  ex, onChangeSet, onToggle, onCycleType, onAddSet, onRemoveSet, onRest, onRemove, onMove,
}: {
  ex: DraftExercise
  onChangeSet: (si: number, patch: Partial<DraftSet>) => void
  onToggle: (si: number) => void
  onCycleType: (si: number) => void
  onAddSet: () => void
  onRemoveSet: (si: number) => void
  onRest: (sec: number) => void
  onRemove: () => void
  onMove: (dir: -1 | 1) => void
}) {
  const [menu, setMenu] = useState(false)
  let normalNo = 0

  return (
    <div className="card p-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-semibold text-blue-400">{ex.name}</h3>
        <button className="px-2 text-neutral-400" onClick={() => setMenu(!menu)}>•••</button>
      </div>

      {menu && (
        <div className="mb-3 flex flex-wrap gap-2 text-sm">
          <button className="btn-ghost py-1" onClick={() => onMove(-1)}>↑ Naik</button>
          <button className="btn-ghost py-1" onClick={() => onMove(1)}>↓ Turun</button>
          <button className="btn-ghost py-1 text-red-400" onClick={onRemove}>Hapus latihan</button>
        </div>
      )}

      <label className="muted mb-2 flex items-center gap-2">
        ⏱ Rest
        <select
          className="rounded-lg bg-neutral-800 px-2 py-1 text-neutral-100"
          value={ex.rest}
          onChange={(e) => onRest(Number(e.target.value))}
        >
          {[0, 30, 45, 60, 90, 120, 150, 180, 240, 300].map((s) => (
            <option key={s} value={s}>{s === 0 ? 'Mati' : fmtClock(s)}</option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-[2.2rem_1fr_4.2rem_3.6rem_2.4rem] items-center gap-1.5 text-xs text-neutral-400">
        <div className="text-center">SET</div>
        <div>SEBELUMNYA</div>
        <div className="text-center">KG</div>
        <div className="text-center">REPS</div>
        <div className="text-center">✓</div>
      </div>

      {ex.sets.map((s, si) => {
        if (s.type === 'normal') normalNo++
        const p = ex.prev[si]
        const label = s.type === 'normal' ? String(normalNo) : TYPE_LABEL[s.type]
        const labelColor =
          s.type === 'warmup' ? 'text-amber-400' : s.type === 'drop' ? 'text-purple-400' : s.type === 'failure' ? 'text-red-400' : ''
        return (
          <div
            key={si}
            className={`mt-1 grid grid-cols-[2.2rem_1fr_4.2rem_3.6rem_2.4rem] items-center gap-1.5 rounded-lg py-1 ${s.done ? 'bg-green-500/15' : ''}`}
          >
            <button className={`text-center font-semibold ${labelColor}`} onClick={() => onCycleType(si)} onDoubleClick={() => onRemoveSet(si)}>
              {label}
            </button>
            <div className="truncate text-sm text-neutral-500">{p ? `${fmtNum(p.weight)}kg × ${p.reps}` : '-'}</div>
            <input
              inputMode="decimal"
              className="rounded-lg bg-neutral-800 py-1.5 text-center outline-none"
              placeholder={p ? String(p.weight) : '0'}
              value={s.weight}
              onChange={(e) => onChangeSet(si, { weight: e.target.value.replace(',', '.') })}
            />
            <input
              inputMode="numeric"
              className="rounded-lg bg-neutral-800 py-1.5 text-center outline-none"
              placeholder={p ? String(p.reps) : '0'}
              value={s.reps}
              onChange={(e) => onChangeSet(si, { reps: e.target.value })}
            />
            <button
              onClick={() => onToggle(si)}
              className={`mx-auto flex h-8 w-8 items-center justify-center rounded-lg ${s.done ? 'bg-green-500 text-white' : 'bg-neutral-800 text-neutral-500'}`}
            >
              ✓
            </button>
          </div>
        )
      })}

      <div className="mt-2 flex gap-2">
        <button className="btn-ghost flex-1 py-1.5 text-sm" onClick={onAddSet}>+ Tambah Set</button>
        {ex.sets.length > 0 && (
          <button className="btn-ghost py-1.5 text-sm text-red-400" onClick={() => onRemoveSet(ex.sets.length - 1)}>− Set</button>
        )}
      </div>
      <p className="mt-1 text-[11px] text-neutral-500">Tap nomor set untuk ganti tipe (W warm-up, D drop, F failure)</p>
    </div>
  )
}
