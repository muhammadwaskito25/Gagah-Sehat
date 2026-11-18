import { createClient } from '@/lib/supabase/server'
import WorkoutLogger from '@/components/WorkoutLogger'
import type { RoutineWithExercises } from '@/lib/types'

export default async function WorkoutPage({
  searchParams,
}: {
  searchParams: Promise<{ routine?: string }>
}) {
  const { routine: routineId } = await searchParams
  let routine: RoutineWithExercises | null = null

  if (routineId) {
    const supabase = await createClient()
    const { data } = await supabase
      .from('routines')
      .select('id,name,routine_exercises(id,position,target_sets,target_reps,rest_seconds,target_distance_m,target_duration_s,exercise_id,exercises(name,kind))')
      .eq('id', routineId)
      .single()
    routine = data as unknown as RoutineWithExercises | null
  }

  return <WorkoutLogger routine={routine} />
}
