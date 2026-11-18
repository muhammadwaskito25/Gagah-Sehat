'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import ExercisePicker from './ExercisePicker'
import Icon from './Icon'
import { fmtCardio, fmtClock, fmtNum } from '@/lib/format'
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
        .select('weight,reps,set_index,workout_id,distance_m,duration_s')
        .eq('exercise_id', exerciseId)
        .order('created_at', { ascending: false })
        .limit(30)
      if (!data?.length) return []
      const lastId = data[0].workout_id
      return data
        .filter((s) => s.workout_id === lastId)
        .sort((a, b) => a.set_index - b.set_index)
        .map((s) => ({ weight: Number(s.weight), reps: s.reps, distance: s.distance_m ? Number(s.distance_m) : null, duration: s.duration_s }))
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
            kind: re.exercises?.kind ?? 'strength',
            rest: re.rest_seconds,
            sets: re.exercises?.kind === 'cardio'
              ? re.cardio_sets && re.cardio_sets.length
                ? re.cardio_sets.map((c) => ({
                    ...emptySet(),
                    distance: c.distance_m ? String(Math.round((Number(c.distance_m) / 1000) * 1000) / 1000) : '',
                    duration: c.duration_s ? String(Math.round((Number(c.duration_s) / 60) * 10) / 10) : '',
                  }))
                : [{ ...emptySet(), distance: re.target_distance_m ? String(Number(re.target_distance_m) / 1000) : '', duration: re.target_duration_s ? String(Math.round((re.target_duration_s / 60) * 10) / 10) : '' }]
              : Array.from({ length: re.target_sets }, emptySet),
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
      d.exercises.push({ exerciseId: ex.id, name: ex.name, kind: ex.kind ?? 'strength', rest: ex.kind === 'cardio' ? 0 : 90, sets, prev })
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
        if (d.exercises[ei].kind === 'cardio') {
          if (!s.distance && p.distance) s.distance = String(Math.round((p.distance / 1000) * 100) / 100)
          if (!s.duration && p.duration) s.duration = String(Math.round((p.duration / 60) * 10) / 10)
        } else {
          if (s.weight === '') s.weight = String(p.weight)
          if (s.reps === '') s.reps = String(p.reps)
        }
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
          weight: ex.kind === 'cardio' ? 0 : Number(s.weight) || 0,
          reps: ex.kind === 'cardio' ? 0 : Number(s.reps) || 0,
          set_type: s.type,
          distance_m: ex.kind === 'cardio' && s.distance ? Number(s.distance.replace(',', '.')) * 1000 : null,
          duration_s: ex.kind === 'cardio' && s.duration ? Math.round(Number(s.duration.replace(',', '.')) * 60) : null,
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

  if (!draft) return <p className="muted pt-10 text-center">Memuat...</p>

  const elapsed = (now - new Date(draft.startedAt).getTime()) / 1000
  const doneSets = draft.exercises.flatMap((e) => e.sets.filter((s) => s.done))
  const volume = doneSets.reduce((v, s) => v + (Number(s.weight) || 0) * (Number(s.reps) || 0), 0)
  const restLeft = rest ? (rest.end - now) / 1000 : 0

  return (
    <div className="space-y-4 pb-10">
      {/* Header lengket */}
      <div className="sticky top-0 z-20 -mx-5 -mt-[calc(env(safe-area-inset-top)+2.5rem)] border-b border-line bg-chalk px-5 pb-3 pt-[calc(env(safe-area-inset-top)+1rem)]">
        <div className="flex items-center justify-between">
          <button onClick={discard} className="btn-soft btn-sm -ml-1 text-plate-red">Buang</button>
          <span className="num text-xl tabular-nums">{fmtClock(elapsed)}</span>
          <button onClick={finish} disabled={saving} className="btn-sm btn bg-plate-green text-white">
            {saving ? 'Menyimpan' : 'Selesai'}
          </button>
        </div>
      </div>

      <input
        aria-label="Nama latihan"
        className="w-full bg-transparent font-display text-[32px] font-semibold leading-tight tracking-tight outline-none"
        value={draft.name}
        onChange={(e) => update((d) => { d.name = e.target.value })}
      />
      <div className="grid grid-cols-3 divide-x divide-line rounded-[18px] border border-line bg-white py-3">
        <Mini label="Volume" value={`${fmtNum(volume)}`} unit="kg" />
        <Mini label="Set selesai" value={String(doneSets.length)} />
        <Mini label="Latihan" value={String(draft.exercises.length)} />
      </div>

      {draft.exercises.length === 0 && (
        <div className="card py-10 text-center">
          <p className="font-semibold">Belum ada latihan</p>
          <p className="muted mt-1">Tambahkan latihan pertama untuk mulai mencatat set</p>
        </div>
      )}

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

      <button className="btn-primary h-14 w-full" onClick={() => setPickerOpen(true)}>
        <Icon name="plus" size={18} strokeWidth={2.5} />
        Tambah latihan
      </button>

      {/* Rest timer */}
      {rest && (
        <div className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(env(safe-area-inset-bottom),1rem)]">
          <div className="mx-auto max-w-md overflow-hidden rounded-[20px] bg-ink text-white">
            <div className="h-1 bg-white/10">
              <div className="h-1 bg-plate-yellow transition-[width] duration-300" style={{ width: `${Math.max(0, (restLeft / rest.total) * 100)}%` }} />
            </div>
            <div className="flex items-center gap-2 p-3">
              <button className="h-11 w-14 rounded-xl bg-white/10 text-sm font-semibold" onClick={() => setRest({ ...rest, end: rest.end - 15000 })}>-15</button>
              <div className="flex-1 text-center">
                <div className="text-xs text-white/60">Istirahat</div>
                <div className="num text-[30px] leading-none">{fmtClock(restLeft)}</div>
              </div>
              <button className="h-11 w-14 rounded-xl bg-white/10 text-sm font-semibold" onClick={() => setRest({ end: rest.end + 15000, total: rest.total + 15 })}>+15</button>
              <button className="h-11 rounded-xl bg-white px-4 text-sm font-semibold text-ink" onClick={() => setRest(null)}>Lewati</button>
            </div>
          </div>
        </div>
      )}

      <ExercisePicker open={pickerOpen} onClose={() => setPickerOpen(false)} onPick={addExercise} />
    </div>
  )
}

