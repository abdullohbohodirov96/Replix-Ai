'use client'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback, useState } from 'react'

interface Props {
  managers: Array<{ id: string; name: string }>
  categories: Array<{ id: string; name: string; color: string }>
  currentPeriod?: string
  currentManagerId?: string
  currentCategoryId?: string
}

const PERIODS = [
  { key: 'today', label: 'Bugun' },
  { key: 'week', label: 'Bu hafta' },
  { key: 'month', label: 'Bu oy' },
  { key: '', label: 'Hammasi' },
]

export default function DashboardFilters({ managers, categories, currentPeriod, currentManagerId, currentCategoryId }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [compare, setCompare] = useState(false)

  const update = useCallback((updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([key, value]) => {
      if (value) params.set(key, value)
      else params.delete(key)
    })
    router.replace(`${pathname}?${params.toString()}`)
  }, [router, pathname, searchParams])

  const selectedCat = categories.find(c => c.id === currentCategoryId)

  return (
    <div className="card p-4 space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {/* Davr */}
        <div>
          <label className="text-xs text-text-muted mb-1.5 block font-semibold">Davr</label>
          <div className="relative">
            <select
              value={currentPeriod || ''}
              onChange={e => update({ period: e.target.value })}
              className="input-field appearance-none pr-8 font-semibold"
            >
              {PERIODS.map(p => (
                <option key={p.key} value={p.key}>{p.label}</option>
              ))}
            </select>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
        </div>

        {/* Menejer */}
        <div>
          <label className="text-xs text-text-muted mb-1.5 block font-semibold">Menejer</label>
          <div className="relative">
            <select
              value={currentManagerId || ''}
              onChange={e => update({ managerId: e.target.value })}
              className="input-field appearance-none pr-8 font-semibold"
            >
              <option value="">Barcha menejerlar</option>
              {managers.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
        </div>

        {/* Suhbat kategoriyasi */}
        <div>
          <label className="text-xs text-text-muted mb-1.5 block font-semibold">Suhbat kategoriyasi</label>
          <div className="relative flex items-center">
            <select
              value={currentCategoryId || ''}
              onChange={e => update({ categoryId: e.target.value })}
              className="input-field appearance-none pr-14 font-semibold"
              style={selectedCat ? { color: selectedCat.color } : {}}
            >
              <option value="">Barcha kategoriyalar</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {currentCategoryId && (
              <button onClick={() => update({ categoryId: '' })} className="absolute right-7 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Taqqoslash toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setCompare(v => !v)}
          className={`relative w-10 h-5 rounded-full transition-colors ${compare ? 'bg-brand-orange' : 'bg-bg-elevated border border-bg-border'}`}
        >
          <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${compare ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </button>
        <span className="text-sm font-semibold text-text-primary">Taqqoslash</span>

        {compare && (
          <div className="flex items-center gap-3 ml-4">
            <div>
              <label className="text-xs text-text-muted mb-1 block font-semibold">Menejer A</label>
              <div className="relative">
                <select className="input-field appearance-none pr-8 text-xs font-semibold" style={{ minWidth: 140 }}>
                  <option value="">Menejerni tanlang</option>
                  {managers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>
            </div>
            <div>
              <label className="text-xs text-text-muted mb-1 block font-semibold">Menejer B</label>
              <div className="relative">
                <select className="input-field appearance-none pr-8 text-xs font-semibold" style={{ minWidth: 140 }}>
                  <option value="">Menejerni tanlang</option>
                  {managers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
