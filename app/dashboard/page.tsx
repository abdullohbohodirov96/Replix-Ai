import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { format, startOfDay, startOfWeek, startOfMonth } from 'date-fns'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Suspense } from 'react'
import DashboardFilters from './DashboardFilters'
import UploadCallModal from '@/components/UploadCallModal'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function scoreColor(score: number | null) {
  if (!score) return '#4a4a70'
  if (score < 40) return '#ef4444'
  if (score < 70) return '#f59e0b'
  if (score < 90) return '#22c55e'
  return '#f97316'
}

function getDateFilter(period: string | undefined) {
  if (period === 'today') return { gte: startOfDay(new Date()) }
  if (period === 'week') return { gte: startOfWeek(new Date(), { weekStartsOn: 1 }) }
  if (period === 'month') return { gte: startOfMonth(new Date()) }
  return undefined
}

const OutcomeBadge = ({ outcome }: { outcome: string | null }) => {
  const map: Record<string, { label: string; cls: string }> = {
    sale: { label: 'Sotildi', cls: 'badge-success' },
    followup: { label: 'Davom', cls: 'badge-info' },
    rejected: { label: 'Rad', cls: 'badge-danger' },
    unknown: { label: "Noma'lum", cls: 'badge-neutral' },
  }
  const o = map[outcome || 'unknown'] || map['unknown']
  return <span className={`badge ${o.cls}`}>{o.label}</span>
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { period?: string; managerId?: string }
}) {
  const session = await getServerSession(authOptions)
  const sessionUser = session?.user as { role?: string; managerId?: string | null } | undefined
  const isAdmin = sessionUser?.role === 'admin'
  const filterManagerId = isAdmin ? searchParams.managerId || undefined : sessionUser?.managerId || undefined

  const dateFilter = getDateFilter(searchParams.period)
  const where = {
    ...(dateFilter ? { createdAt: dateFilter } : {}),
    ...(filterManagerId ? { managerId: filterManagerId } : {}),
    archivedAt: null,
  }

  const [managers, allCalls, categories, recentCalls] = await Promise.all([
    prisma.manager.findMany({
      where: filterManagerId ? { id: filterManagerId } : undefined,
      include: {
        calls: {
          where: dateFilter ? { createdAt: dateFilter, archivedAt: null } : { archivedAt: null },
          select: { rating: true, callOutcome: true, score: true },
        },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.call.findMany({
      where,
      select: { rating: true, callOutcome: true, score: true, categoryId: true, leadQuality: true },
    }),
    prisma.callCategory.findMany({ orderBy: { order: 'asc' } }),
    prisma.call.findMany({
      where,
      take: 8,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, createdAt: true, rating: true, score: true, callOutcome: true, summary: true,
        manager: { select: { id: true, name: true } },
        category: { select: { name: true, color: true } },
      },
    }),
  ])

  const ratedCalls = allCalls.filter(c => c.rating)
  const scoredCalls = allCalls.filter(c => c.score)
  const avgRating = ratedCalls.length > 0 ? ratedCalls.reduce((s, c) => s + (c.rating || 0), 0) / ratedCalls.length : 0
  const avgScore = scoredCalls.length > 0 ? scoredCalls.reduce((s, c) => s + (c.score || 0), 0) / scoredCalls.length : 0
  const salesCount = allCalls.filter(c => c.callOutcome === 'sale').length
  const salesRate = allCalls.length > 0 ? Math.round((salesCount / allCalls.length) * 100) : 0

  const catBreakdown = categories.map(cat => ({
    ...cat,
    count: allCalls.filter(c => c.categoryId === cat.id).length,
  })).filter(c => c.count > 0)
  const uncategorized = allCalls.filter(c => !c.categoryId).length

  const managerStats = managers.map(m => {
    const calls = m.calls
    const rated = calls.filter(c => c.rating)
    const scored = calls.filter(c => c.score)
    return {
      id: m.id,
      name: m.name,
      count: calls.length,
      avgRating: rated.length > 0 ? rated.reduce((s, c) => s + (c.rating || 0), 0) / rated.length : 0,
      avgScore: scored.length > 0 ? scored.reduce((s, c) => s + (c.score || 0), 0) / scored.length : 0,
      salesRate: calls.length > 0 ? Math.round((calls.filter(c => c.callOutcome === 'sale').length / calls.length) * 100) : 0,
    }
  }).sort((a, b) => b.avgScore - a.avgScore || b.count - a.count)

  const maxScore = Math.max(...managerStats.map(m => m.avgScore), 1)

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs text-text-muted font-mono mb-1">{format(new Date(), 'dd MMM yyyy, HH:mm')}</p>
          <h1 className="text-2xl font-bold text-text-primary">Bosh panel</h1>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {isAdmin && (
            <Suspense fallback={null}>
              <DashboardFilters
                managers={managers.map(m => ({ id: m.id, name: m.name }))}
                currentPeriod={searchParams.period}
                currentManagerId={searchParams.managerId}
              />
            </Suspense>
          )}
          {isAdmin && <UploadCallModal managers={managers} />}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: "Qo'ng'iroqlar", value: String(allCalls.length), sub: `Bugun: ${allCalls.length}`, color: '#f97316' },
          { label: "O'rtacha baho", value: avgRating > 0 ? avgRating.toFixed(1) : '—', sub: 'dan 5.0', color: '#f59e0b' },
          { label: "O'rtacha ball", value: avgScore > 0 ? Math.round(avgScore).toString() : '—', sub: 'dan 100', color: scoreColor(avgScore || null) },
          { label: 'Sotilgan', value: String(salesCount), sub: `${salesRate}% konversiya`, color: '#22c55e' },
        ].map(stat => (
          <div key={stat.label} className="metric-card">
            <div className="metric-value" style={{ color: stat.color }}>{stat.value}</div>
            <div className="metric-label">{stat.label}</div>
            <div style={{ fontSize: 10, color: '#4a4a70', marginTop: 2 }}>{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* Recent calls */}
        <div className="xl:col-span-2 card overflow-hidden">
          <div className="px-4 py-3 border-b border-bg-border flex items-center justify-between">
            <span className="text-sm font-semibold text-text-primary">So&apos;nggi qo&apos;ng&apos;iroqlar</span>
            <Link href="/calls" className="text-xs text-text-muted hover:text-brand-orange transition-colors">Barchasi &rarr;</Link>
          </div>
          {recentCalls.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-text-muted">Qo&apos;ng&apos;iroqlar yo&apos;q</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Manager</th>
                  <th>Sana</th>
                  <th>Kategoriya</th>
                  <th>Ball</th>
                  <th>Natija</th>
                </tr>
              </thead>
              <tbody>
                {recentCalls.map(call => (
                  <tr key={call.id} className="group">
                    <td>
                      <Link href={`/calls/${call.id}`} className="flex items-center gap-2 hover:text-brand-orange transition-colors">
                        <div className="w-6 h-6 rounded-full bg-brand-orange-dim border border-brand-orange-muted flex items-center justify-center text-[10px] font-bold text-brand-orange flex-shrink-0">
                          {call.manager.name.charAt(0)}
                        </div>
                        <span className="text-sm text-text-primary truncate max-w-[100px]">{call.manager.name}</span>
                      </Link>
                    </td>
                    <td>
                      <span className="font-mono text-xs text-text-muted">{format(new Date(call.createdAt), 'dd.MM HH:mm')}</span>
                    </td>
                    <td>
                      {call.category ? (
                        <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: `${call.category.color}20`, color: call.category.color }}>
                          {call.category.name}
                        </span>
                      ) : <span className="text-xs text-text-muted">—</span>}
                    </td>
                    <td>
                      {call.score != null ? (
                        <span className="font-mono text-sm font-semibold" style={{ color: scoreColor(call.score) }}>
                          {Math.round(call.score)}
                        </span>
                      ) : call.rating != null ? (
                        <span className="font-mono text-sm font-semibold" style={{ color: scoreColor(call.rating * 20) }}>
                          {(call.rating * 20).toFixed(0)}
                        </span>
                      ) : <span className="text-xs text-text-muted">—</span>}
                    </td>
                    <td><OutcomeBadge outcome={call.callOutcome} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Manager leaderboard */}
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-bg-border flex items-center justify-between">
            <span className="text-sm font-semibold text-text-primary">Managerlar reytingi</span>
            <Link href="/managers" className="text-xs text-text-muted hover:text-brand-orange transition-colors">Barchasi &rarr;</Link>
          </div>
          {managerStats.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-text-muted">Manager yo&apos;q</p>
            </div>
          ) : (
            <div>
              {managerStats.map((mgr, idx) => (
                <Link key={mgr.id} href={`/managers/${mgr.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-bg-elevated transition-colors border-b border-bg-border last:border-0">
                  <span className="font-mono text-xs text-text-muted w-4 flex-shrink-0">{idx + 1}</span>
                  <div className="w-7 h-7 rounded-full bg-brand-orange-dim border border-brand-orange-muted flex items-center justify-center text-[11px] font-bold text-brand-orange flex-shrink-0">
                    {mgr.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-text-primary truncate">{mgr.name}</div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className="bar-track flex-1">
                        <div className="bar-fill" style={{ width: `${(mgr.avgScore / maxScore) * 100}%`, background: scoreColor(mgr.avgScore) }} />
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="font-mono text-sm font-semibold" style={{ color: scoreColor(mgr.avgScore) }}>
                      {mgr.avgScore > 0 ? Math.round(mgr.avgScore) : '—'}
                    </span>
                    <div className="font-mono text-2xs text-text-muted mt-0.5">{mgr.count} ta</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Category breakdown */}
      {(catBreakdown.length > 0 || uncategorized > 0) && (
        <div className="card p-4">
          <div className="section-title mb-3">Kategoriya bo&apos;yicha qo&apos;ng&apos;iroqlar</div>
          <div className="space-y-2">
            {catBreakdown.map(cat => (
              <div key={cat.id} className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cat.color }} />
                <span className="text-sm text-text-secondary w-28 truncate flex-shrink-0">{cat.name}</span>
                <div className="bar-track flex-1">
                  <div className="bar-fill" style={{ width: allCalls.length > 0 ? `${(cat.count / allCalls.length) * 100}%` : '0%', background: cat.color }} />
                </div>
                <span className="font-mono text-xs text-text-muted w-10 text-right flex-shrink-0">{cat.count}</span>
              </div>
            ))}
            {uncategorized > 0 && (
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full flex-shrink-0 bg-bg-elevated" />
                <span className="text-sm text-text-muted w-28 flex-shrink-0">Kategoriyasiz</span>
                <div className="bar-track flex-1">
                  <div className="bar-fill" style={{ width: allCalls.length > 0 ? `${(uncategorized / allCalls.length) * 100}%` : '0%', background: '#1e1e30' }} />
                </div>
                <span className="font-mono text-xs text-text-muted w-10 text-right flex-shrink-0">{uncategorized}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
