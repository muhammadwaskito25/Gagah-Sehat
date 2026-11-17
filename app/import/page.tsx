'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import BackLink from '@/components/BackLink'
import Icon from '@/components/Icon'
import { guessGroup, parseHevy, parseRoutineText, routinesFrom, type HevyWorkout } from '@/lib/hevy-import'

type Lib = { id: string; name: string; equipment: string | null }

export default function ImportPage() {
  const supabase = createClient()
  const [mode, setMode] = useState<'text' | 'csv'>('text')
  const [workouts, setWorkouts] = useState<HevyWorkout[] | null>(null)
  const [fileName, setFileName] = useState('')
  const [withHistory, setWithHistory] = useState(true)
  const [withRoutines, setWithRoutines] = useState(true)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  async function onFile(f: File) {
    setError('')
    setDone(false)
    setFileName(f.name)
    try {
      const w = parseHevy(await f.text())
      if (!w.length) throw new Error('Tidak ada workout yang terbaca di file ini')
      setWorkouts(w)
    } catch (e) {
      setWorkouts(null)
      setError((e as Error).message)
    }
  }

  const routines = workouts ? routinesFrom(workouts) : []
  const exerciseNames = workouts ? [...new Set(workouts.flatMap((w) => w.rows.map((r) => r.exercise)))] : []
  const setCount = workouts ? workouts.reduce((n, w) => n + w.rows.length, 0) : 0

  async function run() {
    if (!workouts) return
    setBusy(true)
    setError('')
    try {
      // 1. Cocokkan nama latihan Hevy dengan library, buat yang belum ada
      setStatus('Mencocokkan latihan...')
      const { data: libData } = await supabase.from('exercises').select('id,name,equipment')
      const lib: Lib[] = libData ?? []
      const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim()
      const idOf = new Map<string, string>()
      const missing: string[] = []
      for (const name of exerciseNames) {
        const m = name.match(/^(.*?)\s*\(([^)]+)\)\s*$/)
        const found =
          lib.find((e) => norm(e.name) === norm(name)) ??
          (m ? lib.find((e) => norm(e.name) === norm(m[1]) && norm(e.equipment ?? '') === norm(m[2])) : undefined)
        if (found) idOf.set(name, found.id)
        else missing.push(name)
      }
      if (missing.length) {
        const { data, error } = await supabase
          .from('exercises')
          .insert(missing.map((name) => ({ name, muscle_group: guessGroup(name), equipment: name.match(/\(([^)]+)\)/)?.[1] ?? null })))
          .select('id,name')
        if (error) throw error
        for (const e of data ?? []) idOf.set(e.name, e.id)
      }

      // 2. Riwayat latihan (lewati yang sudah pernah diimpor)
      let addedW = 0
      if (withHistory) {
        setStatus('Mengimpor riwayat latihan...')
        const { data: existing } = await supabase.from('workouts').select('name,started_at')
        const seen = new Set((existing ?? []).map((w) => `${new Date(w.started_at).toISOString()}|${w.name}`))
        const fresh = workouts.filter((w) => !seen.has(`${w.start}|${w.title}`))
        for (let i = 0; i < fresh.length; i += 100) {
          const chunk = fresh.slice(i, i + 100)
          const { data: ins, error } = await supabase
            .from('workouts')
            .insert(chunk.map((w) => ({ name: w.title, started_at: w.start, ended_at: w.end })))
            .select('id,name,started_at')
          if (error) throw error
          const sets = (ins ?? []).flatMap((row) => {
            const w = chunk.find((c) => c.title === row.name && c.start === new Date(row.started_at).toISOString())
            if (!w) return []
            const order: string[] = []
            for (const r of w.rows) if (!order.includes(r.exercise)) order.push(r.exercise)
            return w.rows.map((r) => ({
              workout_id: row.id,
              exercise_id: idOf.get(r.exercise)!,
              position: order.indexOf(r.exercise),
              set_index: r.setIndex,
              weight: r.weight,
              reps: r.reps,
              set_type: r.setType,
            }))
          })
          for (let j = 0; j < sets.length; j += 500) {
            const { error: e2 } = await supabase.from('workout_sets').insert(sets.slice(j, j + 500))
            if (e2) throw e2
          }
          addedW += chunk.length
          setStatus(`Mengimpor riwayat latihan... ${addedW}/${fresh.length}`)
        }
      }

      // 3. Routine (lewati nama yang sudah ada)
      let addedR = 0
      if (withRoutines) {
        setStatus('Membuat routine...')
        const { data: existingR } = await supabase.from('routines').select('name')
        const names = new Set((existingR ?? []).map((r) => r.name.toLowerCase()))
        for (const r of routines) {
          if (names.has(r.name.toLowerCase())) continue
          const { data: routine, error } = await supabase.from('routines').insert({ name: r.name }).select('id').single()
          if (error || !routine) throw error
          const { error: e2 } = await supabase.from('routine_exercises').insert(
            r.exercises.map((e, position) => ({
              routine_id: routine.id,
              exercise_id: idOf.get(e.name)!,
              position,
              target_sets: e.sets,
              target_reps: e.reps,
              rest_seconds: 90,
            }))
          )
          if (e2) throw e2
          addedR++
        }
      }

      setStatus(`Selesai: ${addedW} latihan dan ${addedR} routine ditambahkan`)
      setDone(true)
    } catch (e) {
      setError((e as { message?: string }).message ?? 'Gagal mengimpor')
      setStatus('')
    }
    setBusy(false)
  }

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <BackLink href="/profile" label="Profile" />
        <h1 className="title">Impor dari Hevy</h1>
      </header>

      <div className="grid grid-cols-2 gap-1 rounded-xl bg-white p-1 ring-1 ring-line">
        {([['text', 'Tempel routine'], ['csv', 'File CSV']] as const).map(([k, l]) => (
          <button key={k} onClick={() => setMode(k)} className={`rounded-lg py-2 text-sm font-semibold ${mode === k ? 'bg-ink text-white' : 'text-steel'}`}>{l}</button>
        ))}
      </div>

      {mode === 'text' ? <PasteRoutine /> : (<>
      <section className="card space-y-2 text-[15px] leading-relaxed">
        <p className="font-semibold">Cara ambil file dari Hevy</p>
        <ol className="list-decimal space-y-1 pl-5 text-ink/80">
          <li>Buka Hevy, masuk ke Profile lalu Settings</li>
          <li>Pilih Export & Import Data, lalu Export Data</li>
          <li>Pilih Export Workouts dan simpan file CSV-nya</li>
          <li>Pilih file itu di bawah</li>
        </ol>
      </section>

      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[18px] border-2 border-dashed border-line bg-white px-4 py-8 text-center">
        <Icon name="up" size={24} className="text-plate-blue" />
        <span className="font-semibold">{fileName || 'Pilih file CSV Hevy'}</span>
        <span className="muted">{fileName ? 'Ketuk untuk ganti file' : 'workouts.csv'}</span>
        <input type="file" accept=".csv,.tsv,text/csv" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
      </label>

      {error && <p className="card border-plate-red/40 text-sm text-plate-red">{error}</p>}

      {workouts && (
        <>
          <div className="grid grid-cols-3 divide-x divide-line rounded-[18px] border border-line bg-white py-3">
            {[
              ['Latihan', workouts.length],
              ['Set', setCount],
              ['Routine', routines.length],
            ].map(([l, v]) => (
              <div key={l} className="px-4">
                <div className="text-[13px] text-steel">{l}</div>
                <div className="num mt-0.5 text-2xl leading-none">{v}</div>
              </div>
            ))}
          </div>

          <div className="list">
            <Toggle checked={withRoutines} onChange={setWithRoutines} title="Buat routine" sub={routines.map((r) => r.name).join(', ')} />
            <Toggle checked={withHistory} onChange={setWithHistory} title="Impor riwayat latihan" sub="Mengisi kolom Sebelumnya dan grafik progres" />
          </div>

          {done ? (
            <div className="space-y-3">
              <p className="card border-plate-green/40 text-sm">{status}</p>
              <Link href="/routines" className="btn-dark h-14 w-full">Buka Workout</Link>
            </div>
          ) : (
            <>
              {status && <p className="muted text-center">{status}</p>}
              <button className="btn-dark h-14 w-full" disabled={busy || (!withHistory && !withRoutines)} onClick={run}>
                {busy ? 'Mengimpor...' : 'Impor sekarang'}
              </button>
            </>
          )}
        </>
      )}
      </>)}
    </div>
  )
}

