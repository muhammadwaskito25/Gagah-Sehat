import type { Metadata, Viewport } from 'next'
import { Barlow, Barlow_Condensed } from 'next/font/google'
import './globals.css'
import BottomNav from '@/components/BottomNav'
import SWRegister from '@/components/SWRegister'

const body = Barlow({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-body' })
const display = Barlow_Condensed({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-display' })

export const metadata: Metadata = {
  title: 'Gagah',
  description: 'Catatan progres gym dan lari',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Gagah' },
}

export const viewport: Viewport = {
  themeColor: '#F2F3EF',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${body.variable} ${display.variable}`}>
      <body className="min-h-dvh font-sans antialiased">
        <main className="mx-auto max-w-md px-5 pb-28 pt-[calc(env(safe-area-inset-top)+2.5rem)]">
          {children}
        </main>
        <BottomNav />
        <SWRegister />
      </body>
    </html>
  )
}
