import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Gagah',
    short_name: 'Gagah',
    description: 'Catatan progres gym dan lari',
    start_url: '/',
    display: 'standalone',
    background_color: '#F2F3EF',
    theme_color: '#F2F3EF',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  }
}
