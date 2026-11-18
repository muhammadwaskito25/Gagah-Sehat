'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Icon from './Icon'

const items = [
  { href: '/', label: 'Home', icon: 'home', match: (p: string) => p === '/' },
  { href: '/routines', label: 'Latihan', icon: 'dumbbell', match: (p: string) => p.startsWith('/routines') },
  { href: '/runs', label: 'Lari', icon: 'run', match: (p: string) => p.startsWith('/runs') },
  { href: '/exercises', label: 'Progres', icon: 'chart', match: (p: string) => p.startsWith('/exercises') || p.startsWith('/history') },
  { href: '/profile', label: 'Profil', icon: 'user', match: (p: string) => p.startsWith('/profile') || p.startsWith('/import') },
]

export default function BottomNav() {
  const path = usePathname()
  // Sembunyikan hanya saat logger sesi aktif atau halaman login
  if (['/login', '/workout', '/runs/start'].some((x) => path === x || path.startsWith(x + '/'))) {
    return null
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[#1F2537] bg-[#0B0D13]/95 backdrop-blur-md pb-[max(env(safe-area-inset-bottom),0.5rem)]">
      <div className="mx-auto grid max-w-md grid-cols-5">
        {items.map((it) => {
          const active = it.match(path)
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`flex flex-col items-center gap-1 py-2 text-[11px] font-semibold tracking-wide transition ${
                active ? 'text-[#FF5500]' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className={`relative flex h-7 w-7 items-center justify-center rounded-lg transition ${
                active ? 'text-[#FF5500]' : 'text-slate-400'
              }`}>
                <Icon name={it.icon} size={21} strokeWidth={active ? 2.5 : 1.9} />
              </div>
              <span className={active ? 'text-white' : 'text-slate-400'}>{it.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
