'use client'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

interface Props {
  managers: Array<{ id: string; name: string }>
  currentPeriod?: string
  currentManagerId?: string
}

const PERIODS = [
  { key: 'today', label: 'Bugun' },
  { key: 'week', label: 'Hafta' },
  { key: 'month', label: 'Oy' },
  { key: '', label: 'Hammasi' },
]

export default function DashboardFilters({ managers, currentPeriod, currentManagerId }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const update = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    router.replace(`${pathname}?${params.toString()}`)
  }, [router, pathname, searchParams])

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Period tabs */}
      <div className="tab-list">
        {PERIODS.map(p => (
          <button
            key={p.key}
            onClick={() => update('period', p.key)}
            className={`tab-item ${(currentPeriod || '') === p.key ? 'active' : ''}`}
          >
            {p.label}
          </button>
        ))}
      </div>
      {/* Manager filter */}
      {managers.length > 1 && (
        <select
          value={currentManagerId || ''}
          onChange={e => update('managerId', e.target.value)}
          className="input-field"
          style={{ width: 'auto', minWidth: 140 }}
        >
          <option value="">Barcha managerlar</option>
          {managers.map(m => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      )}
    </div>
  )
}