function PasteRoutine() {
  const supabase = createClient()
  const [name, setName] = useState('')
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState<string[]>([])
  const [error, setError] = useState('')
  const items = parseRoutineText(text)

  async function save() {
    if (!name.trim()) return setError('Isi nama routine dulu, misalnya Upper Day')
    if (!items.length) return setError('Belum ada latihan yang terbaca')
    setBusy(true)
    setError('')
    try {
      const { data: libData } = await supabase.from('exercises').select('id,name,equipment')
      const lib: Lib[] = libData ?? []
      const norm = (x: string) => x.toLowerCase().replace(/\s+/g, ' ').trim()
      const ids: string[] = []
      for (const it of items) {
        const m = it.name.match(/^(.*?)\s*\(([^)]+)\)\s*$/)
        let found =
          lib.find((e) => norm(e.name) === norm(it.name)) ??
          (m ? lib.find((e) => norm(e.name) === norm(m[1]) && norm(e.equipment ?? '') === norm(m[2])) : undefined)
        if (!found) {
          const { data, error } = await supabase
            .from('exercises')
            .insert({ name: it.name, muscle_group: guessGroup(it.name), equipment: m?.[2] ?? null })
            .select('id,name,equipment')
            .single()
          if (error || !data) throw error
          lib.push(data)
          found = data
        }
        ids.push(found.id)
      }
      const { data: routine, error } = await supabase.from('routines').insert({ name: name.trim() }).select('id').single()
      if (error || !routine) throw error
      const { error: e2 } = await supabase.from('routine_exercises').insert(
        items.map((it, position) => ({
          routine_id: routine.id,
          exercise_id: ids[position],
          position,
          target_sets: it.sets,
          target_reps: it.reps,
          rest_seconds: it.rest,
        }))
      )
      if (e2) throw e2
      setSaved([...saved, name.trim()])
      setName('')
      setText('')
    } catch (e) {
      setError((e as { message?: string }).message ?? 'Gagal menyimpan')
    }
    setBusy(false)
  }

  return (
    <div className="space-y-4">
      {saved.length > 0 && (
        <div className="card space-y-3 border-plate-green/40">
          <p className="text-sm">Tersimpan: <span className="font-semibold">{saved.join(', ')}</span>. Tempel routine berikutnya atau buka Workout</p>
          <Link href="/routines" className="btn-dark btn-sm w-full">Buka Workout</Link>
        </div>
      )}
      <label className="block">
        <span className="field mb-1.5">Nama routine</span>
        <input className="input" placeholder="mis. Upper Day" value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label className="block">
        <span className="field mb-1.5">Tempel teks routine dari Hevy</span>
        <textarea
          className="input min-h-[180px] resize-y font-mono text-[13px] leading-relaxed"
          placeholder={'Incline Chest Press (Machine)\n3 sets · 8-12 reps\nRest 50s\nLat Pulldown (Cable)\n2 sets · 8-10 reps'}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </label>

      {items.length > 0 && (
        <div className="list">
          {items.map((it, i) => (
            <div key={i} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <span className="min-w-0">
                <span className="block truncate text-[15px] font-medium">{it.name}</span>
                <span className="block text-[13px] text-steel">{guessGroup(it.name)}, istirahat {it.rest} dtk</span>
              </span>
              <span className="num shrink-0 text-lg">{it.sets} × {it.reps}</span>
            </div>
          ))}
        </div>
      )}

      {error && <p className="card border-plate-red/40 text-sm text-plate-red">{error}</p>}
      <button className="btn-dark h-14 w-full" disabled={busy || !items.length} onClick={save}>
        {busy ? 'Menyimpan...' : items.length ? `Simpan routine (${items.length} latihan)` : 'Simpan routine'}
      </button>
    </div>
  )
}

function Toggle({ checked, onChange, title, sub }: { checked: boolean; onChange: (v: boolean) => void; title: string; sub: string }) {
  return (
    <label className="row cursor-pointer">
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{title}</span>
        <span className="block truncate text-sm text-steel">{sub}</span>
      </span>
      <input type="checkbox" className="h-5 w-5 accent-[#15181D]" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  )
}
