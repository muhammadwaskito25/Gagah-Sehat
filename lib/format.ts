export function epley(weight: number, reps: number) {
  if (!weight || !reps) return 0
  return reps === 1 ? weight : weight * (1 + reps / 30)
}

export function fmtDuration(totalSec: number) {
  const s = Math.max(0, Math.round(totalSec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}j ${m}m`
  if (m > 0) return `${m}m ${sec.toString().padStart(2, '0')}d`
  return `${sec}d`
}

export function fmtClock(totalSec: number) {
  const s = Math.max(0, Math.round(totalSec))
  const m = Math.floor(s / 60)
  return `${m}:${(s % 60).toString().padStart(2, '0')}`
}

export function fmtPace(movingSec: number, distanceM: number) {
  if (!distanceM) return '-'
  const secPerKm = movingSec / (distanceM / 1000)
  return `${fmtClock(secPerKm)} /km`
}

export function fmtKm(distanceM: number) {
  return `${(distanceM / 1000).toFixed(2)} km`
}

export function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', {
    weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Jakarta',
  })
}

export function fmtNum(n: number) {
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(n)
}

// Senin 00:00 WIB minggu ini, dalam ISO UTC
export function startOfWeekISO(d = new Date()) {
  const wib = new Date(d.getTime() + 7 * 3600 * 1000)
  const day = (wib.getUTCDay() + 6) % 7
  wib.setUTCDate(wib.getUTCDate() - day)
  wib.setUTCHours(0, 0, 0, 0)
  return new Date(wib.getTime() - 7 * 3600 * 1000).toISOString()
}
