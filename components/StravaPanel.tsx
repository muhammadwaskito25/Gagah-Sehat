'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

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
    setMsg(j.error ?? `${j.imported} lari ditarik dari Strava`)
    router.refresh()
  }

  if (!connected) {
    return (
      <a href="/api/strava/connect" className="btn block bg-[#fc4c02] text-center text-white">
        Hubungkan Strava
      </a>
    )
  }

  return (
    <div className="space-y-1">
      <div className="flex gap-2">
        <button className="btn flex-1 bg-[#fc4c02] text-white" disabled={loading} onClick={() => sync()}>
          {loading ? 'Sinkron...' : '↻ Sync Strava'}
        </button>
        <button className="btn-ghost text-sm" disabled={loading} onClick={() => sync(true)} title="Tarik ulang semua">
          Semua
        </button>
      </div>
      {msg && <p className="muted">{msg}</p>}
    </div>
  )
}
