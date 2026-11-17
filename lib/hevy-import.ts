// Parser CSV export "Export Workouts" dari Hevy
export type HevyRow = {
  title: string
  start: string // ISO
  end: string | null
  exercise: string
  setIndex: number
  setType: 'normal' | 'warmup' | 'drop' | 'failure'
  weight: number
  reps: number
}

export type HevyWorkout = { key: string; title: string; start: string; end: string | null; rows: HevyRow[] }

function parseCSV(text: string): string[][] {
  const delim = text.split('\n')[0].includes('\t') ? '\t' : ','
  const out: string[][] = []
  let row: string[] = []
  let cell = ''
  let q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++ }
      else if (c === '"') q = false
      else cell += c
    } else if (c === '"') q = true
    else if (c === delim) { row.push(cell); cell = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(cell); cell = ''
      if (row.some((x) => x.trim() !== '')) out.push(row)
      row = []
    } else cell += c
  }
  row.push(cell)
  if (row.some((x) => x.trim() !== '')) out.push(row)
  return out
}

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, mei: 4, jun: 5, jul: 6, aug: 7, agu: 7, sep: 8, oct: 9, okt: 9, nov: 10, dec: 11, des: 11,
}

// "18 Nov 2026, 07:30" atau ISO; dianggap waktu WIB
function parseDate(s: string): string | null {
  const t = s.trim()
  if (!t) return null
  const m = t.match(/^(\d{1,2})\s+([A-Za-z]{3})[A-Za-z]*\s+(\d{4}),?\s+(\d{1,2}):(\d{2})/)
  if (m) {
    const mon = MONTHS[m[2].toLowerCase()]
    if (mon === undefined) return null
    return new Date(Date.UTC(+m[3], mon, +m[1], +m[4] - 7, +m[5])).toISOString()
  }
  const d = new Date(/[zZ]|[+-]\d{2}:?\d{2}$/.test(t) ? t : t.replace(' ', 'T') + '+07:00')
  return isNaN(d.getTime()) ? null : d.toISOString()
}

function col(header: string[], ...names: string[]) {
  const h = header.map((x) => x.trim().toLowerCase())
  for (const n of names) {
    const i = h.indexOf(n.toLowerCase())
    if (i >= 0) return i
  }
  return -1
}

export function parseHevy(text: string): HevyWorkout[] {
  const rows = parseCSV(text.replace(/^﻿/, ''))
  if (rows.length < 2) throw new Error('File kosong')
  const h = rows[0]
  const iTitle = col(h, 'title', 'workout name')
  const iStart = col(h, 'start_time', 'date', 'start time')
  const iEnd = col(h, 'end_time', 'end time')
  const iEx = col(h, 'exercise_title', 'exercise name', 'exercise')
  const iSet = col(h, 'set_index', 'set order')
  const iType = col(h, 'set_type', 'set type')
  const iW = col(h, 'weight_kg', 'weight (kg)', 'weight')
  const iR = col(h, 'reps')
  if (iTitle < 0 || iStart < 0 || iEx < 0) {
    throw new Error('Format tidak dikenali. Pakai file dari Hevy: Settings > Export & Import Data > Export Workouts')
  }

  const map = new Map<string, HevyWorkout>()
  for (const r of rows.slice(1)) {
    const start = parseDate(r[iStart] ?? '')
    const exercise = (r[iEx] ?? '').trim()
    if (!start || !exercise) continue
    const title = (r[iTitle] ?? '').trim() || 'Workout'
    const rawType = (iType >= 0 ? r[iType] : 'normal').trim().toLowerCase()
    const setType = rawType.startsWith('warm') ? 'warmup' : rawType.startsWith('drop') ? 'drop' : rawType.startsWith('fail') ? 'failure' : 'normal'
    const key = `${start}|${title}`
    const w = map.get(key) ?? { key, title, start, end: iEnd >= 0 ? parseDate(r[iEnd] ?? '') : null, rows: [] }
    w.rows.push({
      title,
      start,
      end: w.end,
      exercise,
      setIndex: iSet >= 0 ? Number(r[iSet]) || 0 : w.rows.length,
      setType,
      weight: iW >= 0 ? Number((r[iW] ?? '').replace(',', '.')) || 0 : 0,
      reps: iR >= 0 ? Math.round(Number(r[iR]) || 0) : 0,
    })
    map.set(key, w)
  }
  return [...map.values()].sort((a, b) => a.start.localeCompare(b.start))
}

