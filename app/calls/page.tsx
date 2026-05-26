import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { format } from 'date-fns'
import UploadCallModal from '@/components/UploadCallModal'
import DeleteCallButton from '@/components/DeleteCallButton'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getCalls(managerId?: string | null) {
  return prisma.call.findMany({
    where: managerId ? { managerId } : undefined,
    select: {
      id: true, managerId: true, audioFileName: true, rating: true,
      callOutcome: true, clientSentiment: true, summary: true, createdAt: true,
      manager: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

async function getManagers(managerId?: string | null) {
  return prisma.manager.findMany({
    where: managerId ? { id: managerId } : undefined,
    orderBy: { name: 'asc' },
  })
}

function RatingDisplay({ rating }: { rating: number | null }) {
  if (!rating) return <span className="font-data text-xs text-text-muted">—</span>
  const colorClass =
    rating >= 4.5 ? 'text-status-success' :
    rating >= 3.5 ? 'text-status-warning' :
    'text-status-danger'
  return (
    <span className={`font-data text-sm font-medium ${colorClass}`}>
      {rating.toFixed(1)}
    </span>
  )
}

function OutcomeBadge({ outcome }: { outcome: string | null }) {
  const map: Record<string, { label: string; cls: string }> = {
    sale:     { label: 'Sotildi',    cls: 'badge-success' },
    followup: { label: 'Davom',      cls: 'badge-info' },
    rejected: { label: 'Rad etildi', cls: 'badge-danger' },
    unknown:  { label: "Noma'lum",   cls: 'badge-neutral' },
  }
  const o = map[outcome || 'unknown'] || map['unknown']
  return <span className={`badge ${o.cls}`}>{o.label}</span>
}

function SentimentBadge({ sentiment }: { sentiment: string | null }) {
  if (!sentiment) return <span className="text-text-muted text-xs">—</span>
  const map: Record<string, { label: string; cls: string }> = {
    positive: { label: 'Ijobiy', cls: 'badge-success' },
    negative: { label: 'Salbiy', cls: 'badge-danger' },
    neutral:  { label: 'Neytral', cls: 'badge-neutral' },
  }
  const s = map[sentiment] || map['neutral']
  return <span className={`badge ${s.cls}`}>{s.label}</span>
}

const IconPhone = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.85a16 16 0 0 0 6.29 6.29l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7a2 2 0 0 1 1.72 2.03z" />
  </svg>
)

const IconPlay = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
)

const IconEye = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

export default async function CallsPage() {
  const session = await getServerSession(authOptions)
  const sessionUser = session?.user as { role?: string; managerId?: string | null } | undefined
  const isAdmin = sessionUser?.role === 'admin'
  const filterManagerId = isAdmin ? null : sessionUser?.managerId
  const [calls, managers] = await Promise.all([getCalls(filterManagerId), getManagers(filterManagerId)])

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-up">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-text-primary tracking-tight">
            Qo'ng'iroqlar
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Jami <span className="font-data text-text-primary">{calls.length}</span> ta qo'ng'iroq
          </p>
        </div>
        {isAdmin && <UploadCallModal managers={managers} />}
      </div>

      {/* Table card */}
      <div className="card overflow-hidden">
        {calls.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="w-14 h-14 rounded-full bg-bg-elevated flex items-center justify-center mb-4 text-text-muted">
              <IconPhone />
            </div>
            <h3 className="text-base font-semibold text-text-primary mb-1">
              Qo'ng'iroqlar yo'q
            </h3>
            <p className="text-sm text-text-secondary mb-5 max-w-xs">
              Birinchi audio qo'ng'iroqni yuklang va AI tahlilini oling
            </p>
            {isAdmin && <UploadCallModal managers={managers} />}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '120px' }}>Sana</th>
                  <th style={{ width: '160px' }}>Manager</th>
                  <th style={{ width: '140px' }}>Fayl</th>
                  <th style={{ width: '72px' }}>Baho</th>
                  <th style={{ width: '110px' }}>Natija</th>
                  <th style={{ width: '100px' }}>Mijoz</th>
                  <th>Xulosa</th>
                  <th style={{ width: '72px' }}></th>
                </tr>
              </thead>
              <tbody>
                {calls.map(call => (
                  <tr key={call.id} className="group">
                    <td>
                      <div className="font-data text-xs text-text-secondary">
                        {format(new Date(call.createdAt), 'dd.MM.yyyy')}
                      </div>
                      <div className="font-data text-2xs text-text-muted mt-0.5">
                        {format(new Date(call.createdAt), 'HH:mm')}
                      </div>
                    </td>
                    <td>
                      <Link href={`/managers/${call.managerId}`} className="flex items-center gap-2 hover:text-brand-orange transition-colors">
                        <div className="w-6 h-6 rounded-full bg-brand-orange-dim border border-brand-orange-muted flex items-center justify-center text-[11px] font-semibold text-brand-orange flex-shrink-0">
                          {call.manager.name.charAt(0)}
                        </div>
                        <span className="text-sm font-medium text-text-primary group-hover:text-brand-orange transition-colors truncate">
                          {call.manager.name}
                        </span>
                      </Link>
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <button
                          className="w-6 h-6 rounded flex items-center justify-center text-text-muted hover:text-brand-orange hover:bg-brand-orange-dim transition-colors opacity-0 group-hover:opacity-100"
                          title="Audio tinglash"
                        >
                          <IconPlay />
                        </button>
                        <span className="font-data text-xs text-text-muted max-w-[100px] truncate">
                          {call.audioFileName || '—'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <RatingDisplay rating={call.rating} />
                    </td>
                    <td>
                      <OutcomeBadge outcome={call.callOutcome} />
                    </td>
                    <td>
                      <SentimentBadge sentiment={call.clientSentiment} />
                    </td>
                    <td>
                      {call.summary ? (
                        <p className="text-xs text-text-secondary line-clamp-2 max-w-[220px]">
                          {call.summary}
                        </p>
                      ) : (
                        <span className="text-xs text-text-muted italic">Tahlil yo'q</span>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <Link
                          href={`/calls/${call.id}`}
                          className="w-7 h-7 flex items-center justify-center rounded text-text-muted hover:text-brand-orange hover:bg-brand-orange-dim transition-colors"
                          title="Ko'rish"
                        >
                          <IconEye />
                        </Link>
                        <DeleteCallButton callId={call.id} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
