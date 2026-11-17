'use client'
import { useState } from 'react'
import Link from 'next/link'
import type { ProposedRoutine } from '@/lib/coach-rules'

export default function CoachApplyButton({ routines }: { routines: ProposedRoutine[] }) {
  const [state, setState] = useState<'idle' | 'saving' | 'done'>('idle')

  async function apply() {
    if (!confirm(`Buat ${routines.length} routine baru dari usulan coach? Routine lamamu tidak dihapus`)) return
    setState('saving')
    const r = await fetch('/api/coach/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ routines }),
    })
    const j = await r.json()
    if (!r.ok) {
      setState('idle')
      return alert(j.error)
    }
    setState('done')
  }

  if (state === 'done') {
    return <Link href="/routines" className="btn-ghost h-14 w-full">Tersimpan, buka Routine</Link>
  }
  return (
    <button className="btn-primary h-14 w-full" disabled={state === 'saving'} onClick={apply}>
      {state === 'saving' ? 'Menyimpan...' : 'Terapkan jadi routine'}
    </button>
  )
}
