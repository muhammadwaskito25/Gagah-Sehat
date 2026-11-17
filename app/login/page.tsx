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
    // Tunggu sebentar agar cookie sesi ter-set oleh browser sebelum redirect
    setMsg('Berhasil, membuka app...')
    await new Promise((r) => setTimeout(r, 300))
    window.location.replace('/')
  }

  return (
    <div className="flex min-h-[80dvh] flex-col justify-center gap-6">
      <div>
        <h1 className="text-3xl font-bold">Gagah</h1>
        <p className="muted">Catatan gym dan lari</p>
      </div>
      <form onSubmit={submit} className="space-y-3">
        <input className="input" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="input" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
        <button className="btn-primary w-full" disabled={loading}>
          {loading ? 'Tunggu...' : mode === 'in' ? 'Masuk' : 'Daftar'}
        </button>
      </form>
      {msg && <p className="text-sm text-amber-400">{msg}</p>}
      <button className="muted underline" onClick={() => setMode(mode === 'in' ? 'up' : 'in')}>
        {mode === 'in' ? 'Belum punya akun? Daftar' : 'Sudah punya akun? Masuk'}
      </button>
    </div>
  )
}
