'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Icon from './Icon'

const items = [
  { href: '/', label: 'Home', icon: 'home', match: (p: string) => p === '/' || p.startsWith('/runs') },
  { href: '/routines', label: 'Workout', icon: 'dumbbell', match: (p: string) => p.startsWith('/routines') },
  { href: '/exercises', label: 'Progress', icon: 'chart', match: (p: string) => p.startsWith('/exercises') || p.startsWith('/history') },
]

export default function BottomNav() {
  const path = usePathname()
  if (['/login', '/workout', '/routines/', '/runs/start', '/runs/routines', '/import'].some((x) => path.startsWith(x))) return null

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto grid max-w-md grid-cols-3">
        {items.map((it) => {
          const active = it.match(path)
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${active ? 'text-ink' : 'text-steel'}`}
            >
              <Icon name={it.icon} size={22} strokeWidth={active ? 2.3 : 1.8} />
              <span>{it.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
