export type Exercise = {
  id: string
  name: string
  muscle_group: string | null
  equipment: string | null
  user_id: string | null
}

export type SetType = 'normal' | 'warmup' | 'drop' | 'failure'

export type DraftSet = { weight: string; reps: string; done: boolean; type: SetType }

export type PrevSet = { weight: number; reps: number }

export type DraftExercise = {
  exerciseId: string
  name: string
  rest: number
  sets: DraftSet[]
  prev: PrevSet[]
}

export type DraftWorkout = {
  name: string
  routineId: string | null
  startedAt: string
  exercises: DraftExercise[]
}

export type RoutineWithExercises = {
  id: string
  name: string
  routine_exercises: {
    id: string
    position: number
    target_sets: number
    target_reps: string | null
    rest_seconds: number
    exercise_id: string
    exercises: { name: string } | null
  }[]
}
