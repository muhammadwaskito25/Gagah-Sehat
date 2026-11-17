import { createClient } from '@/lib/supabase/server'
import CoachProfileForm from '@/components/CoachProfileForm'

export default async function CoachProfilePage() {
  const supabase = await createClient()
  const { data } = await supabase.from('coach_profile').select('*').maybeSingle()
  return <CoachProfileForm initial={data} />
}
