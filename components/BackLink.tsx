import Link from 'next/link'
import Icon from './Icon'

export default function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="-ml-1 inline-flex items-center gap-1 text-sm font-medium text-steel">
      <Icon name="left" size={18} />
      {label}
    </Link>
  )
}
