'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ManualRunForm() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [km, setKm] = useState('')
  const [min, setMin] = useState('')
  const [sec, setSec] = useState('')
  const [date, setDate] = useState(() => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 16))
  const [name, setName] = useState('Lari')

  async function save() {
    const distance = Number(km.replace(',', '.')) * 1000
    const time = (Number(min) || 0) * 60 + (Number(sec) || 0)
    if (!distance || !time) return alert('Isi jarak dan waktu')
    const { error } = await createClient().from('runs').insert({
      name,
      source: 'manual',
      start_date: new Date(date + ':00+07:00').toISOString(),
      distance_m: distance,
      moving_time_s: time,
      elapsed_time_s: time,
    })
    if (error) return alert(error.message)
    setOpen(false)
    setKm(''); setMin(''); setSec('')
    router.refresh()
  }

  if (!open) return <button className="btn-ghost w-full text-sm" onClick={() => setOpen(true)}>+ Tambah lari manual</button>

  return (
    <div className="card space-y-2">
      <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama" />
      <input className="input" type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
      <div className="grid grid-cols-3 gap-2">
        <input className="input" inputMode="decimal" placeholder="km" value={km} onChange={(e) => setKm(e.target.value)} />
        <input className="input" inputMode="numeric" placeholder="menit" value={min} onChange={(e) => setMin(e.target.value)} />
        <input className="input" inputMode="numeric" placeholder="detik" value={sec} onChange={(e) => setSec(e.target.value)} />
      </div>
      <div className="flex gap-2">
        <button className="btn-ghost flex-1" onClick={() => setOpen(false)}>Batal</button>
        <button className="btn-primary flex-1" onClick={save}>Simpan</button>
      </div>
    </div>
  )
}
