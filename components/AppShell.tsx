'use client'

import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import ChatBot from './ChatBot'
import AIAssistant from './AIAssistant'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isPublic = pathname === '/login' || pathname === '/'

  if (isPublic) {
    return <>{children}</>
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <TopBar />
      <main className="flex-1 lg:ml-16 min-h-screen pt-12">
        <div className="p-4 md:p-6 animate-fade-in">
          {children}
        </div>
      </main>
      <ChatBot />
      <AIAssistant />
    </div>
  )
}
