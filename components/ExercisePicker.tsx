'use client'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Exercise } from '@/lib/types'

const GROUPS = ['Dada', 'Punggung', 'Kaki', 'Bahu', 'Lengan', 'Core', 'Lainnya']

export default function ExercisePicker({
  open,
  onClose,
  onPick,
}: {
  open: boolean
  onClose: () => void
  onPick: (ex: Exercise) => void
}) {
  const supabase = createClient()
  const [list, setList] = useState<Exercise[]>([])
  const [q, setQ] = useState('')
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newGroup, setNewGroup] = useState('Dada')
  const [newEquip, setNewEquip] = useState('')

  useEffect(() => {
    if (!open) return
    supabase
      .from('exercises')
      .select('id,name,muscle_group,equipment,user_id')
      .order('name')
      .then(({ data }) => setList(data ?? []))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const filtered = useMemo(() => {
    const s = q.toLowerCase()
    return list.filter(
      (e) => e.name.toLowerCase().includes(s) || (e.muscle_group ?? '').toLowerCase().includes(s)
    )
  }, [list, q])

  async function createExercise() {
    if (!newName.trim()) return
    const { data, error } = await supabase
      .from('exercises')
      .insert({ name: newName.trim(), muscle_group: newGroup, equipment: newEquip || null })
      .select('id,name,muscle_group,equipment,user_id')
      .single()
    if (error || !data) return alert(error?.message)
    setCreating(false)
    setNewName('')
    onPick(data)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-neutral-950">
      <div className="mx-auto w-full max-w-lg flex-1 overflow-y-auto px-4 pb-8 pt-[max(env(safe-area-inset-top),1rem)]">
        <div className="mb-3 flex items-center justify-between">
          <button onClick={onClose} className="text-neutral-400">Batal</button>
          <h2 className="font-semibold">Pilih Latihan</h2>
          <button onClick={() => setCreating(!creating)} className="text-blue-400">
            {creating ? 'Tutup' : 'Buat'}
          </button>
        </div>

        {creating && (
          <div className="card mb-3 space-y-2">
            <input className="input" placeholder="Nama latihan" value={newName} onChange={(e) => setNewName(e.target.value)} />
            <div className="flex gap-2">
              <select className="input" value={newGroup} onChange={(e) => setNewGroup(e.target.value)}>
                {GROUPS.map((g) => <option key={g}>{g}</option>)}
              </select>
              <input className="input" placeholder="Alat (opsional)" value={newEquip} onChange={(e) => setNewEquip(e.target.value)} />
            </div>
            <button className="btn-primary w-full" onClick={createExercise}>Simpan & Tambahkan</button>
          </div>
        )}

        <input className="input mb-3" placeholder="Cari latihan..." value={q} onChange={(e) => setQ(e.target.value)} autoFocus />

        <ul className="divide-y divide-neutral-800">
          {filtered.map((ex) => (
            <li key={ex.id}>
              <button className="w-full py-3 text-left" onClick={() => onPick(ex)}>
                <div className="font-medium">
                  {ex.name}
                  {ex.equipment && <span className="text-neutral-400"> ({ex.equipment})</span>}
                </div>
                <div className="muted">{ex.muscle_group}</div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
