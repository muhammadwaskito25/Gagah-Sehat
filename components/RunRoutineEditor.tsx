'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Icon from './Icon'
import { RUN_TYPES, paceText, parsePace, type RunRoutine } from '@/lib/run'

export default function RunRoutineEditor({ initial }: { initial: RunRoutine | null }) {
  const router = useRouter()
  const supabase = createClient()
  const [name, setName] = useState(initial?.name ?? '')
  const [type, setType] = useState(initial?.run_type ?? 'easy')
  const [km, setKm] = useState(initial?.target_distance_m ? String(initial.target_distance_m / 1000) : '')
  const [min, setMin] = useState(initial?.target_duration_s ? String(Math.round(initial.target_duration_s / 60)) : '')
  const [pace, setPace] = useState(paceText(initial?.target_pace_s))
  const [structure, setStructure] = useState(initial?.structure ?? RUN_TYPES[0].template)
  const [saving, setSaving] = useState(false)

  const kmN = Number(km.replace(',', '.'))
  const minN = Number(min.replace(',', '.'))
  const autoPace = kmN && minN ? paceText((minN * 60) / kmN) : ''

  function pickType(k: string) {
    const cur = RUN_TYPES.find((t) => t.key === type)
    // Ganti template hanya kalau isinya masih template bawaan / kosong
    if (!structure.trim() || structure === cur?.template) setStructure(RUN_TYPES.find((t) => t.key === k)!.template)
    if (!name.trim() || RUN_TYPES.some((t) => t.label === name)) setName(RUN_TYPES.find((t) => t.key === k)!.label)
    setType(k)
  }

  async function save() {
    if (!name.trim()) return alert('Isi nama routine lari dulu')
    const p = pace ? parsePace(pace) : null
    if (pace && !p) return alert('Format pace mm:ss, mis. 6:15')
    setSaving(true)
    const row = {
      name: name.trim(),
      run_type: type,
      target_distance_m: kmN ? kmN * 1000 : null,
      target_duration_s: minN ? Math.round(minN * 60) : null,
      target_pace_s: p ?? (kmN && minN ? Math.round((minN * 60) / kmN) : null),
      structure: structure.trim() || null,
    }
    const { error } = initial
      ? await supabase.from('run_routines').update(row).eq('id', initial.id)
      : await supabase.from('run_routines').insert(row)
    setSaving(false)
    if (error) return alert(error.message)
    router.push('/routines')
    router.refresh()
  }

  async function remove() {
    if (!initial || !confirm('Hapus routine lari ini?')) return
    await supabase.from('run_routines').delete().eq('id', initial.id)
    router.push('/routines')
    router.refresh()
  }

  return (
    <div className="space-y-5">
      <div className="sticky top-0 z-20 -mx-5 -mt-[calc(env(safe-area-inset-top)+2.5rem)] flex items-center justify-between border-b border-line bg-chalk px-5 pb-3 pt-[calc(env(safe-area-inset-top)+1rem)]">
        <button className="btn-soft btn-sm -ml-1 bg-transparent" onClick={() => router.back()}>Batal</button>
        <span className="font-display text-xl font-semibold">{initial ? 'Edit routine lari' : 'Routine lari'}</span>
        <button className="btn-dark btn-sm" onClick={save} disabled={saving}>{saving ? 'Menyimpan' : 'Simpan'}</button>
      </div>

      <input
        className="w-full bg-transparent font-display text-[32px] font-semibold leading-tight tracking-tight outline-none placeholder:text-steel/50"
        placeholder="Nama, mis. Interval Selasa"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <div className="flex flex-wrap gap-2">
        {RUN_TYPES.map((t) => (
          <button
            key={t.key}
            onClick={() => pickType(t.key)}
            className={`chip ${type === t.key ? 'bg-plate-red text-white' : 'bg-white text-ink ring-1 ring-line'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <section className="card grid grid-cols-3 gap-3">
        <label>
          <span className="field mb-1.5">Jarak (km)</span>
          <input className="input num text-center text-lg" inputMode="decimal" placeholder="5" value={km} onChange={(e) => setKm(e.target.value)} />
        </label>
        <label>
          <span className="field mb-1.5">Durasi (mnt)</span>
          <input className="input num text-center text-lg" inputMode="decimal" placeholder="30" value={min} onChange={(e) => setMin(e.target.value)} />
        </label>
        <label>
          <span className="field mb-1.5">Pace /km</span>
          <input className="input num text-center text-lg" inputMode="text" placeholder={autoPace || '6:00'} value={pace} onChange={(e) => setPace(e.target.value)} />
        </label>
        <p className="col-span-3 text-[13px] text-steel">Semua opsional. Kalau jarak dan durasi diisi, pace dihitung otomatis</p>
      </section>

      <label className="block">
        <span className="field mb-1.5">Susunan sesi</span>
        <textarea className="input min-h-[140px] resize-y leading-relaxed" value={structure} onChange={(e) => setStructure(e.target.value)} />
      </label>

      {initial && <button className="btn w-full text-plate-red" onClick={remove}><Icon name="trash" size={18} />Hapus routine lari</button>}
    </div>
  )
}
