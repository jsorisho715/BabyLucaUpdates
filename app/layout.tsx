import type { Metadata, Viewport } from 'next'
import { Toaster } from 'sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import './globals.css'

export const metadata: Metadata = {
  title: "Luca's Updates — Welcome to the World",
  description:
    'Follow along as Baby Luca makes his grand entrance. Real-time updates from Jordyn & Johnathan.',
  openGraph: {
    title: "Luca's Updates",
    description: 'Follow along as Baby Luca makes his grand entrance.',
    type: 'website',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#4BA3E3',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-dvh font-sans">
        <TooltipProvider delayDuration={300}>
          {children}
        </TooltipProvider>
        <Toaster
          position="top-center"
          richColors
          toastOptions={{
            className: 'font-sans',
          }}
        />
      </body>
    </html>
  )
}
