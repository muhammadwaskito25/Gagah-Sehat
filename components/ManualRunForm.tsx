'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Icon from './Icon'

export default function ManualRunForm() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [km, setKm] = useState('')
  const [min, setMin] = useState('')
  const [sec, setSec] = useState('')
  const [date, setDate] = useState(() => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 16))
  const [name, setName] = useState('Lari')
  const [saving, setSaving] = useState(false)

  async function save() {
    const distance = Number(km.replace(',', '.')) * 1000
    const time = (Number(min) || 0) * 60 + (Number(sec) || 0)
    if (!distance || !time) return alert('Isi jarak dan waktu dulu')
    setSaving(true)
    const { error } = await createClient().from('runs').insert({
      name,
      source: 'manual',
      start_date: new Date(date + ':00+07:00').toISOString(),
      distance_m: distance,
      moving_time_s: time,
      elapsed_time_s: time,
    })
    setSaving(false)
    if (error) return alert(error.message)
    setOpen(false)
    setKm(''); setMin(''); setSec('')
    router.refresh()
  }

  if (!open) {
    return <button className="btn-ghost h-12 w-full" onClick={() => setOpen(true)}><Icon name="plus" size={18} />Catat lari manual</button>
  }

  return (
    <section className="card space-y-3">
      <h3 className="font-semibold">Catat lari</h3>
      <label className="block">
        <span className="field mb-1">Nama</span>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label className="block">
        <span className="field mb-1">Waktu mulai</span>
        <input className="input" type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
      </label>
      <div className="grid grid-cols-3 gap-2">
        <label><span className="field mb-1">Jarak (km)</span><input className="input num text-center text-lg" inputMode="decimal" value={km} onChange={(e) => setKm(e.target.value)} /></label>
        <label><span className="field mb-1">Menit</span><input className="input num text-center text-lg" inputMode="numeric" value={min} onChange={(e) => setMin(e.target.value)} /></label>
        <label><span className="field mb-1">Detik</span><input className="input num text-center text-lg" inputMode="numeric" value={sec} onChange={(e) => setSec(e.target.value)} /></label>
      </div>
      <div className="grid grid-cols-2 gap-2 pt-1">
        <button className="btn-soft" onClick={() => setOpen(false)}>Batal</button>
        <button className="btn-dark" disabled={saving} onClick={save}>{saving ? 'Menyimpan' : 'Simpan lari'}</button>
      </div>
    </section>
  )
}
