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
        <div className="mb-10 flex h-14 w-14 items-center justify-center rounded-full bg-plate-blue">
          <span className="h-4 w-4 rounded-full bg-chalk" />
        </div>
        <h1 className="font-display text-[56px] font-bold leading-[0.9] tracking-tight">Gagah</h1>
        <p className="mt-3 max-w-[16rem] text-[17px] leading-snug text-steel">Catat angkatan, pantau lari, lihat dirimu makin kuat tiap minggu</p>
      </div>

      <div>
        <form onSubmit={submit} className="space-y-3">
          <label className="block">
            <span className="field mb-1.5">Email</span>
            <input className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label className="block">
            <span className="field mb-1.5">Password</span>
            <input className="input" type="password" autoComplete={mode === 'in' ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          </label>
          {msg && <p className="rounded-xl bg-white px-3.5 py-3 text-sm text-ink ring-1 ring-line">{msg}</p>}
          <button className="btn-dark mt-2 w-full" disabled={loading}>
            {loading ? 'Tunggu...' : mode === 'in' ? 'Masuk' : 'Buat akun'}
          </button>
        </form>
        <button className="mt-5 w-full text-center text-sm text-steel" onClick={() => { setMode(mode === 'in' ? 'up' : 'in'); setMsg('') }}>
          {mode === 'in' ? 'Belum punya akun? ' : 'Sudah punya akun? '}
          <span className="font-semibold text-ink underline underline-offset-4">{mode === 'in' ? 'Daftar' : 'Masuk'}</span>
        </button>
      </div>
    </div>
  )
}
