'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import ExercisePicker from './ExercisePicker'
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button className="text-neutral-400" onClick={() => router.back()}>Batal</button>
        <h1 className="font-semibold">{initial ? 'Edit Routine' : 'Routine Baru'}</h1>
        <button className="font-semibold text-blue-400" onClick={save} disabled={saving}>
          {saving ? '...' : 'Simpan'}
        </button>
      </div>

      <input className="input text-lg font-semibold" placeholder="Nama routine (mis. Push Day)" value={name} onChange={(e) => setName(e.target.value)} />

      {items.map((it, i) => (
        <div key={i} className="card space-y-2 p-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-blue-400">{it.name}</span>
            <div className="flex gap-1 text-sm">
              <button className="btn-ghost px-2 py-1" onClick={() => move(i, -1)}>↑</button>
              <button className="btn-ghost px-2 py-1" onClick={() => move(i, 1)}>↓</button>
              <button className="btn-ghost px-2 py-1 text-red-400" onClick={() => setItems(items.filter((_, j) => j !== i))}>✕</button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <label>
              <span className="muted">Set</span>
              <input className="input py-1.5" inputMode="numeric" value={it.sets} onChange={(e) => patch(i, { sets: Number(e.target.value) || 0 })} />
            </label>
            <label>
              <span className="muted">Target reps</span>
              <input className="input py-1.5" value={it.reps} onChange={(e) => patch(i, { reps: e.target.value })} />
            </label>
            <label>
              <span className="muted">Rest (detik)</span>
              <input className="input py-1.5" inputMode="numeric" value={it.rest} onChange={(e) => patch(i, { rest: Number(e.target.value) || 0 })} />
            </label>
          </div>
        </div>
      ))}

      <button className="btn-ghost w-full" onClick={() => setPicker(true)}>+ Tambah Latihan</button>
      {initial && <button className="w-full py-2 text-sm text-red-400" onClick={remove}>Hapus routine</button>}

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
