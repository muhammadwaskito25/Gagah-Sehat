import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import RunRoutineEditor from '@/components/RunRoutineEditor'
import type { RunRoutine } from '@/lib/run'

export default async function EditRunRoutinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('run_routines').select('*').eq('id', id).single()
  if (!data) notFound()
  return <RunRoutineEditor initial={data as RunRoutine} />
}
