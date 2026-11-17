'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Icon from './Icon'

export default function StravaPanel({ connected }: { connected: boolean }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  async function sync(full = false) {
    setLoading(true)
    setMsg('')
    const r = await fetch(`/api/strava/sync${full ? '?full=1' : ''}`, { method: 'POST' })
    const j = await r.json()
    setLoading(false)
    setMsg(j.error ?? (j.imported ? `${j.imported} lari baru ditarik dari Strava` : 'Sudah paling baru'))
    router.refresh()
  }

  if (!connected) {
    return (
      <a href="/api/strava/connect" className="btn h-12 w-full bg-[#FC4C02] text-white">
        Sambungkan Strava
      </a>
    )
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <button className="btn h-12 bg-[#FC4C02] text-white" disabled={loading} onClick={() => sync()}>
          <Icon name="refresh" size={18} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Menyinkronkan' : 'Sinkronkan Strava'}
        </button>
        <button className="btn-ghost h-12 text-sm" disabled={loading} onClick={() => sync(true)}>Tarik semua</button>
      </div>
      {msg && <p className="muted">{msg}</p>}
    </div>
  )
}
