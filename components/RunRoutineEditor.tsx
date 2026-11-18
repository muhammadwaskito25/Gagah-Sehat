'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Icon from './Icon'
import { RUN_TYPES, SEGMENT_KINDS, paceText, parsePace, type RunRoutine } from '@/lib/run'

type Row = { kind: string; km: string; min: string }
const num = (v: string) => Number(v.replace(',', '.')) || 0

export default function RunRoutineEditor({ initial }: { initial: RunRoutine | null }) {
  const router = useRouter()
  const supabase = createClient()
  const [name, setName] = useState(initial?.name ?? '')
  const [type, setType] = useState(initial?.run_type ?? 'easy')
  const [km, setKm] = useState(initial?.target_distance_m ? String(initial.target_distance_m / 1000) : '')
  const [min, setMin] = useState(initial?.target_duration_s ? String(Math.round(initial.target_duration_s / 60)) : '')
  const [pace, setPace] = useState(paceText(initial?.target_pace_s))
  const [structure, setStructure] = useState(initial?.structure ?? RUN_TYPES[0].template)
  const [rows, setRows] = useState<Row[]>(
    (initial?.segments ?? []).map((g) => ({
      kind: g.kind,
      km: g.distance_m ? String(Math.round((g.distance_m / 1000) * 1000) / 1000) : '',
      min: g.duration_s ? String(Math.round((g.duration_s / 60) * 10) / 10) : '',
    }))
  )
  const [builder, setBuilder] = useState(false)
  const [b, setB] = useState({ reps: '6', km: '0.4', work: '2', rest: '1.5' })
  const [saving, setSaving] = useState(false)

  function patchRow(i: number, p: Partial<Row>) {
    setRows((l) => l.map((r, j) => (j === i ? { ...r, ...p } : r)))
  }
  function addRow() {
    setRows((l) => {
      const last = l[l.length - 1]
      return [...l, last ? { ...last } : { kind: 'warmup', km: '', min: '10' }]
    })
  }
  function buildIntervals() {
    const n = Math.max(1, Math.min(30, Math.round(num(b.reps))))
    const add: Row[] = []
    for (let i = 0; i < n; i++) {
      add.push({ kind: 'work', km: b.km, min: b.work })
      if (i < n - 1 && num(b.rest) > 0) add.push({ kind: 'rest', km: '', min: b.rest })
    }
    setRows((l) => [...l, ...add])
    setBuilder(false)
  }
  const segKm = rows.reduce((a, r) => a + num(r.km), 0)
  const segMin = rows.reduce((a, r) => a + num(r.min), 0)

  const kmN = Number(km.replace(',', '.'))
  const minN = Number(min.replace(',', '.'))
  const autoPace = kmN && minN ? paceText((minN * 60) / kmN) : ''

  function pickType(k: string) {
    const cur = RUN_TYPES.find((t) => t.key === type)
    // Ganti template hanya kalau isinya masih template bawaan / kosong
    if (!structure.trim() || structure === cur?.template) setStructure(RUN_TYPES.find((t) => t.key === k)!.template)
    if (!name.trim() || RUN_TYPES.some((t) => t.label === name)) setName(RUN_TYPES.find((t) => t.key === k)!.label)
    setType(k)
  }

  async function save() {
    if (!name.trim()) return alert('Isi nama routine lari dulu')
    const p = pace ? parsePace(pace) : null
    if (pace && !p) return alert('Format pace mm:ss, mis. 6:15')
    setSaving(true)
    const useSeg = rows.length > 0
    const dKm = useSeg ? segKm : kmN
    const dMin = useSeg ? segMin : minN
    const row = {
      name: name.trim(),
      run_type: type,
      target_distance_m: dKm ? Math.round(dKm * 1000) : null,
      target_duration_s: dMin ? Math.round(dMin * 60) : null,
      target_pace_s: p ?? (dKm && dMin ? Math.round((dMin * 60) / dKm) : null),
      structure: structure.trim() || null,
      segments: useSeg
        ? rows.map((r) => ({
            kind: r.kind,
            distance_m: num(r.km) ? Math.round(num(r.km) * 1000) : null,
            duration_s: num(r.min) ? Math.round(num(r.min) * 60) : null,
          }))
        : null,
    }
    const { error } = initial
      ? await supabase.from('run_routines').update(row).eq('id', initial.id)
      : await supabase.from('run_routines').insert(row)
    setSaving(false)
    if (error) return alert(error.message)
    router.push('/routines')
    router.refresh()
  }

  async function remove() {
    if (!initial || !confirm('Hapus routine lari ini?')) return
    await supabase.from('run_routines').delete().eq('id', initial.id)
    router.push('/routines')
    router.refresh()
  }

  return (
    <div className="space-y-5">
      <div className="sticky top-0 z-20 -mx-5 -mt-[calc(env(safe-area-inset-top)+2.5rem)] flex items-center justify-between border-b border-line bg-chalk px-5 pb-3 pt-[calc(env(safe-area-inset-top)+1rem)]">
        <button className="btn-soft btn-sm -ml-1 bg-transparent" onClick={() => router.back()}>Batal</button>
        <span className="font-display text-xl font-semibold">{initial ? 'Edit routine lari' : 'Routine lari'}</span>
        <button className="btn-dark btn-sm" onClick={save} disabled={saving}>{saving ? 'Menyimpan' : 'Simpan'}</button>
      </div>

      <input
        className="w-full bg-transparent font-display text-[32px] font-semibold leading-tight tracking-tight outline-none placeholder:text-steel/50"
        placeholder="Nama, mis. Interval Selasa"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <div className="flex flex-wrap gap-2">
        {RUN_TYPES.map((t) => (
          <button
            key={t.key}
            onClick={() => pickType(t.key)}
            className={`chip ${type === t.key ? 'bg-plate-red text-white' : 'bg-white text-ink ring-1 ring-line'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="section">Set</h2>
          {rows.length > 0 && (
            <span className="text-[13px] text-steel">
              Total {Math.round(segKm * 100) / 100} km, {Math.round(segMin * 10) / 10} mnt
            </span>
          )}
        </div>

        {rows.length === 0 && (
          <div className="card py-6 text-center">
            <p className="font-semibold">Belum ada set</p>
            <p className="muted mt-1">Tambah set untuk pemanasan, interval, istirahat, atau pendinginan</p>
          </div>
        )}

        {rows.length > 0 && (
          <div className="card space-y-2">
            <div className="grid grid-cols-[1.5rem_1fr_4.2rem_4.2rem_2rem] items-center gap-2 text-center text-[11px] font-semibold text-steel">
              <span>#</span><span className="text-left">Jenis</span><span>km</span><span>Menit</span><span />
            </div>
            {rows.map((r, i) => (
              <div key={i} className="grid grid-cols-[1.5rem_1fr_4.2rem_4.2rem_2rem] items-center gap-2">
                <span className="num text-center text-base font-semibold text-steel">{i + 1}</span>
                <select
                  className={`input h-11 px-2 text-[15px] font-semibold ${r.kind === 'rest' ? 'text-steel' : ''}`}
                  value={r.kind}
                  onChange={(e) => patchRow(i, { kind: e.target.value })}
                >
                  {SEGMENT_KINDS.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}
                </select>
                <input className="input num h-11 px-1 text-center text-lg" inputMode="decimal" placeholder="-" value={r.km} onChange={(e) => patchRow(i, { km: e.target.value })} />
                <input className="input num h-11 px-1 text-center text-lg" inputMode="decimal" placeholder="-" value={r.min} onChange={(e) => patchRow(i, { min: e.target.value })} />
                <button aria-label="Hapus set" className="flex h-9 w-8 items-center justify-center rounded-full text-steel active:bg-chalk" onClick={() => setRows((l) => l.filter((_, j) => j !== i))}><Icon name="x" size={16} /></button>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button className="btn-soft btn-sm" onClick={addRow}><Icon name="plus" size={16} />Tambah set</button>
          <button className="btn-soft btn-sm" onClick={() => setBuilder(!builder)}><Icon name="run" size={16} />Buat interval</button>
        </div>

        {builder && (
          <div className="card space-y-3">
            <div className="grid grid-cols-4 gap-2">
              <label><span className="field mb-1">Ulang</span><input className="input num px-1 text-center text-lg" inputMode="numeric" value={b.reps} onChange={(e) => setB({ ...b, reps: e.target.value })} /></label>
              <label><span className="field mb-1">km</span><input className="input num px-1 text-center text-lg" inputMode="decimal" value={b.km} onChange={(e) => setB({ ...b, km: e.target.value })} /></label>
              <label><span className="field mb-1">Cepat (mnt)</span><input className="input num px-1 text-center text-lg" inputMode="decimal" value={b.work} onChange={(e) => setB({ ...b, work: e.target.value })} /></label>
              <label><span className="field mb-1">Rehat (mnt)</span><input className="input num px-1 text-center text-lg" inputMode="decimal" value={b.rest} onChange={(e) => setB({ ...b, rest: e.target.value })} /></label>
            </div>
            <p className="text-[13px] text-steel">Menambah set lari dan istirahat bergantian, set terakhir tanpa istirahat</p>
            <button className="btn-dark w-full" onClick={buildIntervals}>Tambahkan ke routine</button>
          </div>
        )}
      </section>

      {rows.length === 0 && (
        <section className="card grid grid-cols-3 gap-3">
          <label>
            <span className="field mb-1.5">Jarak (km)</span>
            <input className="input num text-center text-lg" inputMode="decimal" placeholder="5" value={km} onChange={(e) => setKm(e.target.value)} />
          </label>
          <label>
            <span className="field mb-1.5">Durasi (mnt)</span>
            <input className="input num text-center text-lg" inputMode="decimal" placeholder="30" value={min} onChange={(e) => setMin(e.target.value)} />
          </label>
          <label>
            <span className="field mb-1.5">Pace /km</span>
            <input className="input num text-center text-lg" inputMode="text" placeholder={autoPace || '6:00'} value={pace} onChange={(e) => setPace(e.target.value)} />
          </label>
          <p className="col-span-3 text-[13px] text-steel">Untuk lari biasa tanpa set. Kalau jarak dan durasi diisi, pace dihitung otomatis</p>
        </section>
      )}

      <label className="block">
        <span className="field mb-1.5">Catatan sesi</span>
        <textarea className="input min-h-[110px] resize-y leading-relaxed" value={structure} onChange={(e) => setStructure(e.target.value)} />
      </label>

      {initial && <button className="btn w-full text-plate-red" onClick={remove}><Icon name="trash" size={18} />Hapus routine lari</button>}
    </div>
  )
}
