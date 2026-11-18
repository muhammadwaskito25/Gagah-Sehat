'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Icon from './Icon'
import { paceText, runTypeLabel, segmentLabel, segmentText, targetText, type RunRoutine } from '@/lib/run'

const KEY = 'gagah-run-session'
type Saved = { routineId: string | null; startedAt: string | null; runningSince: number | null; accumulated: number; laps: number[] }

function clock(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = String(s % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`
}

// "25:30", "1:05:00", atau "25" (menit) -> detik
function parseTime(t: string) {
  const p = t.trim().split(':').map(Number)
  if (p.some(isNaN) || !t.trim()) return 0
  if (p.length === 3) return p[0] * 3600 + p[1] * 60 + p[2]
  if (p.length === 2) return p[0] * 60 + p[1]
  return p[0] * 60
}

export default function RunSession({ routine }: { routine: RunRoutine | null }) {
  const router = useRouter()
  const [st, setSt] = useState<Saved>({ routineId: routine?.id ?? null, startedAt: null, runningSince: null, accumulated: 0, laps: [] })
  const [now, setNow] = useState(Date.now())
  const [finishing, setFinishing] = useState(false)
  const [km, setKm] = useState(routine?.target_distance_m ? String(routine.target_distance_m / 1000) : '')
  const [time, setTime] = useState('')
  const [saving, setSaving] = useState(false)
  const lock = useRef<{ release: () => Promise<void> } | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) {
        const s: Saved = JSON.parse(raw)
        if (s.routineId === (routine?.id ?? null)) setSt(s)
      }
    } catch {}
  }, [routine?.id])

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(st)) } catch {}
  }, [st])

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(t)
  }, [])

  // Layar tetap menyala selama stopwatch jalan
  useEffect(() => {
    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }
    if (st.runningSince && nav.wakeLock) nav.wakeLock.request('screen').then((l) => (lock.current = l)).catch(() => {})
    else lock.current?.release().catch(() => {})
  }, [st.runningSince])

  const elapsed = st.accumulated + (st.runningSince ? now - st.runningSince : 0)
  const lastLap = st.laps[st.laps.length - 1] ?? 0
  const started = !!st.startedAt
  const segs = routine?.segments ?? []
  const cur = st.laps.length
  const curSeg = segs[cur]

  const start = () => setSt({ ...st, startedAt: st.startedAt ?? new Date().toISOString(), runningSince: Date.now() })
  const pause = () => setSt({ ...st, accumulated: elapsed, runningSince: null })
  const lap = () => setSt({ ...st, laps: [...st.laps, elapsed] })

  function openFinish() {
    if (st.runningSince) pause()
    setTime(clock(elapsed))
    setFinishing(true)
  }

  function discard() {
    if (started && !confirm('Buang sesi lari ini?')) return
    localStorage.removeItem(KEY)
    router.push('/routines')
  }

  async function save() {
    const dist = Number(km.replace(',', '.')) * 1000
    const sec = parseTime(time)
    if (!dist || !sec) return alert('Isi jarak dan waktu dulu')
    setSaving(true)
    const lapsText = st.laps.length
      ? (segs.length ? 'Set: ' : 'Lap: ') +
        st.laps.map((l, i) => `${segs[i] ? segmentLabel(segs[i].kind) + ' ' : ''}${clock(l - (st.laps[i - 1] ?? 0))}`).join(', ')
      : null
    const { error } = await createClient().from('runs').insert({
      name: routine?.name ?? 'Lari',
      sport_type: 'Run',
      source: 'manual',
      run_routine_id: routine?.id ?? null,
      start_date: st.startedAt ?? new Date(Date.now() - sec * 1000).toISOString(),
      distance_m: dist,
      moving_time_s: sec,
      elapsed_time_s: sec,
      notes: lapsText,
    })
    setSaving(false)
    if (error) return alert(error.message)
    localStorage.removeItem(KEY)
    router.push('/runs')
    router.refresh()
  }

  const kmN = Number(km.replace(',', '.'))
  const secN = parseTime(time)

  return (
    <div className="flex min-h-[85dvh] flex-col">
      <div className="flex items-center justify-between">
        <button className="btn-soft btn-sm -ml-1 bg-transparent text-plate-red" onClick={discard}>Buang</button>
        <span className="tag bg-plate-red/10 text-plate-red">{runTypeLabel(routine?.run_type)}</span>
      </div>

      <h1 className="title mt-4">{routine?.name ?? 'Lari bebas'}</h1>
      {routine && targetText(routine) && <p className="mt-2 text-[15px] text-steel">Target {targetText(routine)}</p>}

      {segs.length > 0 && (
        <ol className="list mt-5">
          {segs.map((g, i) => (
            <li key={i} className={`flex items-center gap-3 px-4 py-3 text-[15px] ${i === cur && started ? 'bg-plate-red/5' : ''}`}>
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold ${i < cur ? 'bg-plate-green text-white' : i === cur && started ? 'bg-plate-red text-white' : 'bg-chalk text-steel'}`}>
                {i < cur ? <Icon name="check" size={13} strokeWidth={3} /> : i + 1}
              </span>
              <span className={`flex-1 ${g.kind === 'rest' ? 'text-steel' : 'font-semibold'} ${i < cur ? 'line-through opacity-50' : ''}`}>{segmentLabel(g.kind)}</span>
              <span className="num text-steel">{segmentText(g)}</span>
            </li>
          ))}
        </ol>
      )}

      {segs.length === 0 && routine?.structure && (
        <ol className="list mt-5">
          {routine.structure.split('\n').filter((l) => l.trim()).map((l, i) => (
            <li key={i} className="flex gap-3 px-4 py-3 text-[15px]">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-plate-red" />
              {l}
            </li>
          ))}
        </ol>
      )}

      {!finishing ? (
        <>
          <div className="my-auto py-10 text-center">
            <div className="num text-[88px] leading-none tracking-tight">{clock(elapsed)}</div>
            {curSeg && started && (
              <div className="mt-3 text-steel">Set {cur + 1}, {segmentLabel(curSeg.kind)}: <span className="num text-lg text-ink">{clock(elapsed - lastLap)}</span></div>
            )}
            {!curSeg && st.laps.length > 0 && <div className="mt-3 text-steel">Lap {st.laps.length + 1}: <span className="num text-lg text-ink">{clock(elapsed - lastLap)}</span></div>}
          </div>

          {st.laps.length > 0 && (
            <div className="list mb-4">
              {[...st.laps].reverse().map((l, ri) => {
                const i = st.laps.length - 1 - ri
                return (
                  <div key={i} className="flex justify-between px-4 py-2.5">
                    <span className="text-steel">{segs[i] ? `Set ${i + 1}, ${segmentLabel(segs[i].kind)}` : `Lap ${i + 1}`}</span>
                    <span className="num text-lg">{clock(l - (st.laps[i - 1] ?? 0))}</span>
                  </div>
                )
              })}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 pb-4">
            {!started ? (
              <button className="btn col-span-2 h-16 bg-plate-red text-lg text-white" onClick={start}>Mulai</button>
            ) : st.runningSince ? (
              <>
                <button className="btn-ghost h-16 text-lg" onClick={lap}>{curSeg ? 'Set berikutnya' : 'Lap'}</button>
                <button className="btn-dark h-16 text-lg" onClick={pause}>Jeda</button>
              </>
            ) : (
              <>
                <button className="btn h-16 bg-plate-red text-lg text-white" onClick={start}>Lanjut</button>
                <button className="btn h-16 bg-plate-green text-lg text-white" onClick={openFinish}>Selesai</button>
              </>
            )}
            {!started && (
              <button className="col-span-2 py-2 text-sm text-steel" onClick={() => { setTime(''); setFinishing(true) }}>
                Sudah lari? Catat hasilnya langsung
              </button>
            )}
          </div>
        </>
      ) : (
        <section className="mt-6 space-y-4 pb-4">
          <h2 className="section">Hasil lari</h2>
          <div className="card grid grid-cols-2 gap-3">
            <label>
              <span className="field mb-1.5">Jarak (km)</span>
              <input className="input num text-center text-xl" inputMode="decimal" value={km} onChange={(e) => setKm(e.target.value)} autoFocus />
            </label>
            <label>
              <span className="field mb-1.5">Waktu</span>
              <input className="input num text-center text-xl" inputMode="text" placeholder="25:30" value={time} onChange={(e) => setTime(e.target.value)} />
            </label>
            <div className="col-span-2 flex items-baseline justify-between border-t border-line pt-3">
              <span className="text-steel">Pace</span>
              <span className="num text-2xl">{kmN && secN ? `${paceText(secN / kmN)} /km` : '-'}</span>
            </div>
          </div>
          <p className="text-[13px] text-steel">Kalau lari ini juga terekam di Strava, cukup sinkronkan Strava saja dan buang sesi ini supaya tidak dobel</p>
          <div className="grid grid-cols-2 gap-3">
            <button className="btn-ghost h-14" onClick={() => setFinishing(false)}><Icon name="left" size={18} />Kembali</button>
            <button className="btn-dark h-14" disabled={saving} onClick={save}>{saving ? 'Menyimpan' : 'Simpan lari'}</button>
          </div>
        </section>
      )}
    </div>
  )
}
