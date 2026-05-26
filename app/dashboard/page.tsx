import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { format } from 'date-fns'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getDashboardStats() {
  const [totalManagers, totalCalls, recentCalls, managers] = await Promise.all([
    prisma.manager.count(),
    prisma.call.count(),
    prisma.call.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, callOutcome: true, rating: true, summary: true, createdAt: true,
        manager: { select: { id: true, name: true } },
      },
    }),
    prisma.manager.findMany({
      include: {
        calls: {
          select: { rating: true, callOutcome: true },
        },
      },
      take: 5,
    }),
  ])

  const avgRating = await prisma.call.aggregate({
    _avg: { rating: true },
  })

  const todayCalls = await prisma.call.count({
    where: {
      createdAt: {
        gte: new Date(new Date().setHours(0, 0, 0, 0)),
      },
    },
  })

  return { totalManagers, totalCalls, recentCalls, avgRating, todayCalls, managers }
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

function RatingDisplay({ rating }: { rating: number | null }) {
  if (!rating) return <span className="font-data text-text-muted text-xs">—</span>
  const score = rating.toFixed(1)
  const colorClass =
    rating >= 4.5 ? 'text-status-success' :
    rating >= 3.5 ? 'text-status-warning' :
    'text-status-danger'
  return (
    <span className={`font-data text-sm font-medium ${colorClass}`}>{score}</span>
  )
}

function ManagerAvatar({ name, size = 8 }: { name: string; size?: number }) {
  const initial = name.charAt(0).toUpperCase()
  const sizeClass = size === 8 ? 'w-8 h-8 text-xs' : 'w-7 h-7 text-[11px]'
  return (
    <div className={`${sizeClass} rounded-full bg-brand-orange-dim border border-brand-orange-muted flex items-center justify-center font-semibold text-brand-orange flex-shrink-0`}>
      {initial}
    </div>
  )
}

const IconUsers = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
)

const IconPhone = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.85a16 16 0 0 0 6.29 6.29l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7a2 2 0 0 1 1.72 2.03z" />
  </svg>
)

const IconCalendar = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
)

const IconStar = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
)

const IconUpload = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
)

const IconArrowRight = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
)

