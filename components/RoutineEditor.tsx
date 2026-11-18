'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import ExercisePicker from './ExercisePicker'
import Icon from './Icon'
import type { Exercise, RoutineWithExercises } from '@/lib/types'

type Item = { exerciseId: string; name: string; sets: number; reps: string; rest: number; kind?: string | null; cs?: CardioRow[] }
type CardioRow = { km: string; min: string }

const fmtKm = (m?: number | null) => (m ? String(Math.round((Number(m) / 1000) * 1000) / 1000) : '')
const fmtMin = (sec?: number | null) => (sec ? String(Math.round((Number(sec) / 60) * 10) / 10) : '')

export default function RoutineEditor({ initial }: { initial: RoutineWithExercises | null }) {
  const supabase = createClient()
  const router = useRouter()
  const [name, setName] = useState(initial?.name ?? '')
  const [items, setItems] = useState<Item[]>(
    (initial?.routine_exercises ?? [])
      .sort((a, b) => a.position - b.position)
      .map((re) => ({
        exerciseId: re.exercise_id,
        name: re.exercises?.name ?? '',
        kind: re.exercises?.kind ?? 'strength',
        sets: re.target_sets,
        reps: re.target_reps ?? '',
        rest: re.rest_seconds,
        cs: re.exercises?.kind === 'cardio'
          ? re.cardio_sets && re.cardio_sets.length
            ? re.cardio_sets.map((c) => ({ km: fmtKm(c.distance_m), min: fmtMin(c.duration_s) }))
            : [{ km: fmtKm(re.target_distance_m), min: fmtMin(re.target_duration_s) }]
          : undefined,
      }))
  )
  const [picker, setPicker] = useState(false)
  const [saving, setSaving] = useState(false)

  function patch(i: number, p: Partial<Item>) {
    setItems((list) => list.map((it, j) => (j === i ? { ...it, ...p } : it)))
  }

  function patchRow(i: number, r: number, p: Partial<CardioRow>) {
    setItems((list) => list.map((it, j) => (j === i ? { ...it, cs: (it.cs ?? []).map((c, k) => (k === r ? { ...c, ...p } : c)) } : it)))
  }

  function addRow(i: number) {
    setItems((list) => list.map((it, j) => {
      if (j !== i) return it
      const cs = it.cs ?? []
      const last = cs[cs.length - 1]
      return { ...it, cs: [...cs, last ? { ...last } : { km: '', min: '5' }] }
    }))
  }

  function removeRow(i: number, r: number) {
    setItems((list) => list.map((it, j) => (j === i ? { ...it, cs: (it.cs ?? []).filter((_, k) => k !== r) } : it)))
  }

  function move(i: number, dir: -1 | 1) {
    const j = i + dir
    if (j < 0 || j >= items.length) return
    const copy = [...items]
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
    setItems(copy)
  }

  async function save() {
    if (!name.trim()) return alert('Isi nama routine dulu')
    setSaving(true)
    let id = initial?.id
    if (id) {
      await supabase.from('routines').update({ name }).eq('id', id)
      await supabase.from('routine_exercises').delete().eq('routine_id', id)
    } else {
      const { data, error } = await supabase.from('routines').insert({ name }).select('id').single()
      if (error || !data) {
        setSaving(false)
        return alert(error?.message)
      }
      id = data.id
    }
    if (items.length) {
      const { error } = await supabase.from('routine_exercises').insert(
        items.map((it, position) => {
          const cardio = it.kind === 'cardio'
          const rows = (it.cs ?? []).map((c) => ({
            distance_m: c.km ? Math.round(Number(c.km.replace(',', '.')) * 1000) : null,
            duration_s: c.min ? Math.round(Number(c.min.replace(',', '.')) * 60) : null,
          }))
          return {
            routine_id: id,
            exercise_id: it.exerciseId,
            position,
            target_reps: cardio ? null : it.reps,
            rest_seconds: cardio ? 0 : it.rest,
            target_sets: cardio ? Math.max(rows.length, 1) : it.sets,
            target_distance_m: cardio ? rows[0]?.distance_m ?? null : null,
            target_duration_s: cardio ? rows[0]?.duration_s ?? null : null,
            cardio_sets: cardio ? rows : null,
          }
        })
      )
      if (error) {
        setSaving(false)
        return alert(error.message)
      }
    }
    setSaving(false)
    router.push('/routines')
    router.refresh()
  }

  async function remove() {
    if (!initial || !confirm('Hapus routine ini?')) return
    await supabase.from('routines').delete().eq('id', initial.id)
    router.push('/routines')
    router.refresh()
  }

  return (
    <div className="space-y-5">
      <div className="sticky top-0 z-20 -mx-5 -mt-[calc(env(safe-area-inset-top)+2.5rem)] flex items-center justify-between border-b border-[#202637] bg-[#08090C]/95 backdrop-blur px-5 pb-3 pt-[calc(env(safe-area-inset-top)+1rem)]">
        <button className="btn-soft btn-sm -ml-1 bg-transparent text-slate-400" onClick={() => router.back()}>Batal</button>
        <span className="font-display text-xl font-bold uppercase tracking-wide text-white">{initial ? 'Edit Routine' : 'Routine Baru'}</span>
        <button className="btn-primary btn-sm" onClick={save} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</button>
      </div>

      <input
        className="w-full bg-transparent font-display text-[32px] font-black uppercase leading-tight tracking-tight text-white outline-none placeholder:text-slate-600"
        placeholder="NAMA ROUTINE"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      {items.length === 0 && (
        <div className="card py-8 text-center">
          <p className="font-semibold">Routine masih kosong</p>
          <p className="muted mt-1">Tambahkan latihan, atur jumlah set, target reps, dan istirahat</p>
        </div>
      )}

      {items.map((it, i) => (
        <section key={i} className="card space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="min-w-0 truncate font-display text-[20px] font-semibold">{it.name}</span>
            <div className="-mr-2 flex shrink-0 text-steel">
              <button aria-label="Naikkan" className="flex h-9 w-9 items-center justify-center rounded-full active:bg-chalk" onClick={() => move(i, -1)}><Icon name="up" size={18} /></button>
              <button aria-label="Turunkan" className="flex h-9 w-9 items-center justify-center rounded-full active:bg-chalk" onClick={() => move(i, 1)}><Icon name="down" size={18} /></button>
              <button aria-label="Hapus" className="flex h-9 w-9 items-center justify-center rounded-full text-plate-red active:bg-chalk" onClick={() => setItems(items.filter((_, j) => j !== i))}><Icon name="trash" size={18} /></button>
            </div>
          </div>
          {it.kind === 'cardio' ? (
            <div className="space-y-2">
              <div className="grid grid-cols-[2.25rem_1fr_1fr_2.25rem] items-center gap-2 px-1 text-center text-[11px] font-semibold text-steel">
                <span>Set</span><span>Jarak (km)</span><span>Durasi (menit)</span><span />
              </div>
              {(it.cs ?? []).map((c, r) => (
                <div key={r} className="grid grid-cols-[2.25rem_1fr_1fr_2.25rem] items-center gap-2">
                  <span className="num text-center text-lg font-semibold text-steel">{r + 1}</span>
                  <input className="input num py-2.5 text-center text-lg" inputMode="decimal" placeholder="opsional" value={c.km} onChange={(e) => patchRow(i, r, { km: e.target.value })} />
                  <input className="input num py-2.5 text-center text-lg" inputMode="decimal" placeholder="opsional" value={c.min} onChange={(e) => patchRow(i, r, { min: e.target.value })} />
                  <button aria-label="Hapus set" className="flex h-9 w-9 items-center justify-center rounded-full text-steel active:bg-chalk disabled:opacity-30" disabled={(it.cs ?? []).length <= 1} onClick={() => removeRow(i, r)}><Icon name="x" size={16} /></button>
                </div>
              ))}
              <button className="btn-soft btn-sm w-full" onClick={() => addRow(i)}><Icon name="plus" size={16} />Tambah set (interval)</button>
            </div>
          ) : (
          <div className="grid grid-cols-3 gap-2">
            <label>
              <span className="field mb-1">Set</span>
              <input className="input num py-2.5 text-center text-lg" inputMode="numeric" value={it.sets} onChange={(e) => patch(i, { sets: Number(e.target.value) || 0 })} />
            </label>
            <label>
              <span className="field mb-1">Target reps</span>
              <input className="input num py-2.5 text-center text-lg" value={it.reps} onChange={(e) => patch(i, { reps: e.target.value })} />
            </label>
            <label>
              <span className="field mb-1">Istirahat (dtk)</span>
              <input className="input num py-2.5 text-center text-lg" inputMode="numeric" value={it.rest} onChange={(e) => patch(i, { rest: Number(e.target.value) || 0 })} />
            </label>
          </div>
          )}
        </section>
      ))}

      <button className="btn-ghost h-14 w-full" onClick={() => setPicker(true)}><Icon name="plus" size={18} />Tambah latihan</button>
      {initial && <button className="btn w-full text-plate-red" onClick={remove}><Icon name="trash" size={18} />Hapus routine</button>}

      <ExercisePicker
        open={picker}
        onClose={() => setPicker(false)}
        onPick={(ex: Exercise) => {
          setPicker(false)
          setItems([...items, ex.kind === 'cardio'
            ? { exerciseId: ex.id, name: ex.name, sets: 1, reps: '', rest: 0, kind: 'cardio', cs: [{ km: '', min: '15' }] }
            : { exerciseId: ex.id, name: ex.name, sets: 3, reps: '8-12', rest: 90, kind: 'strength' }])
        }}
      />
    </div>
  )
}
