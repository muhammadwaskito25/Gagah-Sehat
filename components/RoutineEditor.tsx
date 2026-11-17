'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import ExercisePicker from './ExercisePicker'
import Icon from './Icon'
import type { Exercise, RoutineWithExercises } from '@/lib/types'

type Item = { exerciseId: string; name: string; sets: number; reps: string; rest: number }

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
        sets: re.target_sets,
        reps: re.target_reps ?? '',
        rest: re.rest_seconds,
      }))
  )
  const [picker, setPicker] = useState(false)
  const [saving, setSaving] = useState(false)

  function patch(i: number, p: Partial<Item>) {
    setItems((list) => list.map((it, j) => (j === i ? { ...it, ...p } : it)))
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
        items.map((it, position) => ({
          routine_id: id,
          exercise_id: it.exerciseId,
          position,
          target_sets: it.sets,
          target_reps: it.reps,
          rest_seconds: it.rest,
        }))
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
      <div className="sticky top-0 z-20 -mx-5 flex items-center justify-between border-b border-line bg-chalk/95 px-5 pb-3 pt-[max(env(safe-area-inset-top),0.75rem)] backdrop-blur">
        <button className="btn-soft btn-sm -ml-1 bg-transparent" onClick={() => router.back()}>Batal</button>
        <span className="font-display text-xl font-semibold">{initial ? 'Edit routine' : 'Routine baru'}</span>
        <button className="btn-dark btn-sm" onClick={save} disabled={saving}>{saving ? 'Menyimpan' : 'Simpan'}</button>
      </div>

      <input
        className="w-full bg-transparent font-display text-[32px] font-semibold leading-tight tracking-tight outline-none placeholder:text-steel/50"
        placeholder="Nama routine"
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
        </section>
      ))}

      <button className="btn-ghost h-14 w-full" onClick={() => setPicker(true)}><Icon name="plus" size={18} />Tambah latihan</button>
      {initial && <button className="btn w-full text-plate-red" onClick={remove}><Icon name="trash" size={18} />Hapus routine</button>}

      <ExercisePicker
        open={picker}
        onClose={() => setPicker(false)}
        onPick={(ex: Exercise) => {
          setPicker(false)
          setItems([...items, { exerciseId: ex.id, name: ex.name, sets: 3, reps: '8-12', rest: 90 }])
        }}
      />
    </div>
  )
}
