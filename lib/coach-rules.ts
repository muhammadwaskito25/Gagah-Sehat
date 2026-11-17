// Coach otomatis berbasis aturan latihan, tanpa AI dan tanpa biaya
import type { SupabaseClient } from '@supabase/supabase-js'
import { epley, fmtClock } from './format'

export type Level = 'good' | 'warn' | 'action' | 'info'
export type Note = { level: Level; text: string }
export type NextTarget = {
  exerciseId: string
  name: string
  lastDate: string
  last: string
  next: string
  status: 'up' | 'stuck' | 'down' | 'new' | 'steady'
  note: string
}
export type ProposedRoutine = {
  name: string
  exercises: { name: string; muscle_group: string; sets: number; reps: string; rest: number }[]
}
export type Zone = { label: string; pace: string; desc: string }
export type DayPlan = { day: string; items: string[] }
export type CoachReport = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  profile: any
  focus: Note[]
  gym: Note[]
  targets: NextTarget[]
  run: Note[]
  zones: Zone[] | null
  week: DayPlan[]
  plan: ProposedRoutine[]
}

const DAY = 86400e3
const WEEK = 7 * DAY
const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']
const MAIN_GROUPS = ['Dada', 'Punggung', 'Kaki', 'Bahu', 'Lengan']
const COMPOUND = [
  'Bench Press', 'Incline Bench Press', 'Chest Press', 'Squat', 'Deadlift', 'Romanian Deadlift', 'Overhead Press',
  'Shoulder Press', 'Barbell Row', 'Pull Up', 'Lat Pulldown', 'Leg Press', 'Hip Thrust', 'Dips', 'Seated Cable Row',
]

type GoalKey = 'hybrid' | 'strength' | 'hyper' | 'run' | 'fat'

function goalKey(g?: string | null): GoalKey {
  if (!g || g.startsWith('Hybrid')) return 'hybrid'
  if (g.includes('kekuatan')) return 'strength'
  if (g.includes('otot')) return 'hyper'
  if (g.includes('lari')) return 'run'
  return 'fat'
}
const levelIdx = (s?: string | null) => (s?.startsWith('Lanjut') ? 2 : s?.startsWith('Menengah') ? 1 : 0)

function repRange(s?: string | null): [number, number] | null {
  if (!s) return null
  const m = s.match(/(\d+)\s*[-–]\s*(\d+)/)
  if (m) return [Number(m[1]), Number(m[2])]
  const n = s.match(/\d+/)
  return n ? [Number(n[0]), Number(n[0])] : null
}

const SCHEME: Record<GoalKey, { comp: [string, number, number]; acc: [string, number, number] }> = {
  // [reps, sets, rest]
  strength: { comp: ['3-5', 4, 180], acc: ['8-12', 3, 90] },
  hyper: { comp: ['6-10', 3, 120], acc: ['10-15', 3, 75] },
  hybrid: { comp: ['5-8', 3, 150], acc: ['8-12', 3, 75] },
  run: { comp: ['5-8', 3, 120], acc: ['10-12', 2, 60] },
  fat: { comp: ['8-12', 3, 90], acc: ['12-15', 3, 60] },
}

function defaultRange(name: string, goal: GoalKey): [number, number] {
  const s = COMPOUND.includes(name) ? SCHEME[goal].comp[0] : SCHEME[goal].acc[0]
  return repRange(s)!
}

function increment(name: string, group?: string | null, equipment?: string | null) {
  if (equipment === 'Dumbbell') return 2
  if (name.includes('Deadlift') || (group === 'Kaki' && equipment !== 'Machine')) return 5
  return 2.5
}

function fmtTime(sec: number) {
  const s = Math.round(sec)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = (s % 60).toString().padStart(2, '0')
  return h ? `${h}:${m.toString().padStart(2, '0')}:${ss}` : `${m}:${ss}`
}

function fmtD(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', timeZone: 'Asia/Jakarta' })
}