export default async function DashboardPage() {
  const { totalManagers, totalCalls, recentCalls, avgRating, todayCalls, managers } =
    await getDashboardStats()

  const statCards = [
    {
      label: 'Jami Managerlar',
      value: String(totalManagers),
      icon: <IconUsers />,
      iconColor: 'text-blue-400',
      iconBg: 'bg-blue-500/10',
    },
    {
      label: "Jami Qo'ng'iroqlar",
      value: String(totalCalls),
      icon: <IconPhone />,
      iconColor: 'text-brand-orange',
      iconBg: 'bg-brand-orange-dim',
    },
    {
      label: 'Bugungi',
      value: String(todayCalls),
      icon: <IconCalendar />,
      iconColor: 'text-violet-400',
      iconBg: 'bg-violet-500/10',
    },
    {
      label: "O'rtacha Baho",
      value: avgRating._avg.rating ? avgRating._avg.rating.toFixed(1) : '—',
      icon: <IconStar />,
      iconColor: 'text-amber-400',
      iconBg: 'bg-amber-500/10',
    },
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-up">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xs font-data text-text-muted uppercase tracking-widest">
              {format(new Date(), 'dd MMM yyyy')}
            </span>
          </div>
          <h1 className="text-2xl font-display font-bold text-text-primary tracking-tight">
            Bosh Panel
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Dunyabunya savdo platformasi — AI tahlili
          </p>
        </div>
        <Link
          href="/calls"
          className="flex items-center gap-2 px-4 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white text-sm font-medium rounded-md transition-colors shadow-orange-sm"
        >
          <IconUpload />
          Qo'ng'iroq Yuklash
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="stat-card">
            <div className="flex items-start justify-between mb-4">
              <div className={`p-2 rounded-md ${card.iconBg} ${card.iconColor}`}>
                {card.icon}
              </div>
            </div>
            <div className="font-data text-3xl font-medium text-text-primary tracking-tight leading-none">
              {card.value}
            </div>
            <div className="text-xs text-text-secondary mt-2 font-medium">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* Recent calls */}
        <div className="xl:col-span-2 card overflow-hidden">
          <div className="section-header">
            <h2>So'nggi Qo'ng'iroqlar</h2>
            <Link
              href="/calls"
              className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors"
            >
              Barchasi
              <IconArrowRight />
            </Link>
          </div>

          {recentCalls.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="w-12 h-12 rounded-full bg-bg-elevated flex items-center justify-center mb-4 text-text-muted">
                <IconPhone />
              </div>
              <p className="text-sm font-medium text-text-secondary mb-1">
                Hali qo'ng'iroqlar yuklenmagan
              </p>
              <p className="text-xs text-text-muted mb-4">
                Birinchi audio qo'ng'iroqni yuklang va AI tahlilini oling
              </p>
              <Link
                href="/calls"
                className="text-xs text-brand-orange hover:text-brand-orange-hover transition-colors font-medium"
              >
                Yuklashni boshlash
              </Link>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Manager</th>
                  <th>Sana</th>
                  <th>Natija</th>
                  <th>Baho</th>
                  <th>Xulosa</th>
                </tr>
              </thead>
              <tbody>
                {recentCalls.map((call) => (
                  <tr key={call.id}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <ManagerAvatar name={call.manager.name} size={7} />
                        <Link
                          href={`/calls/${call.id}`}
                          className="text-sm font-medium text-text-primary hover:text-brand-orange transition-colors"
                        >
                          {call.manager.name}
                        </Link>
                      </div>
                    </td>
                    <td>
                      <span className="font-data text-xs text-text-muted">
                        {format(new Date(call.createdAt), 'dd.MM HH:mm')}
                      </span>
                    </td>
                    <td>
                      <OutcomeBadge outcome={call.callOutcome} />
                    </td>
                    <td>
                      <RatingDisplay rating={call.rating} />
                    </td>
                    <td className="max-w-[180px]">
                      {call.summary ? (
                        <p className="text-xs text-text-secondary line-clamp-1">{call.summary}</p>
                      ) : (
                        <span className="text-xs text-text-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Manager leaderboard */}
        <div className="card overflow-hidden">
          <div className="section-header">
            <h2>Managerlar</h2>
            <Link
              href="/managers"
              className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors"
            >
              Barchasi
              <IconArrowRight />
            </Link>
          </div>

          {managers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="w-12 h-12 rounded-full bg-bg-elevated flex items-center justify-center mb-4 text-text-muted">
                <IconUsers />
              </div>
              <p className="text-sm text-text-secondary">Manager qo'shilmagan</p>
            </div>
          ) : (
            <div>
              {managers.map((mgr, idx) => {
                const avg = mgr.calls.length > 0
                  ? mgr.calls.reduce((s, c) => s + (c.rating || 0), 0) / mgr.calls.length
                  : 0
                const sales = mgr.calls.filter(c => c.callOutcome === 'sale').length
                const perfPct = mgr.calls.length > 0
                  ? Math.round((sales / mgr.calls.length) * 100)
                  : 0

                return (
                  <Link
                    key={mgr.id}
                    href={`/managers/${mgr.id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-bg-hover transition-colors border-b border-bg-border last:border-0"
                  >
                    <span className="font-data text-xs text-text-muted w-5 text-center flex-shrink-0">
                      {idx + 1}
                    </span>
                    <ManagerAvatar name={mgr.name} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-text-primary truncate">{mgr.name}</div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <div className="progress-bar flex-1">
                          <div
                            className="progress-fill bg-brand-orange"
                            style={{ width: `${perfPct}%` }}
                          />
                        </div>
                        <span className="font-data text-2xs text-text-muted w-8 text-right flex-shrink-0">
                          {perfPct}%
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <RatingDisplay rating={avg > 0 ? avg : null} />
                      <div className="font-data text-2xs text-text-muted mt-0.5">{mgr.calls.length} ta</div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
