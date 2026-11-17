import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { origin } = new URL(request.url)
  const state = crypto.randomUUID()
  const url = new URL('https://www.strava.com/oauth/authorize')
  url.searchParams.set('client_id', process.env.STRAVA_CLIENT_ID!)
  url.searchParams.set('redirect_uri', `${origin}/api/strava/callback`)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('approval_prompt', 'auto')
  url.searchParams.set('scope', 'read,activity:read_all')
  url.searchParams.set('state', state)

  const res = NextResponse.redirect(url)
  res.cookies.set('strava_state', state, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 600 })
  return res
}
