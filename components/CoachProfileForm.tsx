'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Profile = Record<string, any>

const GOALS = ['Hybrid: kuat di gym + kencang lari', 'Fokus kekuatan (angkat lebih berat)', 'Fokus otot (hipertrofi)', 'Fokus lari / daya tahan', 'Turun lemak sambil jaga otot']
const LEVELS = ['Pemula (< 1 tahun)', 'Menengah (1-3 tahun)', 'Lanjut (> 3 tahun)']
const EQUIP = ['Gym lengkap', 'Home gym (dumbbell/barbell)', 'Bodyweight saja']

export default function CoachProfileForm({ initial }: { initial: Profile | null }) {
  const router = useRouter()
  const [p, setP] = useState<Profile>(
    initial ?? {
      goal: GOALS[0], gym_experience: LEVELS[0], run_experience: LEVELS[0], equipment: EQUIP[0],
      gym_days: 4, run_days: 3, session_minutes: 60,
    }
  )
  const [saving, setSaving] = useState(false)
  const set = (k: string, v: unknown) => setP({ ...p, [k]: v })
  const num = (v: string) => (v === '' ? null : Number(v.replace(',', '.')))

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { error } = await createClient()
      .from('coach_profile')
      .upsert({ ...p, updated_at: new Date().toISOString() })
    setSaving(false)
    if (error) return alert(error.message)
    router.push('/coach')
    router.refresh()
  }

  const Select = ({ k, label, options }: { k: string; label: string; options: string[] }) => (
    <label className="block">
      <span className="muted">{label}</span>
      <select className="input mt-1" value={p[k] ?? ''} onChange={(e) => set(k, e.target.value)}>
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
    </label>
  )

  return (
    <form onSubmit={save} className="space-y-4">
      <div>
        <h1 className="h1">Data untuk Coach</h1>
        <p className="muted">Makin lengkap, makin tepat sarannya. Bisa diubah kapan saja</p>
      </div>

      <div className="card space-y-3">
        <Select k="goal" label="Tujuan utama" options={GOALS} />
        <Select k="gym_experience" label="Pengalaman gym" options={LEVELS} />
        <Select k="run_experience" label="Pengalaman lari" options={LEVELS} />
        <Select k="equipment" label="Alat yang tersedia" options={EQUIP} />
      </div>

      <div className="card grid grid-cols-3 gap-2">
        <label><span className="muted">Gym/minggu</span>
          <input className="input mt-1" inputMode="numeric" value={p.gym_days ?? ''} onChange={(e) => set('gym_days', num(e.target.value))} /></label>
        <label><span className="muted">Lari/minggu</span>
          <input className="input mt-1" inputMode="numeric" value={p.run_days ?? ''} onChange={(e) => set('run_days', num(e.target.value))} /></label>
        <label><span className="muted">Menit/sesi</span>
          <input className="input mt-1" inputMode="numeric" value={p.session_minutes ?? ''} onChange={(e) => set('session_minutes', num(e.target.value))} /></label>
        <label><span className="muted">Usia</span>
          <input className="input mt-1" inputMode="numeric" value={p.age ?? ''} onChange={(e) => set('age', num(e.target.value))} /></label>
        <label><span className="muted">Tinggi (cm)</span>
          <input className="input mt-1" inputMode="decimal" value={p.height_cm ?? ''} onChange={(e) => set('height_cm', num(e.target.value))} /></label>
        <label><span className="muted">Berat (kg)</span>
          <input className="input mt-1" inputMode="decimal" value={p.bodyweight_kg ?? ''} onChange={(e) => set('bodyweight_kg', num(e.target.value))} /></label>
      </div>

      <div className="card space-y-3">
        <label className="block"><span className="muted">Target gym</span>
          <input className="input mt-1" placeholder="mis. bench 100 kg, squat 140 kg dalam 6 bulan" value={p.gym_target ?? ''} onChange={(e) => set('gym_target', e.target.value)} /></label>
        <label className="block"><span className="muted">Target lari</span>
          <input className="input mt-1" placeholder="mis. 10K 55 menit, atau HM 2:05:00" value={p.run_target ?? ''} onChange={(e) => set('run_target', e.target.value)} /></label>
        <label className="block"><span className="muted">Cedera / keluhan</span>
          <textarea className="input mt-1" rows={2} placeholder="mis. lutut kiri kadang nyeri setelah lari > 8 km" value={p.injuries ?? ''} onChange={(e) => set('injuries', e.target.value)} /></label>
        <label className="block"><span className="muted">Catatan lain</span>
          <textarea className="input mt-1" rows={2} placeholder="mis. cuma bisa latihan malam, Sabtu bisa long run" value={p.notes ?? ''} onChange={(e) => set('notes', e.target.value)} /></label>
      </div>

      <button className="btn-primary w-full" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan & Lanjut ke Coach'}</button>
    </form>
  )
}
