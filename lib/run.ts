export const RUN_TYPES = [
  { key: 'easy', label: 'Easy', template: 'Lari santai, masih bisa ngobrol\nJaga napas tetap nyaman' },
  { key: 'tempo', label: 'Tempo', template: 'Pemanasan 10 mnt easy\nTempo 20 mnt, berat tapi terkontrol\nPendinginan 10 mnt easy' },
  { key: 'interval', label: 'Interval', template: 'Pemanasan 10 mnt easy\n6 × 400 m cepat, istirahat jalan 90 dtk\nPendinginan 10 mnt easy' },
  { key: 'long', label: 'Long run', template: 'Lari panjang pace santai\nMinum tiap 30-40 mnt' },
  { key: 'recovery', label: 'Recovery', template: 'Lari sangat pelan 20-30 mnt' },
  { key: 'race', label: 'Race', template: 'Pemanasan 10-15 mnt\nRace / time trial\nPendinginan 10 mnt' },
] as const

export const runTypeLabel = (k?: string | null) => RUN_TYPES.find((t) => t.key === k)?.label ?? 'Lari'

export type RunRoutine = {
  id: string
  name: string
  run_type: string
  target_distance_m: number | null
  target_duration_s: number | null
  target_pace_s: number | null
  structure: string | null
}

// "5:30" -> 330 detik
export function parsePace(s: string) {
  const m = s.trim().match(/^(\d{1,2})[:.](\d{2})$/)
  return m ? Number(m[1]) * 60 + Number(m[2]) : null
}

export function paceText(sec?: number | null) {
  if (!sec) return ''
  return `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`
}

export function targetText(r: Pick<RunRoutine, 'target_distance_m' | 'target_duration_s' | 'target_pace_s'>) {
  const parts: string[] = []
  if (r.target_distance_m) parts.push(`${Math.round((r.target_distance_m / 1000) * 100) / 100} km`)
  if (r.target_duration_s) parts.push(`${Math.round(r.target_duration_s / 60)} mnt`)
  if (r.target_pace_s) parts.push(`pace ${paceText(r.target_pace_s)}/km`)
  return parts.join(', ')
}
