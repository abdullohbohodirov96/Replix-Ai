'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'

const comingSoonItems = [
  {
    label: 'KPI & Maqsadlar',
    icon: (
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    label: 'Bo\'limlar',
    icon: (
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  {
    label: 'Trening',
    icon: (
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
]

const navItems = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    adminOnly: false,
    icon: (
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    href: '/managers',
    label: 'Managerlar',
    adminOnly: false,
    icon: (
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    href: '/calls',
    label: "Qo'ng'iroqlar",
    adminOnly: false,
    icon: (
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
      </svg>
    ),
  },
  {
    href: '/reports',
    label: 'Hisobotlar',
    adminOnly: false,
    icon: (
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    href: '/admin/users',
    label: 'Foydalanuvchilar',
    adminOnly: true,
    icon: (
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    href: '/admin',
    label: 'Yordam',
    adminOnly: true,
    icon: (
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>
    ),
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const role = (session?.user as { role?: string })?.role
  const isAdmin = role === 'admin'

  const visibleItems = navItems.filter(item => !item.adminOnly || isAdmin)

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-[#0D0D1A] border-r border-[#1E1E35] z-50 hidden lg:flex flex-col">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-[#1E1E35]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#FF6B35] to-[#FF3D00] flex items-center justify-center shadow-lg shadow-orange-500/20">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" stroke="white" strokeWidth="2"/>
            </svg>
          </div>
          <div>
            <div className="font-display font-800 text-base text-white tracking-tight">
              Dunyabunya
            </div>
            <div className="text-[10px] font-mono text-[#FF6B35] uppercase tracking-widest">
              Replix AI Analytics
            </div>
          </div>
        </div>
      </div>

      {/* Company Badge */}
      <div className="px-6 py-3 border-b border-[#1E1E35]">
        <div className="flex items-center gap-2 px-3 py-2 bg-[#111122] rounded-lg border border-[#1E1E35]">
          <div className="w-2 h-2 rounded-full bg-[#FF6B35] animate-pulse" />
          <span className="text-xs font-mono text-[#9494B8] truncate">Dunyabunya Savdo Platforma</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href))

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                transition-all duration-150 group
                ${isActive
                  ? 'bg-[#FF6B35]/10 text-[#FF6B35] border border-[#FF6B35]/20'
                  : 'text-[#9494B8] hover:text-[#E8E8F5] hover:bg-[#161628]'
                }
              `}
            >
              <span className={`transition-colors ${isActive ? 'text-[#FF6B35]' : 'text-[#5555AA] group-hover:text-[#9494B8]'}`}>
                {item.icon}
              </span>
              <span className="font-display">{item.label}</span>
              {item.adminOnly && (
                <span className="ml-auto text-[9px] font-mono bg-[#FF6B35]/10 text-[#FF6B35] px-1.5 py-0.5 rounded uppercase tracking-wider">
                  Admin
                </span>
              )}
              {isActive && !item.adminOnly && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#FF6B35]" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Coming soon items */}
      <div className="px-4 pb-2">
        <div className="text-[9px] font-mono text-[#333360] uppercase tracking-widest px-3 mb-1">Tez kunda</div>
        {comingSoonItems.map(item => (
          <div key={item.label}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm opacity-30 cursor-not-allowed select-none">
            <span className="text-[#5555AA]">{item.icon}</span>
            <span className="font-display text-[#9494B8]">{item.label}</span>
            <span className="ml-auto text-[9px] font-mono bg-[#1E1E35] text-[#5555AA] px-1.5 py-0.5 rounded uppercase tracking-wider">
              Bravo
            </span>
          </div>
        ))}
      </div>

      {/* User info + logout */}
      {session?.user && (
        <div className="px-4 py-4 border-t border-[#1E1E35]">
          <div className="flex items-center gap-3 px-3 py-2.5 bg-[#111122] rounded-lg border border-[#1E1E35] mb-2">
            <div className="w-8 h-8 rounded-full bg-[#FF6B35]/10 border border-[#FF6B35]/20 flex items-center justify-center text-xs font-display font-600 text-[#FF6B35] shrink-0">
              {(session.user.name || session.user.email || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-display text-white truncate">{session.user.name || 'Foydalanuvchi'}</div>
              <div className="text-[10px] font-mono text-[#5555AA] truncate">{isAdmin ? 'Admin' : 'User'}</div>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono text-[#5555AA] hover:text-red-400 hover:bg-red-500/5 transition-colors"
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Chiqish
          </button>
        </div>
      )}

      {/* Footer */}
      {!session?.user && (
        <div className="px-6 py-4 border-t border-[#1E1E35]">
          <div className="text-[10px] font-mono text-[#333360] text-center">
            <div>Dunyabunya <span className="text-[#FF6B35]/60">× Replix AI</span></div>
            <div className="mt-0.5">v1.0.0</div>
          </div>
        </div>
      )}
    </aside>
  )
}