const kg = (n: number) => `${Math.round(n * 10) / 10} kg`

// ===================== TEMPLATE PROGRAM =====================
type T = [name: string, group: string]
const TPL: Record<string, T[]> = {
  'Full Body A': [['Squat', 'Kaki'], ['Bench Press', 'Dada'], ['Lat Pulldown', 'Punggung'], ['Lateral Raise', 'Bahu'], ['Plank', 'Core']],
  'Full Body B': [['Deadlift', 'Punggung'], ['Overhead Press', 'Bahu'], ['Seated Cable Row', 'Punggung'], ['Leg Curl', 'Kaki'], ['Bicep Curl', 'Lengan']],
  'Full Body C': [['Leg Press', 'Kaki'], ['Incline Bench Press', 'Dada'], ['Pull Up', 'Punggung'], ['Face Pull', 'Bahu'], ['Tricep Pushdown', 'Lengan']],
  'Upper A': [['Bench Press', 'Dada'], ['Barbell Row', 'Punggung'], ['Overhead Press', 'Bahu'], ['Lat Pulldown', 'Punggung'], ['Bicep Curl', 'Lengan'], ['Tricep Pushdown', 'Lengan']],
  'Upper B': [['Incline Bench Press', 'Dada'], ['Pull Up', 'Punggung'], ['Shoulder Press', 'Bahu'], ['Seated Cable Row', 'Punggung'], ['Lateral Raise', 'Bahu'], ['Hammer Curl', 'Lengan']],
  'Lower A': [['Squat', 'Kaki'], ['Romanian Deadlift', 'Kaki'], ['Leg Extension', 'Kaki'], ['Calf Raise', 'Kaki'], ['Plank', 'Core']],
  'Lower B': [['Deadlift', 'Punggung'], ['Leg Press', 'Kaki'], ['Leg Curl', 'Kaki'], ['Hip Thrust', 'Kaki'], ['Crunch', 'Core']],
  Push: [['Bench Press', 'Dada'], ['Shoulder Press', 'Bahu'], ['Incline Bench Press', 'Dada'], ['Lateral Raise', 'Bahu'], ['Tricep Pushdown', 'Lengan']],
  Pull: [['Barbell Row', 'Punggung'], ['Lat Pulldown', 'Punggung'], ['Seated Cable Row', 'Punggung'], ['Face Pull', 'Bahu'], ['Bicep Curl', 'Lengan']],
  Legs: [['Squat', 'Kaki'], ['Romanian Deadlift', 'Kaki'], ['Leg Press', 'Kaki'], ['Leg Curl', 'Kaki'], ['Calf Raise', 'Kaki']],
}

const HOME: Record<string, string> = {
  'Lat Pulldown': 'Pull Up', 'Seated Cable Row': 'Dumbbell Row', 'Leg Press': 'Goblet Squat',
  'Leg Extension': 'Bulgarian Split Squat', 'Leg Curl': 'Single Leg RDL', 'Tricep Pushdown': 'Skull Crusher',
  'Face Pull': 'Rear Delt Fly', 'Chest Press': 'Bench Press',
}
const BODYWEIGHT: Record<string, string> = {
  Squat: 'Bodyweight Squat', 'Bench Press': 'Push Up', 'Incline Bench Press': 'Decline Push Up', 'Chest Press': 'Push Up',
  'Barbell Row': 'Inverted Row', 'Seated Cable Row': 'Inverted Row', 'Lat Pulldown': 'Pull Up', 'Overhead Press': 'Pike Push Up',
  'Shoulder Press': 'Pike Push Up', Deadlift: 'Single Leg RDL', 'Romanian Deadlift': 'Single Leg RDL', 'Leg Press': 'Bulgarian Split Squat',
  'Leg Extension': 'Jump Squat', 'Leg Curl': 'Glute Bridge', 'Hip Thrust': 'Glute Bridge', 'Lateral Raise': 'Pike Push Up',
  'Face Pull': 'Inverted Row', 'Bicep Curl': 'Chin Up', 'Hammer Curl': 'Chin Up', 'Tricep Pushdown': 'Dips', 'Skull Crusher': 'Dips',
  'Calf Raise': 'Calf Raise',
}

