'use client'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function DeleteButton({ table, id, redirect, label = 'Hapus' }: { table: string; id: string; redirect: string; label?: string }) {
  const router = useRouter()
  return (
    <button
      className="w-full py-2 text-sm text-red-400"
      onClick={async () => {
        if (!confirm('Yakin hapus?')) return
        const { error } = await createClient().from(table).delete().eq('id', id)
        if (error) return alert(error.message)
        router.push(redirect)
        router.refresh()
      }}
    >
      {label}
    </button>
  )
}
