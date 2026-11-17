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
    <label className="block px-4 py-3">
      <span className="field mb-1.5">{label}</span>
      <select className="input" value={p[k] ?? ''} onChange={(e) => set(k, e.target.value)}>
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
    </label>
  )
  const Num = ({ k, label, decimal }: { k: string; label: string; decimal?: boolean }) => (
    <label className="block">
      <span className="field mb-1.5">{label}</span>
      <input className="input num text-center text-lg" inputMode={decimal ? 'decimal' : 'numeric'} value={p[k] ?? ''} onChange={(e) => set(k, num(e.target.value))} />
    </label>
  )
  const Text = ({ k, label, placeholder, area }: { k: string; label: string; placeholder: string; area?: boolean }) => (
    <label className="block px-4 py-3">
      <span className="field mb-1.5">{label}</span>
      {area ? (
        <textarea className="input resize-none" rows={2} placeholder={placeholder} value={p[k] ?? ''} onChange={(e) => set(k, e.target.value)} />
      ) : (
        <input className="input" placeholder={placeholder} value={p[k] ?? ''} onChange={(e) => set(k, e.target.value)} />
      )}
    </label>
  )

  return (
    <form onSubmit={save} className="space-y-6">
      <header className="pt-2">
        <h1 className="title">Data untuk Coach</h1>
        <p className="muted mt-2">Makin lengkap, makin tepat sarannya. Bisa diubah kapan saja</p>
      </header>

      <section className="space-y-3">
        <h2 className="section">Tujuan dan level</h2>
        <div className="list">
          {Select({ k: 'goal', label: 'Tujuan utama', options: GOALS })}
          {Select({ k: 'gym_experience', label: 'Pengalaman gym', options: LEVELS })}
          {Select({ k: 'run_experience', label: 'Pengalaman lari', options: LEVELS })}
          {Select({ k: 'equipment', label: 'Alat yang tersedia', options: EQUIP })}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="section">Jadwal dan tubuh</h2>
        <div className="card grid grid-cols-3 gap-3">
          {Num({ k: 'gym_days', label: 'Gym/minggu' })}
          {Num({ k: 'run_days', label: 'Lari/minggu' })}
          {Num({ k: 'session_minutes', label: 'Menit/sesi' })}
          {Num({ k: 'age', label: 'Usia' })}
          {Num({ k: 'height_cm', label: 'Tinggi (cm)', decimal: true })}
          {Num({ k: 'bodyweight_kg', label: 'Berat (kg)', decimal: true })}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="section">Target dan catatan</h2>
        <div className="list">
          {Text({ k: 'gym_target', label: 'Target gym', placeholder: 'mis. bench 100 kg dalam 6 bulan' })}
          {Text({ k: 'run_target', label: 'Target lari', placeholder: 'mis. 10K 55 menit, atau HM 2:05:00' })}
          {Text({ k: 'injuries', label: 'Cedera atau keluhan', placeholder: 'mis. lutut kiri nyeri setelah lari jauh', area: true })}
          {Text({ k: 'notes', label: 'Catatan lain', placeholder: 'mis. cuma bisa latihan malam', area: true })}
        </div>
      </section>

      <button className="btn-dark h-14 w-full" disabled={saving}>{saving ? 'Menyimpan' : 'Simpan dan lihat saran'}</button>
    </form>
  )
}
