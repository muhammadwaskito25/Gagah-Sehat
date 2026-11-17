'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const items = [
  { href: '/', label: 'Beranda', icon: '⌂' },
  { href: '/routines', label: 'Routine', icon: '☰' },
  { href: '/workout', label: 'Mulai', icon: '+' , main: true },
  { href: '/runs', label: 'Lari', icon: '➶' },
  { href: '/exercises', label: 'Progres', icon: '↗' },
  { href: '/coach', label: 'Coach', icon: '✦' },
]

export default function BottomNav() {
  const path = usePathname()
  if (path.startsWith('/login')) return null
  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 border-t border-neutral-800 bg-neutral-950/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto max-w-lg grid grid-cols-6">
        {items.map((it) => {
          const active = it.href === '/' ? path === '/' : path.startsWith(it.href)
          return (
            <Link key={it.href} href={it.href} className="flex flex-col items-center py-2 text-xs">
              <span
                className={
                  it.main
                    ? 'mb-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-blue-500 text-xl text-white'
                    : `text-xl ${active ? 'text-blue-400' : 'text-neutral-400'}`
                }
              >
                {it.icon}
              </span>
              <span className={active ? 'text-blue-400' : 'text-neutral-400'}>{it.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
