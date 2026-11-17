import type { Metadata, Viewport } from 'next'
import './globals.css'
import BottomNav from '@/components/BottomNav'
import SWRegister from '@/components/SWRegister'

export const metadata: Metadata = {
  title: 'Gagah',
  description: 'Catatan progres gym dan lari',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Gagah' },
}

export const viewport: Viewport = {
  themeColor: '#0a0a0a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="min-h-dvh">
        <main className="mx-auto max-w-lg px-4 pb-28 pt-[max(env(safe-area-inset-top),1rem)]">
          {children}
        </main>
        <BottomNav />
        <SWRegister />
      </body>
    </html>
  )
}
