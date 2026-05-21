import type { Metadata } from 'next'
import './globals.css'
import Sidebar from '@/components/Sidebar'
import ChatBot from '@/components/ChatBot'

export const metadata: Metadata = {
  title: 'Dunyabunya — Replix AI Analytics',
  description: 'Dunyabunya savdo platformasi uchun AI-powered qo\'ng\'iroq tahlil tizimi.',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="uz" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#080810] text-[#E8E8F5] font-sans antialiased">
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 lg:ml-64 min-h-screen">
            <div className="p-4 md:p-8 animate-fade-in">
              {children}
            </div>
          </main>
          <ChatBot />
        </div>
      </body>
    </html>
  )
}
