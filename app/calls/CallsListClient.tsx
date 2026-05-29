'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'

type Call = {
  id: string
  audioFileName: string
  duration: number | null
  clientPhone: string | null
  score: number | null
  rating: number | null
  callOutcome: string | null
  status: string
  createdAt: string
  analyzedAt: string | null
  manager: { id: string; name: string }
  category: { id: string; name: string; color: string } | null
}

function formatDuration(s: number | null) {
  if (!s) return '—'
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

function StatusBadge({ status, outcome }: { status: string; outcome: string | null }) {
  if (outcome === 'sale') return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-[#22c55e1a] text-[#22c55e]">Sotildi</span>
  if (outcome === 'rejected') return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-[#ef44441a] text-[#ef4444]">Rad etildi</span>
  if (outcome === 'followup') return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-[#3b82f61a] text-[#3b82f6]">Davom kerak</span>
  if (status === 'analyzed') return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-[#22c55e1a] text-[#22c55e]">Tugallangan</span>
  if (status === 'pending') return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-[#f59e0b1a] text-[#f59e0b]">Kutmoqda</span>
  if (status === 'analyzing') return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-[#3b82f61a] text-[#3b82f6]">Tahlillanmoqda</span>
  return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-bg-elevated text-text-muted">Noma&apos;lum</span>
}

const PAGE_SIZES = [10, 25, 50]

interface Props {
  calls: Call[]
  managers: { id: string; name: string }[]
  isAdmin: boolean
  uploadModal: React.ReactNode
}

export default function CallsListClient({ calls, isAdmin, uploadModal }: Props) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    if (!q) return calls
    return calls.filter(c =>
      c.audioFileName.toLowerCase().includes(q) ||
      c.manager.name.toLowerCase().includes(q) ||
      (c.clientPhone || '').includes(q) ||
      (c.category?.name || '').toLowerCase().includes(q)
    )
  }, [calls, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize)

  const toggleAll = () => {
    if (selected.size === paginated.length) setSelected(new Set())
    else setSelected(new Set(paginated.map(c => c.id)))
  }
  const toggleOne = (id: string) => {
    const s = new Set(selected)
    s.has(id) ? s.delete(id) : s.add(id)
    setSelected(s)
  }

  return (
    <>
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-text-muted">
        <span>Audio Fayllar</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
        <span className="text-text-secondary">Ro&apos;yxat</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Audio Fayllar</h1>
          <div className="mt-1.5 space-y-1">
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <span>Bugungi foydalanish</span>
              <span className="text-brand-orange font-semibold">0 daqiqa / 2 soat</span>
            </div>
            <div className="w-64 h-1.5 bg-bg-elevated rounded-full overflow-hidden">
              <div className="h-full bg-brand-orange rounded-full" style={{ width: '0%' }} />
            </div>
            <div className="text-xs text-text-muted">2 soat bugun qoldi</div>
          </div>
        </div>
        {isAdmin && uploadModal && (
          <div className="flex-shrink-0">
            {uploadModal}
          </div>
        )}
      </div>

      {/* Table card */}
      <div className="card overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-2 p-3 border-b border-bg-border">
          <div className="relative flex-1 max-w-xs">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Qidirish"
              className="input-field pl-7 py-1.5 text-xs w-full"
            />
          </div>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-bg-border rounded-md text-text-secondary hover:bg-bg-elevated transition-colors">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
            Filtrlash
          </button>
          <button className="w-7 h-7 flex items-center justify-center rounded border border-bg-border text-text-muted hover:bg-bg-elevated transition-colors">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
          </button>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <svg className="text-text-muted mb-4" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.85a16 16 0 0 0 6.29 6.29l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7a2 2 0 0 1 1.72 2.03z" />
            </svg>
            <p className="text-sm text-text-secondary mb-1">{search ? 'Natija topilmadi' : "Audio fayllar yo'q"}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-bg-border bg-bg-elevated/50">
                  <th className="w-10 px-3 py-2.5">
                    <input type="checkbox" checked={selected.size === paginated.length && paginated.length > 0} onChange={toggleAll}
                      className="w-3.5 h-3.5 rounded accent-brand-orange cursor-pointer" />
                  </th>
                  <th className="px-3 py-2.5 text-left">
                    <button className="flex items-center gap-1 text-xs font-semibold text-text-muted hover:text-text-primary">
                      Fayl nomi
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                    </button>
                  </th>
                  <th className="px-3 py-2.5 text-left">
                    <button className="flex items-center gap-1 text-xs font-semibold text-text-muted hover:text-text-primary">
                      Menejer
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                    </button>
                  </th>
                  <th className="px-3 py-2.5 text-left">
                    <button className="flex items-center gap-1 text-xs font-semibold text-text-muted hover:text-text-primary">
                      Telefon raqami
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                    </button>
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-text-muted">CRMda ko&apos;rish</th>
                  <th className="px-3 py-2.5 text-left">
                    <button className="flex items-center gap-1 text-xs font-semibold text-text-muted hover:text-text-primary">
                      Davomiyligi
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                    </button>
                  </th>
                  <th className="px-3 py-2.5 text-left">
                    <button className="flex items-center gap-1 text-xs font-semibold text-text-muted hover:text-text-primary">
                      Holati
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                    </button>
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-text-muted">Kategoriya</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bg-border">
                {paginated.map(call => (
                  <tr key={call.id} className="hover:bg-bg-elevated/30 transition-colors cursor-pointer group">
                    <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.has(call.id)} onChange={() => toggleOne(call.id)}
                        className="w-3.5 h-3.5 rounded accent-brand-orange cursor-pointer" />
                    </td>
                    <td className="px-3 py-3">
                      <Link href={`/calls/${call.id}`} className="font-mono text-xs text-text-secondary hover:text-brand-orange transition-colors max-w-[180px] truncate block">
                        {call.audioFileName}
                      </Link>
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-xs text-text-primary">{call.manager.name}</span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="font-mono text-xs text-text-muted">{call.clientPhone || '—'}</span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-xs text-text-muted">—</span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="font-mono text-xs text-text-muted">{formatDuration(call.duration)}</span>
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge status={call.status} outcome={call.callOutcome} />
                    </td>
                    <td className="px-3 py-3">
                      {call.category ? (
                        <span className="text-xs px-2 py-0.5 rounded font-semibold" style={{ background: `${call.category.color}18`, color: call.category.color }}>
                          {call.category.name}
                        </span>
                      ) : <span className="text-xs text-text-muted">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {filtered.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-bg-border">
            <span className="text-xs text-text-muted">
              {(page - 1) * pageSize + 1}dan {Math.min(page * pageSize, filtered.length)}gacha jami natijalar {filtered.length}ta
            </span>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-text-muted">Har bir sahifaga</span>
                <select
                  value={pageSize}
                  onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}
                  className="text-xs border border-bg-border rounded px-2 py-1 bg-bg-base text-text-primary"
                >
                  {PAGE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="w-7 h-7 flex items-center justify-center rounded border border-bg-border text-text-muted hover:bg-bg-elevated disabled:opacity-40 transition-colors">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i
                  return (
                    <button key={p} onClick={() => setPage(p)}
                      className={`w-7 h-7 flex items-center justify-center rounded text-xs font-semibold transition-colors ${page === p ? 'bg-brand-orange text-white' : 'border border-bg-border text-text-muted hover:bg-bg-elevated'}`}>
                      {p}
                    </button>
                  )
                })}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="w-7 h-7 flex items-center justify-center rounded border border-bg-border text-text-muted hover:bg-bg-elevated disabled:opacity-40 transition-colors">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
