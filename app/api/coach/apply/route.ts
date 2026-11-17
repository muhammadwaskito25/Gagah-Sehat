import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type ProposedRoutine = {
  name: string
  exercises: { name: string; muscle_group?: string; sets: number; reps: string; rest: number }[]
}

// Simpan routine usulan coach jadi routine baru
export async function POST(req: Request) {
  const { routines } = (await req.json()) as { routines: ProposedRoutine[] }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Belum login' }, { status: 401 })
  if (!Array.isArray(routines) || !routines.length) return NextResponse.json({ error: 'Tidak ada routine' }, { status: 400 })

  const { data: libData } = await supabase.from('exercises').select('id,name')
  const lib = libData ?? []

  async function exerciseId(name: string, group?: string) {
    const found = lib.find((e) => e.name.toLowerCase() === name.trim().toLowerCase())
    if (found) return found.id
    const { data } = await supabase
      .from('exercises')
      .insert({ name: name.trim(), muscle_group: group ?? 'Lainnya' })
      .select('id,name')
      .single()
    if (!data) throw new Error(`Gagal membuat latihan ${name}`)
    lib.push(data)
    return data.id
  }

  try {
    for (const r of routines) {
      const { data: routine, error } = await supabase.from('routines').insert({ name: r.name }).select('id').single()
      if (error || !routine) throw new Error(error?.message ?? 'Gagal membuat routine')
      const rows = []
      for (const [position, ex] of r.exercises.entries()) {
        rows.push({
          routine_id: routine.id,
          exercise_id: await exerciseId(ex.name, ex.muscle_group),
          position,
          target_sets: Number(ex.sets) || 3,
          target_reps: String(ex.reps ?? '8-12'),
          rest_seconds: Number(ex.rest) || 90,
        })
      }
      if (rows.length) {
        const { error: e2 } = await supabase.from('routine_exercises').insert(rows)
        if (e2) throw new Error(e2.message)
      }
    }
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
  return NextResponse.json({ created: routines.length })
}
