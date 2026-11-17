'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Icon from './Icon'

export default function LogoutButton() {
  const [loading, setLoading] = useState(false)
  return (
    <button
      className="btn-ghost h-12 w-full text-plate-red"
      disabled={loading}
      onClick={async () => {
        if (!confirm('Keluar dari akun ini?')) return
        setLoading(true)
        await createClient().auth.signOut()
        window.location.replace('/login')
      }}
    >
      <Icon name="logout" size={18} />
      {loading ? 'Keluar...' : 'Keluar'}
    </button>
  )
}
