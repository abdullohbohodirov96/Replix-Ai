'use client'

import { useSession, signOut } from 'next-auth/react'
import { useTheme } from '@/contexts/ThemeContext'
import { useLang } from '@/contexts/LanguageContext'

export default function TopBar() {
  const { data: session } = useSession()
  const { theme, toggle } = useTheme()
  const { lang, setLang } = useLang()

  const userName = session?.user?.name || session?.user?.email || 'U'
  const userInitial = userName.charAt(0).toUpperCase()

  return (
    <header className="fixed top-0 left-16 right-0 h-12 bg-bg-base border-b border-bg-border z-40 flex items-center justify-between px-5">
      {/* Left: logo + name */}
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-md bg-brand-orange flex items-center justify-center flex-shrink-0">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <span className="text-sm font-bold text-text-primary">Replix AI</span>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-1">
        {/* Language selector */}
        <div className="flex items-center gap-1 bg-bg-elevated border border-bg-border rounded-md px-2 py-1 cursor-pointer hover:bg-bg-card transition-colors">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted flex-shrink-0">
            <circle cx="12" cy="12" r="10" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
          <select
            value={lang}
            onChange={e => setLang(e.target.value as 'uz' | 'ru' | 'en')}
            className="text-xs font-semibold text-text-primary bg-transparent border-none outline-none cursor-pointer"
          >
            <option value="uz">O&apos;zbekcha</option>
            <option value="ru">Русский</option>
            <option value="en">English</option>
          </select>
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggle}
          title={theme === 'dark' ? "Yorug' rejim" : "Qorong'u rejim"}
          className="w-8 h-8 flex items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"
        >
          {theme === 'dark' ? (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </button>

        {/* Bell */}
        <button className="w-8 h-8 flex items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </button>

        {/* User avatar */}
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          title={`${userName} — Chiqish`}
          className="w-8 h-8 rounded-full bg-brand-orange-dim border border-brand-orange-muted flex items-center justify-center text-xs font-bold text-brand-orange hover:opacity-80 transition-opacity ml-1"
        >
          {userInitial}
        </button>
      </div>
    </header>
  )
}
