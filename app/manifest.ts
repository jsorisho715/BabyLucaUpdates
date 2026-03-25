import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Luca's Updates",
    short_name: "Luca",
    description: 'Follow along as Baby Luca makes his grand entrance into the world.',
    start_url: '/',
    display: 'standalone',
    background_color: '#F5F9FC',
    theme_color: '#4BA3E3',
    orientation: 'portrait',
    icons: [
      {
        src: '/icon',
        sizes: '32x32',
        type: 'image/png',
      },
      {
        src: '/favicon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  }
}
