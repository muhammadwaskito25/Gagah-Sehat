import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const RUN_TYPES = ['Run', 'TrailRun', 'VirtualRun']

type StravaActivity = {
  id: number
  name: string
  sport_type: string
  type: string
  start_date: string
  distance: number
  moving_time: number
  elapsed_time: number
  total_elevation_gain: number
  average_heartrate?: number
}

export async function POST(request: Request) {
  const full = new URL(request.url).searchParams.get('full') === '1'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Belum login' }, { status: 401 })

  const { data: tok } = await supabase.from('strava_tokens').select('*').eq('user_id', user.id).single()
  if (!tok) return NextResponse.json({ error: 'Strava belum terhubung' }, { status: 400 })

  // 1. Refresh token kalau hampir kedaluwarsa
  let accessToken: string = tok.access_token
  if (tok.expires_at < Date.now() / 1000 + 120) {
    const r = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token: tok.refresh_token,
      }),
    })
    if (!r.ok) return NextResponse.json({ error: 'Gagal refresh token Strava, hubungkan ulang' }, { status: 400 })
    const t = await r.json()
    accessToken = t.access_token
    await supabase
      .from('strava_tokens')
      .update({ access_token: t.access_token, refresh_token: t.refresh_token, expires_at: t.expires_at })
      .eq('user_id', user.id)
  }

  // 2. Ambil aktivitas sejak lari Strava terakhir yang sudah tersimpan
  let after = 0
  if (!full) {
    const { data: last } = await supabase
      .from('runs')
      .select('start_date')
      .eq('source', 'strava')
      .order('start_date', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (last) after = Math.floor(new Date(last.start_date).getTime() / 1000)
  }

  const all: StravaActivity[] = []
  for (let page = 1; page <= 10; page++) {
    const r = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?after=${after}&per_page=100&page=${page}`,
      { headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store' }
    )
    if (!r.ok) return NextResponse.json({ error: `Strava error ${r.status}` }, { status: 502 })
    const batch: StravaActivity[] = await r.json()
    all.push(...batch)
    if (batch.length < 100) break
  }

  // 3. Simpan yang jenisnya lari
  const rows = all
    .filter((a) => RUN_TYPES.includes(a.sport_type ?? a.type))
    .map((a) => ({
      user_id: user.id,
      strava_id: a.id,
      source: 'strava',
      name: a.name,
      sport_type: a.sport_type ?? a.type,
      start_date: a.start_date,
      distance_m: a.distance,
      moving_time_s: a.moving_time,
      elapsed_time_s: a.elapsed_time,
      elevation_gain_m: a.total_elevation_gain,
      avg_hr: a.average_heartrate ?? null,
    }))

  if (rows.length) {
    const { error } = await supabase.from('runs').upsert(rows, { onConflict: 'strava_id' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ imported: rows.length })
}