function Mini({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="px-4">
      <div className="text-[13px] text-steel">{label}</div>
      <div className="mt-0.5 flex items-baseline gap-1">
        <span className="num text-2xl leading-none">{value}</span>
        {unit && <span className="text-sm text-steel">{unit}</span>}
      </div>
    </div>
  )
}

const GRID = 'grid grid-cols-[2.25rem_minmax(0,1fr)_4.5rem_4rem_2.75rem] items-center gap-2'

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
  const cardio = ex.kind === 'cardio'
  let normalNo = 0

  return (
    <section className="rounded-[18px] border border-line bg-white">
      <div className="flex items-center justify-between gap-2 px-4 pb-2 pt-4">
        <h3 className="min-w-0 truncate font-display text-[22px] font-semibold leading-tight">{ex.name}</h3>
        <button aria-label="Opsi latihan" className="-mr-2 flex h-9 w-9 items-center justify-center rounded-full text-steel active:bg-chalk" onClick={() => setMenu(!menu)}>
          <Icon name="more" size={20} />
        </button>
      </div>

      {menu && (
        <div className="mx-4 mb-3 grid grid-cols-3 gap-2">
          <button className="btn-soft btn-sm" onClick={() => onMove(-1)}><Icon name="up" size={16} />Naik</button>
          <button className="btn-soft btn-sm" onClick={() => onMove(1)}><Icon name="down" size={16} />Turun</button>
          <button className="btn-soft btn-sm text-plate-red" onClick={onRemove}><Icon name="trash" size={16} />Hapus</button>
        </div>
      )}

{!cardio && (
      <label className="mx-4 mb-3 inline-flex items-center gap-2 rounded-full bg-chalk py-1 pl-3 pr-1 text-[13px] text-steel">
        <Icon name="timer" size={15} />
        Istirahat
        <select
          className="rounded-full bg-white px-2 py-1 font-semibold text-ink outline-none"
          value={ex.rest}
          onChange={(e) => onRest(Number(e.target.value))}
        >
          {[0, 30, 45, 60, 90, 120, 150, 180, 240, 300].map((s) => (
            <option key={s} value={s}>{s === 0 ? 'Mati' : fmtClock(s)}</option>
          ))}
        </select>
      </label>
      )}

      <div className={`${GRID} px-3 pb-1 text-[12px] font-medium text-steel`}>
        <div className="text-center">Set</div>
        <div>Sebelumnya</div>
        <div className="text-center">{cardio ? 'km' : 'kg'}</div>
        <div className="text-center">{cardio ? 'Menit' : 'Reps'}</div>
        <div />
      </div>

      <div className="px-1.5">
        {ex.sets.map((s, si) => {
          if (s.type === 'normal') normalNo++
          const p = ex.prev[si]
          const label = s.type === 'normal' ? String(normalNo) : TYPE_LABEL[s.type]
          const labelCls =
            s.type === 'warmup' ? 'text-plate-yellow' : s.type === 'drop' ? 'text-plate-blue' : s.type === 'failure' ? 'text-plate-red' : 'text-ink'
          return (
            <div key={si} className={`${GRID} rounded-xl px-1.5 py-1.5 transition-colors ${s.done ? 'bg-plate-green/10' : ''}`}>
              <button
                aria-label="Ganti tipe set"
                className={`num h-9 rounded-lg text-lg ${labelCls}`}
                onClick={() => !cardio && onCycleType(si)}
                onDoubleClick={() => onRemoveSet(si)}
              >
                {label}
              </button>
              <div className="truncate text-sm text-steel">{p ? (cardio ? fmtCardio(p.distance, p.duration) : `${fmtNum(p.weight)} × ${p.reps}`) : '—'}</div>
              <input
                inputMode="decimal"
                aria-label={cardio ? 'Jarak km' : 'Beban kg'}
                className={`num h-10 w-full rounded-lg text-center text-lg outline-none ${s.done ? 'bg-transparent' : 'bg-chalk'} placeholder:text-steel/50`}
                placeholder={cardio ? (p?.distance ? String(Math.round((p.distance / 1000) * 100) / 100) : '0') : p ? String(p.weight) : '0'}
                value={cardio ? s.distance ?? '' : s.weight}
                onChange={(e) => onChangeSet(si, cardio ? { distance: e.target.value.replace(',', '.') } : { weight: e.target.value.replace(',', '.') })}
              />
              <input
                inputMode={cardio ? 'decimal' : 'numeric'}
                aria-label={cardio ? 'Durasi menit' : 'Repetisi'}
                className={`num h-10 w-full rounded-lg text-center text-lg outline-none ${s.done ? 'bg-transparent' : 'bg-chalk'} placeholder:text-steel/50`}
                placeholder={cardio ? (p?.duration ? String(Math.round((p.duration / 60) * 10) / 10) : '0') : p ? String(p.reps) : '0'}
                value={cardio ? s.duration ?? '' : s.reps}
                onChange={(e) => onChangeSet(si, cardio ? { duration: e.target.value.replace(',', '.') } : { reps: e.target.value })}
              />
              <button
                aria-label={s.done ? 'Batalkan set' : 'Selesaikan set'}
                onClick={() => onToggle(si)}
                className={`flex h-10 w-10 items-center justify-center justify-self-center rounded-xl transition ${s.done ? 'bg-plate-green text-white' : 'border border-line text-steel'}`}
              >
                <Icon name="check" size={18} strokeWidth={2.6} />
              </button>
            </div>
          )
        })}
      </div>

      <div className="flex gap-2 p-3 pt-2">
        <button className="btn-soft btn-sm flex-1" onClick={onAddSet}><Icon name="plus" size={16} />Tambah set</button>
        {ex.sets.length > 0 && (
          <button aria-label="Hapus set terakhir" className="btn-soft btn-sm px-4 text-steel" onClick={() => onRemoveSet(ex.sets.length - 1)}>
            <Icon name="x" size={16} />
          </button>
        )}
      </div>
    </section>
  )
}
