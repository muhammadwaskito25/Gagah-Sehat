'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const supabase = createClient()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMsg('')
    const { error } =
      mode === 'in'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password })
    setLoading(false)
    if (error) return setMsg(error.message)
    if (mode === 'up') setMsg('Akun dibuat. Kalau konfirmasi email aktif, cek inbox dulu')
    router.replace('/')
    router.refresh()
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
