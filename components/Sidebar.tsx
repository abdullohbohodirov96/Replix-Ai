'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'

const navItems = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    adminOnly: false,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    href: '/managers',
    label: 'Managerlar',
    adminOnly: false,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    href: '/calls',
    label: "Qo'ng'iroqlar",
    adminOnly: false,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.85a16 16 0 0 0 6.29 6.29l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7a2 2 0 0 1 1.72 2.03z" />
      </svg>
    ),
  },
  {
    href: '/reports',
    label: 'Hisobotlar',
    adminOnly: false,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
  {
    href: '/analytics',
    label: 'AI Tahlil',
    adminOnly: false,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
      </svg>
    ),
  },
  {
    href: '/integrations',
    label: 'Integratsiyalar',
    adminOnly: true,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    ),
  },
  {
    href: '/admin/users',
    label: 'Foydalanuvchilar',
    adminOnly: true,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    href: '/admin',
    label: 'Yordam',
    adminOnly: true,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
]

const comingSoonItems = [
  {
    label: 'KPI & Maqsadlar',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
  },
  {
    label: "Bo'limlar",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    label: 'Trening',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
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
    <aside className="fixed left-0 top-0 h-full w-60 bg-bg-base border-r border-bg-border z-50 hidden lg:flex flex-col">

      {/* Logo */}
      <div className="px-5 py-5 border-b border-bg-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-brand-orange flex items-center justify-center shadow-orange-sm flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-text-primary tracking-tight leading-none">
              Dunyabunya
            </div>
            <div className="text-2xs text-text-muted mt-0.5 leading-none">
              Replix AI Analytics
            </div>
          </div>
        </div>
      </div>

      {/* Status indicator */}
      <div className="px-4 py-2.5 border-b border-bg-border">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-bg-card rounded-md">
          <div className="w-1.5 h-1.5 rounded-full bg-status-success flex-shrink-0" />
          <span className="text-2xs text-text-muted truncate">Savdo Platforma · Faol</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-0.5">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href))

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                relative flex items-center gap-2.5 px-3 py-2 rounded-md text-sm
                transition-colors duration-100 group
                ${isActive
                  ? 'bg-bg-card text-text-primary'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-card/60'
                }
              `}
            >
              {isActive && <span className="nav-active-bar" />}
              <span className={`transition-colors flex-shrink-0 ${isActive ? 'text-brand-orange' : 'text-text-muted group-hover:text-text-secondary'}`}>
                {item.icon}
              </span>
              <span className="font-medium">{item.label}</span>
              {item.adminOnly && (
                <span className="ml-auto text-2xs bg-bg-elevated text-text-muted px-1.5 py-0.5 rounded uppercase tracking-wider">
                  Admin
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Coming soon — subtle locked items */}
      <div className="px-3 pb-2">
        <div className="px-3 mb-1">
          <span className="text-2xs text-text-dim uppercase tracking-widest font-medium">Yaqinda</span>
        </div>
        {comingSoonItems.map(item => (
          <div
            key={item.label}
            className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm opacity-35 cursor-not-allowed select-none"
          >
            <span className="text-text-muted flex-shrink-0">{item.icon}</span>
            <span className="text-text-muted font-medium">{item.label}</span>
          </div>
        ))}
      </div>

      {/* User section */}
      {session?.user ? (
        <div className="px-3 py-3 border-t border-bg-border">
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-md bg-bg-card mb-1">
            <div className="w-7 h-7 rounded-full bg-brand-orange-dim border border-brand-orange-muted flex items-center justify-center text-xs font-semibold text-brand-orange flex-shrink-0">
              {(session.user.name || session.user.email || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-text-primary truncate leading-none">
                {session.user.name || 'Foydalanuvchi'}
              </div>
              <div className="text-2xs text-text-muted mt-0.5 leading-none">
                {isAdmin ? 'Administrator' : 'Foydalanuvchi'}
              </div>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs text-text-muted hover:text-status-danger hover:bg-status-danger/5 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span className="font-medium">Chiqish</span>
          </button>
        </div>
      ) : (
        <div className="px-4 py-4 border-t border-bg-border">
          <div className="text-2xs text-text-dim text-center">
            Dunyabunya × Replix AI · v1.0
          </div>
        </div>
      )}

    </aside>
  )
}
