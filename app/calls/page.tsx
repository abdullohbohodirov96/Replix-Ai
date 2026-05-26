import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { format } from 'date-fns'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import UploadCallModal from '@/components/UploadCallModal'
import DeleteCallButton from '@/components/DeleteCallButton'
import ArchiveCallButton from '@/components/ArchiveCallButton'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function scoreColor(score: number | null) {
  if (!score) return '#4a4a70'
  if (score < 40) return '#ef4444'
  if (score < 70) return '#f59e0b'
  if (score < 90) return '#22c55e'
  return '#f97316'
}

function scoreBg(score: number | null) {
  if (!score) return 'rgba(74,74,112,0.1)'
  if (score < 40) return 'rgba(239,68,68,0.1)'
  if (score < 70) return 'rgba(245,158,11,0.1)'
  if (score < 90) return 'rgba(34,197,94,0.1)'
  return 'rgba(249,115,22,0.1)'
}

function formatDuration(seconds: number | null) {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export default async function CallsPage({
  searchParams,
}: {
  searchParams: { archived?: string }
}) {
  const session = await getServerSession(authOptions)
  const sessionUser = session?.user as { role?: string; managerId?: string | null } | undefined
  const isAdmin = sessionUser?.role === 'admin'
  const filterManagerId = isAdmin ? null : sessionUser?.managerId

  const showArchived = searchParams.archived === '1'

  const [calls, managers] = await Promise.all([
    prisma.call.findMany({
      where: {
        ...(filterManagerId ? { managerId: filterManagerId } : {}),
        archivedAt: showArchived ? { not: null } : null,
      },
      select: {
        id: true, audioFileName: true, duration: true, clientPhone: true,
        rating: true, score: true, callOutcome: true, clientSentiment: true,
        summary: true, status: true, leadQuality: true, createdAt: true, analyzedAt: true,
        managerId: true, archivedAt: true,
        manager: { select: { id: true, name: true } },
        category: { select: { id: true, name: true, color: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.manager.findMany({
      where: filterManagerId ? { id: filterManagerId } : undefined,
      orderBy: { name: 'asc' },
    }),
  ])

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Audio Fayllar</h1>
          <p className="text-xs text-text-muted mt-0.5">
            <span className="font-mono">{calls.length}</span> ta {showArchived ? 'arxivlangan' : 'faol'} qo&apos;ng&apos;iroq
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={showArchived ? '/calls' : '/calls?archived=1'}
            className="px-3 py-1.5 text-xs text-text-secondary border border-bg-border rounded-md hover:bg-bg-elevated transition-colors"
          >
            {showArchived ? '← Faollar' : 'Arxiv'}
          </Link>
          {isAdmin && <UploadCallModal managers={managers} />}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {calls.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <svg className="text-text-muted mb-4" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.85a16 16 0 0 0 6.29 6.29l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7a2 2 0 0 1 1.72 2.03z" />
            </svg>
            <p className="text-sm text-text-secondary mb-1">{showArchived ? "Arxivlangan fayllar yo'q" : "Audio fayllar yo'q"}</p>
            {!showArchived && isAdmin && (
              <p className="text-xs text-text-muted mb-4">Birinchi audio qo&apos;ng&apos;iroqni yuklang</p>
            )}
            {!showArchived && isAdmin && <UploadCallModal managers={managers} />}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fayl nomi</th>
                  <th>Manager</th>
                  <th>Telefon</th>
                  <th style={{ width: 70 }}>Davom.</th>
                  <th style={{ width: 100 }}>Kategoriya</th>
                  <th style={{ width: 70 }}>Ball</th>
                  <th style={{ width: 110 }}>Holati</th>
                  <th style={{ width: 120 }}>Tahlil vaqti</th>
                  <th style={{ width: 90 }}></th>
                </tr>
              </thead>
              <tbody>
                {calls.map(call => {
                  const displayScore = call.score ?? (call.rating ? Math.round(call.rating * 20) : null)
                  return (
                    <tr key={call.id} className="group">
                      <td>
                        <div className="flex items-center gap-2">
                          <svg className="text-text-muted flex-shrink-0" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" />
                          </svg>
                          <span className="font-mono text-xs text-text-secondary max-w-[140px] truncate">
                            {call.audioFileName}
                          </span>
                        </div>
                      </td>
                      <td>
                        <Link href={`/managers/${call.managerId}`} className="flex items-center gap-1.5 hover:text-brand-orange transition-colors">
                          <div className="w-5 h-5 rounded-full bg-brand-orange-dim border border-brand-orange-muted flex items-center justify-center text-[9px] font-bold text-brand-orange flex-shrink-0">
                            {call.manager.name.charAt(0)}
                          </div>
                          <span className="text-xs text-text-primary truncate max-w-[90px]">{call.manager.name}</span>
                        </Link>
                      </td>
                      <td>
                        <span className="font-mono text-xs text-text-muted">{call.clientPhone || '—'}</span>
                      </td>
                      <td>
                        <span className="font-mono text-xs text-text-muted">{formatDuration(call.duration)}</span>
                      </td>
                      <td>
                        {call.category ? (
                          <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ background: `${call.category.color}18`, color: call.category.color }}>
                            {call.category.name}
                          </span>
                        ) : <span className="text-xs text-text-muted">—</span>}
                      </td>
                      <td>
                        {displayScore != null ? (
                          <span
                            className="font-mono text-sm font-semibold px-2 py-0.5 rounded"
                            style={{ color: scoreColor(displayScore), background: scoreBg(displayScore) }}
                          >
                            {displayScore}
                          </span>
                        ) : <span className="text-xs text-text-muted">—</span>}
                      </td>
                      <td>
                        {call.callOutcome ? (
                          <span className={`badge badge-${
                            call.callOutcome === 'sale' ? 'success' :
                            call.callOutcome === 'followup' ? 'info' :
                            call.callOutcome === 'rejected' ? 'danger' : 'neutral'
                          }`}>
                            {call.callOutcome === 'sale' ? 'Sotildi' :
                             call.callOutcome === 'followup' ? 'Davom' :
                             call.callOutcome === 'rejected' ? 'Rad' : "Noma'lum"}
                          </span>
                        ) : (
                          <span className={`badge ${call.status === 'pending' ? 'badge-warning' : call.status === 'analyzing' ? 'badge-info' : 'badge-neutral'}`}>
                            {call.status === 'pending' ? 'Kutmoqda' : call.status === 'analyzing' ? 'Tahlillanmoqda' : "Noma'lum"}
                          </span>
                        )}
                      </td>
                      <td>
                        <span className="font-mono text-2xs text-text-muted">
                          {call.analyzedAt ? format(new Date(call.analyzedAt), 'dd.MM HH:mm') :
                           format(new Date(call.createdAt), 'dd.MM HH:mm')}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-1 justify-end">
                          <Link
                            href={`/calls/${call.id}`}
                            className="w-7 h-7 flex items-center justify-center rounded text-text-muted hover:text-brand-orange hover:bg-brand-orange-dim transition-colors"
                            title="Ko'rish"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                            </svg>
                          </Link>
                          <ArchiveCallButton callId={call.id} isArchived={!!call.archivedAt} />
                          {isAdmin && <DeleteCallButton callId={call.id} />}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