function splitFor(days: number, goal: GoalKey, lvl: number): string[] {
  if (days <= 0) return []
  if (days === 1) return ['Full Body A']
  if (days === 2) return ['Full Body A', 'Full Body B']
  if (days === 3) return (goal === 'hyper' || goal === 'strength') && lvl >= 1 ? ['Push', 'Pull', 'Legs'] : ['Full Body A', 'Full Body B', 'Full Body C']
  if (days === 4) return ['Upper A', 'Lower A', 'Upper B', 'Lower B']
  return ['Upper A', 'Lower A', 'Push', 'Pull', 'Legs']
}

function buildPlan(days: number, goal: GoalKey, lvl: number, equipment?: string | null): ProposedRoutine[] {
  const sub = equipment?.startsWith('Bodyweight') ? BODYWEIGHT : equipment?.startsWith('Home') ? HOME : {}
  return splitFor(days, goal, lvl).map((key) => {
    let items = TPL[key]
    // Hybrid / lari: sesi kaki dibuat lebih ringkas karena kaki sudah dipakai lari
    if ((goal === 'hybrid' || goal === 'run') && /Lower|Legs/.test(key)) items = items.slice(0, 4)
    if (goal === 'run') items = items.slice(0, 4)
    const seen = new Set<string>()
    const exercises = items
      .map(([name, group]) => {
        const n = sub[name] ?? name
        const comp = COMPOUND.includes(name)
        const [reps, sets0, rest] = comp ? SCHEME[goal].comp : SCHEME[goal].acc
        let sets = sets0
        if (lvl === 0) sets = Math.min(sets, 3)
        if (lvl === 2 && comp && (goal === 'strength' || goal === 'hyper')) sets += 1
        return { name: n, muscle_group: group, sets, reps: name === 'Plank' ? '30-60 dtk' : reps, rest }
      })
      .filter((e) => (seen.has(e.name) ? false : (seen.add(e.name), true)))
    return { name: `${key} (Coach)`, exercises }
  })
}

// ===================== JADWAL MINGGUAN =====================
function buildWeek(gymDays: number, runDays: number, plan: ProposedRoutine[], goal: GoalKey): DayPlan[] {
  const slots: string[][] = DAYS.map(() => [])
  const runD = Math.max(0, Math.min(6, runDays))
  const runOrder = [6, 2, 4, 1, 5, 3]
  const kinds =
    runD === 1
      ? ['Lari santai (boleh agak jauh)']
      : goal === 'strength'
        ? ['Lari santai / long run ringan', 'Lari santai', 'Lari santai', 'Lari santai', 'Lari santai', 'Lari santai']
        : ['Long run (pace easy, terjauh minggu ini)', 'Tempo / interval', 'Easy run', 'Easy run', 'Easy run', 'Easy run']
  const runDays_: number[] = []
  for (let i = 0; i < runD; i++) {
    slots[runOrder[i]].push(kinds[i])
    runDays_.push(runOrder[i])
  }
  const longDay = runD ? runOrder[0] : -1
  const qualityDay = runD >= 2 && goal !== 'strength' ? runOrder[1] : -1

  const gymOrder = [0, 3, 1, 4, 5, 2, 6]
  const free = gymOrder.filter((d) => !slots[d].length)
  const chosen = [...free, ...gymOrder.filter((d) => !free.includes(d))].slice(0, Math.min(plan.length, 7)).sort((a, b) => a - b)

  // Hindari sesi kaki berat sehari sebelum long run / tempo
  const names = plan.map((p) => p.name)
  const bad = (d: number) => d + 1 === longDay || d + 1 === qualityDay || d === longDay || d === qualityDay
  const isLeg = (n: string) => /Lower|Legs/.test(n)
  for (let i = 0; i < chosen.length; i++) {
    if (isLeg(names[i]) && bad(chosen[i])) {
      const j = chosen.findIndex((d, k) => !isLeg(names[k]) && !bad(d))
      if (j >= 0) [names[i], names[j]] = [names[j], names[i]]
    }
  }
  chosen.forEach((d, i) => {
    const doubled = slots[d].length > 0
    slots[d].unshift(`Gym: ${names[i].replace(' (Coach)', '')}${doubled ? ' (pisah min. 6 jam dari lari)' : ''}`)
  })
  return DAYS.map((day, i) => ({ day, items: slots[i].length ? slots[i] : ['Istirahat / jalan santai / mobility'] }))
}

