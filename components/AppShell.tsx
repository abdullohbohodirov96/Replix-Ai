'use client'

import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'
import ChatBot from './ChatBot'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLogin = pathname === '/login'

  if (isLogin) {
    return <>{children}</>
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 lg:ml-64 min-h-screen">
        <div className="p-4 md:p-8 animate-fade-in">
          {children}
        </div>
      </main>
      <ChatBot />
    </div>
  )
}