// Routine dari sesi terakhir tiap judul workout
export function routinesFrom(workouts: HevyWorkout[]) {
  const latest = new Map<string, HevyWorkout>()
  for (const w of workouts) latest.set(w.title, w)
  return [...latest.values()].map((w) => {
    const order: string[] = []
    for (const r of w.rows) if (!order.includes(r.exercise)) order.push(r.exercise)
    return {
      name: w.title,
      exercises: order.map((ex) => {
        const sets = w.rows.filter((r) => r.exercise === ex && r.setType !== 'warmup')
        const reps = sets.map((s) => s.reps).filter((n) => n > 0)
        const lo = reps.length ? Math.min(...reps) : 8
        const hi = reps.length ? Math.max(...reps) : 12
        return { name: ex, sets: Math.max(1, sets.length), reps: lo === hi ? String(lo) : `${lo}-${hi}` }
      }),
    }
  })
}

// Tebak kelompok otot dari nama latihan (untuk latihan baru)
export function guessGroup(name: string) {
  const n = name.toLowerCase()
  const has = (re: RegExp) => re.test(n)
  if (has(/\b(leg raise|crunch|plank|sit ?up|russian twist|ab wheel|abs?)\b/)) return 'Core'
  if (has(/\b(rear delt|shoulder|lateral raise|face pull|overhead|delts?|upright row|arnold)\b/)) return 'Bahu'
  if (has(/\b(leg|legs|squat|lunge|calf|hip|glutes?|rdl|romanian|hamstring|quads?|abduction|adduction)\b/)) return 'Kaki'
  if (has(/\b(triceps?|biceps?|curl|hammer|skull|pushdown|kickback|forearm)\b/)) return 'Lengan'
  if (has(/\b(row|pulldown|pull ?up|chin ?up|lat|deadlift|shrug|pullover)\b/)) return 'Punggung'
  if (has(/\b(chest|fly|flye|bench|dips?|pec|push ?up|crossovers?)\b/)) return 'Dada'
  return 'Lainnya'
}

// Teks routine yang di-copy dari Hevy, mis:
// "Incline Chest Press (Machine)\n3 sets · 8-12 reps\nRest 50s"
export type TextExercise = { name: string; sets: number; reps: string; rest: number }
export function parseRoutineText(text: string): TextExercise[] {
  const out: TextExercise[] = []
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) continue
    const sets = line.match(/^(\d+)\s*sets?\b(?:\s*[·•\-,|]\s*([\d]+(?:\s*[-–]\s*\d+)?)\s*reps?)?/i)
    const rest = line.match(/^rest\s*(?:(\d+)\s*m(?:in)?\s*)?(?:(\d+)\s*s(?:ec)?)?/i)
    const cur = out[out.length - 1]
    if (sets && cur) {
      cur.sets = Number(sets[1])
      if (sets[2]) cur.reps = sets[2].replace(/\s|–/g, (m) => (m === '–' ? '-' : ''))
    } else if (rest && cur && (rest[1] || rest[2])) {
      cur.rest = (Number(rest[1]) || 0) * 60 + (Number(rest[2]) || 0)
    } else if (!/^(rest|\d+\s*sets?)/i.test(line)) {
      out.push({ name: line.replace(/[.\s]+$/, ''), sets: 3, reps: '8-12', rest: 90 })
    }
  }
  return out
}
