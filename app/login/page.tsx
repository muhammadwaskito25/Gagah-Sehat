'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMsg('')
    const { data, error } =
      mode === 'in'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password })
    if (error) {
      setLoading(false)
      if (error.message.toLowerCase().includes('email not confirmed')) {
        return setMsg('Email belum dikonfirmasi. Klik link di email dari Supabase, atau matikan "Confirm email" di Supabase Dashboard')
      }
      if (error.message.toLowerCase().includes('invalid login')) return setMsg('Email atau password salah')
      return setMsg(error.message)
    }
    if (!data.session) {
      setLoading(false)
      setMode('in')
      return setMsg('Akun dibuat, tapi perlu konfirmasi email dulu. Cek inbox/spam, lalu Masuk')
    }
    setMsg('Berhasil, membuka app...')
    await new Promise((r) => setTimeout(r, 300))
    window.location.replace('/')
  }

  return (
    <div className="flex min-h-[88dvh] flex-col justify-between pt-10">
      <div>
        <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FF5500] to-[#CC3700] shadow-lg shadow-orange-500/30">
          <span className="h-4 w-4 rounded-full bg-[#08090C]" />
        </div>
        <h1 className="font-display text-[56px] font-black uppercase leading-[0.9] tracking-tight text-white">Gagah</h1>
        <p className="mt-3 max-w-[17rem] text-[16px] leading-snug text-slate-400">Catat angkatan, pantau lari, lihat dirimu makin kuat dan berotot tiap minggu</p>
      </div>

      <div>
        <form onSubmit={submit} className="space-y-3">
          <label className="block">
            <span className="field mb-1.5">Email</span>
            <input className="input" type="email" autoComplete="email" placeholder="kamu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label className="block">
            <span className="field mb-1.5">Password</span>
            <input className="input" type="password" autoComplete={mode === 'in' ? 'current-password' : 'new-password'} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          </label>
          {msg && <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-3 text-sm font-semibold text-amber-400">{msg}</p>}
          <button className="btn-primary mt-2 w-full text-[15px]" disabled={loading}>
            {loading ? 'Tunggu...' : mode === 'in' ? 'Masuk' : 'Buat Akun'}
          </button>
        </form>
        <button className="mt-5 w-full text-center text-sm text-slate-400 hover:text-white transition" onClick={() => { setMode(mode === 'in' ? 'up' : 'in'); setMsg('') }}>
          {mode === 'in' ? 'Belum punya akun? ' : 'Sudah punya akun? '}
          <span className="font-bold text-[#FF5500] underline underline-offset-4">{mode === 'in' ? 'Daftar' : 'Masuk'}</span>
        </button>
      </div>
    </div>
  )
}
