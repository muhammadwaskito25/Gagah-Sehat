'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Icon from './Icon'

const items = [
  { href: '/', label: 'Beranda', icon: 'home' },
  { href: '/routines', label: 'Routine', icon: 'list' },
  { href: '/runs', label: 'Lari', icon: 'run' },
  { href: '/exercises', label: 'Progres', icon: 'chart' },
]

export default function BottomNav() {
  const path = usePathname()
  if (path.startsWith('/login') || path.startsWith('/workout')) return null
  const isActive = (href: string) => (href === '/' ? path === '/' : path.startsWith(href))

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="relative mx-auto grid max-w-md grid-cols-[1fr_1fr_76px_1fr_1fr] items-end px-2">
        {items.slice(0, 2).map((it) => <Item key={it.href} {...it} active={isActive(it.href)} />)}
        <Link
          href="/workout"
          aria-label="Mulai latihan"
          className="mx-auto -mt-6 mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-plate-blue text-white ring-[5px] ring-white transition active:scale-95"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/30">
            <Icon name="plus" size={22} strokeWidth={2.5} />
          </span>
        </Link>
        {items.slice(2).map((it) => <Item key={it.href} {...it} active={isActive(it.href)} />)}
      </div>
    </nav>
  )
}

function Item({ href, label, icon, active }: { href: string; label: string; icon: string; active: boolean }) {
  return (
    <Link href={href} className={`flex flex-col items-center gap-1 pb-2.5 pt-2.5 text-[11px] font-medium ${active ? 'text-ink' : 'text-steel'}`}>
      <Icon name={icon} size={22} strokeWidth={active ? 2.3 : 1.8} />
      <span>{label}</span>
    </Link>
  )
}
