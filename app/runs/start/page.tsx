import { createClient } from '@/lib/supabase/server'
import RunSession from '@/components/RunSession'
import type { RunRoutine } from '@/lib/run'

export default async function RunStartPage({ searchParams }: { searchParams: Promise<{ routine?: string }> }) {
  const { routine: id } = await searchParams
  let routine: RunRoutine | null = null
  if (id) {
    const supabase = await createClient()
    const { data } = await supabase.from('run_routines').select('*').eq('id', id).single()
    routine = data as RunRoutine | null
  }
  return <RunSession routine={routine} />
}