// ===================== TARGET LARI =====================
function parseTarget(s?: string | null): { dist: number; time: number | null } | null {
  if (!s) return null
  const t = s.toLowerCase()
  let dist = 0
  if (/half|hm\b|21\s*k|21[.,]1/.test(t)) dist = 21097.5
  else if (/full|marathon|maraton|fm\b|42\s*k/.test(t)) dist = 42195
  else {
    const m = t.match(/(\d+(?:[.,]\d+)?)\s*(k\b|km)/)
    if (m) dist = Number(m[1].replace(',', '.')) * 1000
  }
  if (!dist) return null
  let time: number | null = null
  const hms = t.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/)
  if (hms) {
    time = hms[3] ? Number(hms[1]) * 3600 + Number(hms[2]) * 60 + Number(hms[3]) : Number(hms[1]) * 60 + Number(hms[2])
  } else {
    const h = t.match(/(\d+)\s*(jam|j)\b/)
    const mn = t.match(/(\d+)\s*(menit|mnt|min|m)\b/)
    if (h || mn) time = (h ? Number(h[1]) * 3600 : 0) + (mn ? Number(mn[1]) * 60 : 0)
  }
  return { dist, time }
}

// ===================== LAPORAN =====================
export async function buildCoachReport(supabase: SupabaseClient): Promise<CoachReport> {
  const since8 = new Date(Date.now() - 8 * WEEK).toISOString()
  const [{ data: profile }, { data: routines }, { data: setsRaw }, { data: workouts }, { data: runsRaw }] = await Promise.all([
    supabase.from('coach_profile').select('*').maybeSingle(),
    supabase.from('routines').select('routine_exercises(exercise_id,target_reps)'),
    supabase
      .from('workout_sets')
      .select('weight,reps,set_type,exercise_id,workout_id,exercises(name,muscle_group,equipment),workouts!inner(started_at)')
      .gte('workouts.started_at', since8),
    supabase.from('workouts').select('id,started_at').gte('started_at', since8),
    supabase.from('runs').select('*').order('start_date', { ascending: false }).limit(300),
  ])

  const p = profile ?? {}
  const goal = goalKey(p.goal)
  const lvl = levelIdx(p.gym_experience)
  const gymDays = Number(p.gym_days ?? 3)
  const runDays = Number(p.run_days ?? 2)
  const now = Date.now()

  const gym: Note[] = []
  const run: Note[] = []

  // ---------- GYM: konsistensi ----------
  const w4 = (workouts ?? []).filter((w) => new Date(w.started_at).getTime() >= now - 4 * WEEK)
  const perWeek = w4.length / 4
  if (!workouts?.length) {
    gym.push({ level: 'info', text: 'Belum ada latihan gym 8 minggu terakhir. Mulai dari program yang disarankan di bawah, fokus teknik dulu 2 minggu pertama' })
  } else if (gymDays && perWeek < gymDays * 0.75) {
    gym.push({ level: 'action', text: `Konsistensi: rata-rata ${perWeek.toFixed(1)} sesi/minggu (4 minggu terakhir), targetmu ${gymDays}. Konsistensi lebih penting dari program sempurna. Kalau sulit, turunkan target jadi ${Math.max(2, Math.round(perWeek + 0.5))} sesi tapi rutin` })
  } else {
    gym.push({ level: 'good', text: `Konsistensi bagus: rata-rata ${perWeek.toFixed(1)} sesi/minggu dari target ${gymDays}` })
  }

  // ---------- GYM: per latihan ----------
  const targetMap = new Map<string, string>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const r of (routines ?? []) as any[]) for (const re of r.routine_exercises ?? []) if (re.target_reps) targetMap.set(re.exercise_id, re.target_reps)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const work = ((setsRaw ?? []) as any[]).filter((s) => s.set_type !== 'warmup')
  type Sess = { date: string; sets: { w: number; r: number }[] }
  const byEx = new Map<string, { name: string; group: string | null; equip: string | null; sessions: Map<string, Sess> }>()
  for (const s of work) {
    const e = byEx.get(s.exercise_id) ?? { name: s.exercises?.name ?? '?', group: s.exercises?.muscle_group ?? null, equip: s.exercises?.equipment ?? null, sessions: new Map() }
    const ss = e.sessions.get(s.workout_id) ?? { date: s.workouts.started_at, sets: [] }
    ss.sets.push({ w: Number(s.weight), r: Number(s.reps) })
    e.sessions.set(s.workout_id, ss)
    byEx.set(s.exercise_id, e)
  }

  const targets: NextTarget[] = []
  let stuckCount = 0
  let downCount = 0
  for (const [id, e] of byEx) {
    const ss = [...e.sessions.values()].sort((a, b) => a.date.localeCompare(b.date))
    const e1 = (x: Sess) => Math.max(...x.sets.map((s) => epley(s.w, s.r)))
    const last = ss[ss.length - 1]
    const top = last.sets.reduce((b, s) => (epley(s.w, s.r) > epley(b.w, b.r) || (s.w > b.w) ? s : b), last.sets[0])
    const [lo, hi] = repRange(targetMap.get(id)) ?? defaultRange(e.name, goal)
    const atTop = last.sets.filter((s) => s.w === top.w)
    const minReps = Math.min(...atTop.map((s) => s.r))
    const inc = increment(e.name, e.group, e.equip)

    let next: string
    if (top.w === 0) {
      next = top.r >= hi ? `Tambah beban ${inc} kg (atau tempo turun 3 detik), ${lo} reps` : `Bodyweight × ${top.r + 1}`
    } else if (minReps >= hi) {
      next = `${kg(top.w + inc)} × ${lo} (naik beban)`
    } else {
      next = `${kg(top.w)} × ${Math.min(Math.max(top.r + 1, lo), hi)} (tambah reps)`
    }

    let status: NextTarget['status'] = 'new'
    let note = `Rentang reps ${lo}-${hi}. Kalau semua set sudah ${hi} reps, naikkan beban`
    if (ss.length >= 2) {
      const prevMax = Math.max(...ss.slice(0, -1).map(e1))
      const lastE = e1(last)
      if (lastE > prevMax * 1.005) {
        status = 'up'
        note = `Naik ${(((lastE - prevMax) / prevMax) * 100).toFixed(1)}% dari rekor sebelumnya, pertahankan`
      } else if (lastE < prevMax * 0.95) {
        status = 'down'
        downCount++
        note = 'Turun lebih dari 5%. Cek tidur, makan, dan capek dari lari. Kalau berulang, ambil minggu deload'
      } else status = 'steady'
    }
    if (ss.length >= 4) {
      const before = Math.max(...ss.slice(0, -3).map(e1))
      const recent = Math.max(...ss.slice(-3).map(e1))
      if (recent <= before * 1.005) {
        status = 'stuck'
        stuckCount++
        note = 'Stagnan 3 sesi. Opsi: turunkan beban 10% lalu bangun lagi, ganti rentang reps (mis. ke 8-10), atau ganti variasi selama 4-6 minggu'
      }
    }

    targets.push({
      exerciseId: id,
      name: e.name,
      lastDate: last.date,
      last: last.sets.map((s) => `${Math.round(s.w * 10) / 10}×${s.r}`).join(', '),
      next,
      status,
      note,
    })
  }
  targets.sort((a, b) => b.lastDate.localeCompare(a.lastDate))

  if (stuckCount) gym.push({ level: 'warn', text: `${stuckCount} latihan stagnan. Lihat catatan di tabel target untuk cara memecahnya` })
  const ups = targets.filter((t) => t.status === 'up').length
  if (ups) gym.push({ level: 'good', text: `${ups} latihan cetak rekor di sesi terakhirnya 🔥` })

  // ---------- GYM: volume per otot ----------
  if (work.length) {
    const vol = new Map<string, number>()
    for (const s of work) {
      if (new Date(s.workouts.started_at).getTime() < now - 4 * WEEK) continue
      const g = s.exercises?.muscle_group ?? 'Lainnya'
      vol.set(g, (vol.get(g) ?? 0) + 1)
    }
    const [lo, hi] = [[8, 12], [10, 16], [12, 20]][lvl]
    const low: string[] = []
    const high: string[] = []
    const ok: string[] = []
    for (const g of MAIN_GROUPS) {
      const v = (vol.get(g) ?? 0) / 4
      let gLo = lo
      if (g === 'Kaki' && (goal === 'hybrid' || goal === 'run')) gLo = Math.max(4, lo - 4)
      if (g === 'Lengan') gLo = Math.max(4, lo - 4)
      if (v < gLo) low.push(`${g} ${v.toFixed(1)} (min ${gLo})`)
      else if (v > hi + 2) high.push(`${g} ${v.toFixed(1)} (maks ${hi})`)
      else ok.push(g)
    }
    if (low.length) gym.push({ level: 'action', text: `Volume kurang (set kerja/minggu): ${low.join(', ')}. Tambah 2-4 set per minggu di otot tersebut` })
    if (high.length) gym.push({ level: 'warn', text: `Volume terlalu tinggi: ${high.join(', ')}. Recovery bisa keteteran, kurangi beberapa set` })
    if (ok.length) gym.push({ level: 'good', text: `Volume pas: ${ok.join(', ')}` })
  }

  // ---------- GYM: deload ----------
  let streak = 0
  for (let i = 0; i < 8; i++) {
    const has = (workouts ?? []).some((w) => {
      const t = new Date(w.started_at).getTime()
      return t >= now - (i + 1) * WEEK && t < now - i * WEEK
    })
    if (has) streak++
    else break
  }
  if (streak >= 6 && (stuckCount >= 2 || downCount >= 1)) {
    gym.push({ level: 'action', text: `Sudah ${streak} minggu latihan beruntun dan ada latihan stagnan/turun. Ambil 1 minggu deload: beban -10%, jumlah set -40%, lari tetap easy saja` })
  } else if (streak >= 8) {
    gym.push({ level: 'info', text: '8 minggu beruntun, rencanakan minggu deload dalam 1-2 minggu ke depan' })
  }

  // ---------- LARI ----------
  const runs = runsRaw ?? []
  const km = (from: number, to: number) =>
    runs
      .filter((r) => {
        const t = new Date(r.start_date).getTime()
        return t >= from && t < to
      })
      .reduce((s, r) => s + Number(r.distance_m) / 1000, 0)
  const wk = [0, 1, 2, 3].map((i) => km(now - (i + 1) * WEEK, now - i * WEEK))
  const recent = runs.filter((r) => new Date(r.start_date).getTime() >= now - 4 * WEEK)
  let zones: Zone[] | null = null

  if (!runs.length) {
    run.push({ level: 'info', text: 'Belum ada data lari. Hubungkan Strava di tab Lari atau catat manual' })
  } else {
    const prevAvg = (wk[1] + wk[2] + wk[3]) / 3
    if (prevAvg > 0 && wk[0] > prevAvg * 1.1 + 1) {
      run.push({ level: 'warn', text: `7 hari terakhir ${wk[0].toFixed(1)} km, naik ${(((wk[0] - prevAvg) / prevAvg) * 100).toFixed(0)}% dari rata-rata ${prevAvg.toFixed(1)} km. Naikkan maksimal ±10% per minggu supaya tidak cedera` })
    } else if (prevAvg > 5 && wk[0] < prevAvg * 0.6) {
      run.push({ level: 'info', text: `7 hari terakhir cuma ${wk[0].toFixed(1)} km (biasanya ${prevAvg.toFixed(1)}). Kalau bukan minggu recovery, kembali ke ±${prevAvg.toFixed(0)} km dulu sebelum naik` })
    } else {
      const nextKm = Math.max(wk[0], prevAvg) * 1.1
      run.push({ level: 'good', text: `Volume stabil: ${wk[0].toFixed(1)} km minggu ini. Target minggu depan maksimal ±${nextKm.toFixed(1)} km` })
    }

    const rpw = recent.length / 4
    if (runDays && rpw < runDays * 0.75) {
      run.push({ level: 'action', text: `Rata-rata ${rpw.toFixed(1)} lari/minggu, targetmu ${runDays}. Lari pendek 20-30 menit easy juga dihitung` })
    }

    if (recent.length) {
      const longest = recent.reduce((m, r) => (Number(r.distance_m) > Number(m.distance_m) ? r : m), recent[0])
      const avgWeek = (wk[0] + wk[1] + wk[2] + wk[3]) / 4
      const share = Number(longest.distance_m) / 1000 / Math.max(avgWeek, 0.1)
      if (avgWeek > 8 && share > 0.5) {
        run.push({ level: 'warn', text: `Long run ${(Number(longest.distance_m) / 1000).toFixed(1)} km = ${(share * 100).toFixed(0)}% volume mingguan. Idealnya 25-35%, tambah lari easy di hari lain` })
      }
    }

    // Easy vs keras
    const age = Number(p.age) || 25
    const maxHr = 220 - age
    const withHr = recent.filter((r) => r.avg_hr)
    let hard = 0
    let total = 0
    if (withHr.length >= 3) {
      total = withHr.length
      hard = withHr.filter((r) => Number(r.avg_hr) > maxHr * 0.82).length
    } else {
      const paced = recent.filter((r) => Number(r.distance_m) >= 1500)
      const paces = paced.map((r) => r.moving_time_s / (Number(r.distance_m) / 1000)).sort((a, b) => a - b)
      if (paces.length >= 3) {
        const median = paces[Math.floor(paces.length / 2)]
        total = paces.length
        hard = paces.filter((x) => x < median * 0.93).length
      }
    }
    if (total >= 3) {
      const pct = (hard / total) * 100
      if (pct > 30) run.push({ level: 'action', text: `${pct.toFixed(0)}% larimu tergolong keras. Pakai aturan 80/20: kebanyakan lari harus pelan (masih bisa ngobrol). Lari pelan justru bikin cepat dalam jangka panjang` })
      else run.push({ level: 'good', text: `Rasio easy/keras sehat (${(100 - pct).toFixed(0)}/${pct.toFixed(0)})` })
    }

    // Tren pace
    const avgPace = (from: number, to: number) => {
      const xs = runs.filter((r) => {
        const t = new Date(r.start_date).getTime()
        return t >= from && t < to && Number(r.distance_m) >= 3000
      })
      if (xs.length < 2) return 0
      return xs.reduce((s, r) => s + r.moving_time_s, 0) / xs.reduce((s, r) => s + Number(r.distance_m) / 1000, 0)
    }
    const pNow = avgPace(now - 4 * WEEK, now)
    const pPrev = avgPace(now - 8 * WEEK, now - 4 * WEEK)
    if (pNow && pPrev) {
      const diff = ((pPrev - pNow) / pPrev) * 100
      if (diff >= 2) run.push({ level: 'good', text: `Pace rata-rata membaik ${diff.toFixed(1)}%: ${fmtClock(pPrev)} → ${fmtClock(pNow)} /km` })
      else if (diff <= -2) run.push({ level: 'info', text: `Pace rata-rata melambat ${Math.abs(diff).toFixed(1)}% (${fmtClock(pPrev)} → ${fmtClock(pNow)} /km). Wajar kalau sedang naik volume atau banyak easy run` })
    }

    // Prediksi & zona dari usaha terbaik 8 minggu
    const best5k = runs
      .filter((r) => new Date(r.start_date).getTime() >= now - 8 * WEEK && Number(r.distance_m) >= 3000)
      .map((r) => r.moving_time_s * Math.pow(5000 / Number(r.distance_m), 1.06))
      .reduce((m, x) => Math.min(m, x), Infinity)
    if (isFinite(best5k)) {
      const p5 = best5k / 5
      zones = [
        { label: 'Easy / long run', pace: `${fmtClock(p5 + 60)} - ${fmtClock(p5 + 90)}`, desc: 'Mayoritas lari, napas santai bisa ngobrol' },
        { label: 'Tempo', pace: `${fmtClock(p5 + 20)} - ${fmtClock(p5 + 30)}`, desc: '20-30 menit, berat tapi terkontrol' },
        { label: 'Interval', pace: `${fmtClock(p5 - 5)} - ${fmtClock(p5)}`, desc: 'mis. 5 × 800 m, istirahat jalan 2 menit' },
      ]
      run.push({ level: 'info', text: `Perkiraan kemampuan 5K saat ini: ${fmtTime(best5k)} (dari lari terbaikmu 8 minggu terakhir)` })

      const tgt = parseTarget(p.run_target)
      if (tgt) {
        const pred = best5k * Math.pow(tgt.dist / 5000, 1.06)
        const label = tgt.dist >= 42000 ? 'marathon' : tgt.dist >= 21000 ? 'half marathon' : `${(tgt.dist / 1000).toFixed(tgt.dist % 1000 ? 1 : 0)}K`
        if (tgt.time) {
          const gap = ((pred - tgt.time) / tgt.time) * 100
          if (gap <= 0) run.push({ level: 'good', text: `Target ${label} ${fmtTime(tgt.time)}: prediksi sekarang ${fmtTime(pred)}, sudah sesuai jalur 🎯 Jaga volume dan tambah 1 sesi tempo per minggu` })
          else run.push({ level: gap > 8 ? 'warn' : 'action', text: `Target ${label} ${fmtTime(tgt.time)}: prediksi sekarang ${fmtTime(pred)}, perlu ${gap.toFixed(1)}% lebih cepat (pace target ${fmtClock(tgt.time / (tgt.dist / 1000))} /km). ${gap > 8 ? 'Butuh beberapa bulan: bangun volume easy dulu, baru tambah tempo/interval' : 'Realistis dengan 1 tempo + 1 interval per minggu'}` })
        } else {
          run.push({ level: 'info', text: `Prediksi ${label} saat ini: ${fmtTime(pred)}` })
        }
      }
    }
  }

  // ---------- PROGRAM & JADWAL ----------
  const plan = buildPlan(gymDays, goal, lvl, p.equipment)
  const week = buildWeek(gymDays, runDays, plan, goal)

  if (p.injuries) {
    gym.unshift({ level: 'warn', text: `Kamu mencatat keluhan: "${p.injuries}". Hindari gerakan yang memicu nyeri, kurangi beban di area itu, dan cek ke fisioterapis/dokter kalau nyerinya tajam atau tidak membaik` })
  }

  const all = [...gym, ...run]
  const focus = [...all.filter((n) => n.level === 'action'), ...all.filter((n) => n.level === 'warn')].slice(0, 3)

  return { profile, focus, gym, targets: targets.slice(0, 20), run, zones, week, plan }
}

export { fmtD }
