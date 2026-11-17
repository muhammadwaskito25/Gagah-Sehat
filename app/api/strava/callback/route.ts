import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const saved = request.cookies.get('strava_state')?.value

  if (!code || !state || state !== saved) {
    return NextResponse.redirect(`${origin}/runs?strava=error`)
  }

  const tokenRes = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
    }),
  })
  if (!tokenRes.ok) return NextResponse.redirect(`${origin}/runs?strava=error`)
  const t = await tokenRes.json()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(`${origin}/login`)

  const { error } = await supabase.from('strava_tokens').upsert({
    user_id: user.id,
    athlete_id: t.athlete?.id ?? null,
    access_token: t.access_token,
    refresh_token: t.refresh_token,
    expires_at: t.expires_at,
  })
  const res = NextResponse.redirect(`${origin}/runs?strava=${error ? 'error' : 'connected'}`)
  res.cookies.delete('strava_state')
  return res
}
