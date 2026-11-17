import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import RoutineEditor from '@/components/RoutineEditor'
import type { RoutineWithExercises } from '@/lib/types'

export default async function EditRoutinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('routines')
    .select('id,name,routine_exercises(id,position,target_sets,target_reps,rest_seconds,exercise_id,exercises(name,kind))')
    .eq('id', id)
    .single()
  if (!data) notFound()
  return <RoutineEditor initial={data as unknown as RoutineWithExercises} />
}
