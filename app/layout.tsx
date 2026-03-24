import type { Metadata, Viewport } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { ThemeProvider } from '@/components/app/theme-provider'
import { Toaster } from '@/components/ui/toaster'
import { QueryProvider } from '@/components/app/query-provider'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'GemLancer — Freelance Business Platform',
    template: '%s | GemLancer',
  },
  description:
    'All-in-one platform for freelancers and agencies. CRM, projects, invoicing, time tracking, and client portal.',
  keywords: ['freelance', 'invoicing', 'project management', 'CRM', 'time tracking'],
  authors: [{ name: 'GemLancer' }],
  creator: 'GemLancer',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: process.env.NEXT_PUBLIC_APP_URL,
    siteName: 'GemLancer',
    title: 'GemLancer — Freelance Business Platform',
    description: 'All-in-one platform for freelancers and agencies.',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0f' },
  ],
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <QueryProvider>
            {children}
            <Toaster />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
