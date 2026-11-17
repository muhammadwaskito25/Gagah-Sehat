'use client'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Icon from './Icon'

export default function DeleteButton({ table, id, redirect, label = 'Hapus' }: { table: string; id: string; redirect: string; label?: string }) {
  const router = useRouter()
  return (
    <button
      className="btn w-full text-plate-red"
      onClick={async () => {
        if (!confirm('Yakin hapus? Tidak bisa dibatalkan')) return
        const { error } = await createClient().from(table).delete().eq('id', id)
        if (error) return alert(error.message)
        router.push(redirect)
        router.refresh()
      }}
    >
      <Icon name="trash" size={18} />
      {label}
    </button>
  )
}
