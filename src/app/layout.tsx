import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import '../utils/sentryConfig' // Initialize Sentry
import ClientOnly from '../components/ClientOnly'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Exhibition B2B Platform',
  description: 'Complete event management platform for exhibitions and trade shows',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#000000" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={inter.className}>
        <ClientOnly>
          {children}
        </ClientOnly>
      </body>
    </html>
  )
}
