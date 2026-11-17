'use client'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Icon from './Icon'
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
  const [group, setGroup] = useState<string | null>(null)
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
      (e) => (!group || e.muscle_group === group) && (e.name.toLowerCase().includes(s) || (e.muscle_group ?? '').toLowerCase().includes(s))
    )
  }, [list, q, group])

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
    <div className="fixed inset-0 z-50 flex flex-col bg-chalk">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col overflow-hidden">
        <div className="space-y-3 border-b border-line px-5 pb-3 pt-[max(env(safe-area-inset-top),1rem)]">
          <div className="flex items-center justify-between">
            <button onClick={onClose} className="btn-soft btn-sm -ml-1 bg-transparent">Batal</button>
            <h2 className="font-display text-xl font-semibold">Pilih latihan</h2>
            <button onClick={() => setCreating(!creating)} className="btn-soft btn-sm -mr-1 bg-transparent text-plate-blue">
              {creating ? 'Tutup' : 'Buat baru'}
            </button>
          </div>

          {creating ? (
            <div className="space-y-2 pb-1">
              <input className="input" placeholder="Nama latihan" value={newName} onChange={(e) => setNewName(e.target.value)} />
              <div className="grid grid-cols-2 gap-2">
                <select className="input" value={newGroup} onChange={(e) => setNewGroup(e.target.value)}>
                  {GROUPS.map((g) => <option key={g}>{g}</option>)}
                </select>
                <input className="input" placeholder="Alat (opsional)" value={newEquip} onChange={(e) => setNewEquip(e.target.value)} />
              </div>
              <button className="btn-primary w-full" onClick={createExercise}>Simpan dan tambahkan</button>
            </div>
          ) : (
            <>
              <label className="relative block">
                <Icon name="search" size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-steel" />
                <input className="input pl-10" placeholder="Cari latihan" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
              </label>
              <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
                {[null, ...GROUPS].map((g) => (
                  <button
                    key={g ?? 'all'}
                    onClick={() => setGroup(g)}
                    className={`chip shrink-0 ${group === g ? 'bg-ink text-white' : 'bg-white text-ink ring-1 ring-line'}`}
                  >
                    {g ?? 'Semua'}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {!creating && (
          <ul className="flex-1 overflow-y-auto px-5 pb-10 pt-2">
            {filtered.map((ex) => (
              <li key={ex.id}>
                <button className="flex w-full items-center gap-3 border-b border-line py-3.5 text-left" onClick={() => onPick(ex)}>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{ex.name}</span>
                    <span className="block text-sm text-steel">{[ex.muscle_group, ex.equipment].filter(Boolean).join(', ')}</span>
                  </span>
                  <Icon name="plus" size={18} className="text-plate-blue" />
                </button>
              </li>
            ))}
            {!filtered.length && <p className="muted py-10 text-center">Tidak ketemu. Coba kata lain atau buat latihan baru</p>}
          </ul>
        )}
      </div>
    </div>
  )
}
