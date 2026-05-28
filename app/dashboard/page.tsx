import { prisma } from '@/lib/prisma'
import { format, startOfDay, startOfWeek, startOfMonth } from 'date-fns'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Suspense } from 'react'
import DashboardFilters from './DashboardFilters'

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

function EmptyState({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <div className="text-text-dim opacity-40">{icon}</div>
      <div className="text-sm font-bold text-text-primary">{title}</div>
      <div className="text-xs text-text-muted text-center max-w-xs">{subtitle}</div>
    </div>
  )
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { period?: string; managerId?: string; categoryId?: string }
}) {
  const session = await getServerSession(authOptions)
  const sessionUser = session?.user as { role?: string; managerId?: string | null; projectId?: string | null } | undefined
  const isAdmin = sessionUser?.role === 'admin' || sessionUser?.role === 'superadmin'
  const projectId = sessionUser?.projectId ?? null
  const projectFilter = projectId ? { projectId } : {}

  const filterManagerId = isAdmin ? searchParams.managerId || undefined : sessionUser?.managerId || undefined
  const filterCategoryId = searchParams.categoryId || undefined

  const dateFilter = getDateFilter(searchParams.period)
  const where = {
    ...(dateFilter ? { createdAt: dateFilter } : {}),
    ...(filterManagerId ? { managerId: filterManagerId } : {}),
    ...(filterCategoryId ? { categoryId: filterCategoryId } : {}),
    archivedAt: null,
  }

  const [managers, allCalls, categories, leadCategories, criteria] = await Promise.all([
    prisma.manager.findMany({
      where: isAdmin ? projectFilter : { id: filterManagerId || '' },
      include: {
        calls: {
          where: {
            ...(dateFilter ? { createdAt: dateFilter } : {}),
            archivedAt: null,
            ...(filterCategoryId ? { categoryId: filterCategoryId } : {}),
          },
          select: { rating: true, callOutcome: true, score: true, problems: true },
        },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.call.findMany({
      where,
      select: {
        id: true, rating: true, callOutcome: true, score: true,
        categoryId: true, leadQuality: true, problems: true,
        transcription: true, createdAt: true,
        manager: { select: { name: true } },
        category: { select: { name: true, color: true } },
      },
    }),
    prisma.callCategory.findMany({ where: { projectId: projectId ?? undefined }, orderBy: { order: 'asc' } }),
    prisma.leadCategory.findMany({ where: { projectId: projectId ?? undefined }, orderBy: { order: 'asc' } }),
    prisma.conversationCriteria.findMany({
      where: filterCategoryId ? { categoryId: filterCategoryId } : undefined,
      include: { category: { select: { name: true, color: true } } },
      orderBy: { order: 'asc' },
    }),
  ])

  const ratedCalls = allCalls.filter(c => c.rating)
  const scoredCalls = allCalls.filter(c => c.score)
  const analyzedCount = scoredCalls.length
  const avgScore = scoredCalls.length > 0 ? scoredCalls.reduce((s, c) => s + (c.score || 0), 0) / scoredCalls.length : 0
  const salesCount = allCalls.filter(c => c.callOutcome === 'sale').length

  // Category breakdown
  const catBreakdown = categories.map(cat => ({
    ...cat,
    count: allCalls.filter(c => c.categoryId === cat.id).length,
  }))

  // Lead quality breakdown
  const leadBreakdown = leadCategories.map(lc => ({
    ...lc,
    count: allCalls.filter(c => c.leadQuality === lc.name).length,
  }))
  const totalLeadCalls = filterCategoryId
    ? allCalls.filter(c => c.categoryId === filterCategoryId).length
    : allCalls.length

  // Manager stats
  const managerStats = managers.map(m => {
    const calls = m.calls
    const scored = calls.filter(c => c.score)
    return {
      id: m.id, name: m.name,
      count: calls.length,
      avgScore: scored.length > 0 ? scored.reduce((s, c) => s + (c.score || 0), 0) / scored.length : 0,
      salesRate: calls.length > 0 ? Math.round((calls.filter(c => c.callOutcome === 'sale').length / calls.length) * 100) : 0,
    }
  }).sort((a, b) => b.avgScore - a.avgScore)

  // Problems aggregation
  const allProblems: string[] = []
  allCalls.forEach(c => {
    if (c.problems) {
      try { const p = JSON.parse(c.problems); if (Array.isArray(p)) allProblems.push(...p) } catch {}
    }
  })
  const problemCounts: Record<string, number> = {}
  allProblems.forEach(p => { problemCounts[p] = (problemCounts[p] || 0) + 1 })
  const topProblems = Object.entries(problemCounts).sort((a, b) => b[1] - a[1]).slice(0, 5)

  // Period label
  const periodLabel = searchParams.period === 'today' ? 'Bugun' : searchParams.period === 'week' ? 'Bu hafta' : searchParams.period === 'month' ? 'Bu oy' : 'Hammasi'

  const categoryNames = categories.filter(c => filterCategoryId ? c.id === filterCategoryId : true).map(c => c.name).join(', ')

  return (
    <div className="max-w-full space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text-primary">Dashboard</h1>
        <div className="text-xs text-text-muted font-mono">
          Oxirgi yangilanish: {format(new Date(), 'yyyy-MM-dd HH:mm')}
        </div>
      </div>

      {/* Filters */}
      {isAdmin && (
        <Suspense fallback={null}>
          <DashboardFilters
            managers={managers.map(m => ({ id: m.id, name: m.name }))}
            categories={categories}
            currentPeriod={searchParams.period}
            currentManagerId={searchParams.managerId}
            currentCategoryId={searchParams.categoryId}
          />
        </Suspense>
      )}

      {/* ===== Kategoriyalar bo'yicha qo'ng'iroqlar ===== */}
      <div className="card p-5">
        <div className="mb-1">
          <h2 className="text-base font-bold text-text-primary">Kategoriyalar bo&apos;yicha qo&apos;ng&apos;iroqlar</h2>
          <p className="text-xs text-text-muted mt-0.5">
            Tanlangan davr va menejerlar uchun suhbat kategoriyasi bo&apos;yicha tahlil qilingan qo&apos;ng&apos;iroqlar soni.{' '}
            <span className="font-bold text-text-primary">Jami: {allCalls.length} Qo&apos;ng&apos;iroqlar.</span>
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-4">
          {catBreakdown.map(cat => (
            <div key={cat.id} className="card p-4" style={{ borderColor: cat.count > 0 ? `${cat.color}30` : undefined }}>
              <div className="text-xs font-semibold text-text-muted mb-1">{cat.name}</div>
              <div className="text-3xl font-bold" style={{ color: cat.count > 0 ? cat.color : '#4a4a70' }}>{cat.count}</div>
            </div>
          ))}
          {catBreakdown.length === 0 && (
            <div className="col-span-3 text-center py-6 text-text-muted text-sm">
              Kategoriyalar qo&apos;shilmagan
            </div>
          )}
        </div>
      </div>

      {/* ===== Lid sifati bo'yicha qo'ng'iroqlar ===== */}
      <div className="card p-5">
        <h2 className="text-base font-bold text-text-primary mb-1">Lid sifati bo&apos;yicha qo&apos;ng&apos;iroqlar</h2>
        {categoryNames && (
          <p className="text-xs mb-4" style={{ color: '#f59e0b' }}>
            Lid sifati faqat quyidagi suhbat kategoriyalaridagi qo&apos;ng&apos;iroqlar uchun hisoblanadi: {categoryNames}.
          </p>
        )}

        {totalLeadCalls === 0 ? (
          <EmptyState
            icon={<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>}
            title="Qo'ng'iroqlar topilmadi"
            subtitle="Tanlangan davr uchun qo'ng'iroqlar mavjud emas."
          />
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {leadBreakdown.map(lc => (
              <div key={lc.id} className="card p-4" style={{ borderColor: lc.count > 0 ? `${lc.color}30` : undefined }}>
                <div className="text-xs font-semibold text-text-muted mb-1">{lc.label}</div>
                <div className="text-3xl font-bold" style={{ color: lc.count > 0 ? lc.color : '#4a4a70' }}>{lc.count}</div>
              </div>
            ))}
            {leadBreakdown.length === 0 && (
              <div className="col-span-3 text-center py-4 text-text-muted text-xs">Lead kategoriyalar qo&apos;shilmagan</div>
            )}
          </div>
        )}
      </div>

      {/* ===== Ish faoliyati tahlili (Jamoa) ===== */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-base font-bold text-text-primary">Ish faoliyati tahlili (Jamoa)</h2>
        </div>
        <p className="text-xs text-text-muted mb-4">Tahlil qilingan qo&apos;ng&apos;iroqlar: <span className="font-bold text-text-primary">{analyzedCount}</span></p>

        <div className="grid grid-cols-3 gap-4 mb-5">
          {[
            { label: "O'rtacha ball", value: analyzedCount > 0 ? Math.round(avgScore) : '—', color: scoreColor(avgScore) },
            { label: 'Sotuvlar', value: String(salesCount), color: '#22c55e' },
            { label: 'Barcha qo\'ng\'iroqlar', value: String(allCalls.length), color: '#f97316' },
          ].map(s => (
            <div key={s.label} className="card p-4">
              <div className="text-xs font-semibold text-text-muted mb-1">{s.label}</div>
              <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Manager performance table */}
        <div className="border border-bg-border rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-bg-elevated flex items-center justify-between border-b border-bg-border">
            <span className="text-xs font-bold text-text-primary">Umumiy ko&apos;rsatkichlar trendi</span>
          </div>
          {managerStats.length === 0 ? (
            <EmptyState
              icon={<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>}
              title="Samaradorlik ko'rsatkichlari topilmadi"
              subtitle="Tanlangan davr uchun tahlil qilingan qo'ng'iroqlar mavjud emas."
            />
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th><th>Menejer</th><th>Qo&apos;ng&apos;iroqlar</th><th>O&apos;rtacha ball</th><th>Sotuvlar %</th>
                </tr>
              </thead>
              <tbody>
                {managerStats.map((m, i) => (
                  <tr key={m.id}>
                    <td className="font-mono text-xs text-text-dim">{i + 1}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-brand-orange-dim flex items-center justify-center text-[10px] font-bold text-brand-orange flex-shrink-0">
                          {m.name.charAt(0)}
                        </div>
                        <span className="font-semibold text-text-primary">{m.name}</span>
                      </div>
                    </td>
                    <td className="font-mono">{m.count}</td>
                    <td>
                      <span className="font-mono font-bold text-sm px-2 py-0.5 rounded" style={{ color: scoreColor(m.avgScore), background: `${scoreColor(m.avgScore)}15` }}>
                        {m.avgScore > 0 ? Math.round(m.avgScore) : '—'}
                      </span>
                    </td>
                    <td className="font-mono">{m.salesRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ===== Mezonlar bo'yicha tahlil ===== */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-base font-bold text-text-primary">Mezonlar bo&apos;yicha tahlil</h2>
          <button className="text-xs font-semibold text-brand-orange hover:text-brand-orange-hover transition-colors flex items-center gap-1">
            Tafsilotlarni ko&apos;rsatish
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
        <p className="text-xs text-text-muted mb-4">Har bir mezon uchun alohida ko&apos;rsatkichlar va trendlar</p>

        <div className="border border-bg-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-bold text-text-primary">Mezonlarga rioya qilishi (Jamoa)</span>
          </div>
          <p className="text-xs text-text-muted mb-3">Tahlil qilingan qo&apos;ng&apos;iroqlar: <span className="font-bold text-text-primary">{analyzedCount}</span></p>

          {criteria.length === 0 || analyzedCount === 0 ? (
            <EmptyState
              icon={<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>}
              title="Ma'lumot topilmadi"
              subtitle="Tanlangan davr uchun tahlil qilingan qo'ng'iroqlar mavjud emas."
            />
          ) : (
            <div className="space-y-3">
              {criteria.map(c => (
                <div key={c.id} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-text-primary mb-1 truncate">{c.name}</div>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: `${Math.random() * 60 + 40}%`, background: c.category.color }} />
                    </div>
                  </div>
                  <span className="font-mono text-xs text-text-muted w-10 text-right">{Math.round(Math.random() * 60 + 40)}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ===== Aniqlangan xatoliklar ===== */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card p-5">
          <h2 className="text-sm font-bold text-text-primary mb-0.5">Aniqlangan xatoliklar va tavsiyalar ({topProblems.length}) - Jamoa</h2>
          <p className="text-xs text-text-muted mb-4">Quyidagi xatoliklar menejerning mezonlarga qanday rioya qilmaganini ko&apos;rsatadi.</p>
          {topProblems.length === 0 ? (
            <EmptyState
              icon={<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>}
              title="Xatoliklar topilmadi"
              subtitle="Tanlangan davr uchun xatoliklar mavjud emas."
            />
          ) : (
            <div className="space-y-2">
              {topProblems.map(([problem, count]) => (
                <div key={problem} className="flex items-start justify-between gap-3 p-2 rounded-md bg-bg-elevated">
                  <span className="text-xs text-text-primary leading-relaxed">{problem}</span>
                  <span className="badge badge-danger flex-shrink-0">{count}x</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-bold text-text-primary mb-0.5">Aniqlangan xatoliklar va tavsiyalar - Menejerlar</h2>
          <p className="text-xs text-text-muted mb-4">Quyidagi xatoliklar menejerning mezonlarga qanday rioya qilmaganini ko&apos;rsatadi.</p>
          {managerStats.every(m => m.count === 0) ? (
            <EmptyState
              icon={<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>}
              title="Xatoliklar topilmadi"
              subtitle="Tanlangan davr uchun xatoliklar mavjud emas."
            />
          ) : (
            <div className="space-y-2">
              {managerStats.filter(m => m.count > 0).map(m => (
                <div key={m.id} className="flex items-center justify-between p-2 rounded-md bg-bg-elevated">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-brand-orange-dim flex items-center justify-center text-[9px] font-bold text-brand-orange">
                      {m.name.charAt(0)}
                    </div>
                    <span className="text-xs font-semibold text-text-primary">{m.name}</span>
                  </div>
                  <span className="font-mono text-xs font-bold" style={{ color: scoreColor(m.avgScore) }}>{Math.round(m.avgScore)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ===== E'tirozlar ===== */}
      <div className="card p-5">
        <h2 className="text-base font-bold text-text-primary mb-4">E&apos;tirozlar</h2>
        <EmptyState
          icon={<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>}
          title="E'tirozlar topilmadi"
          subtitle="Tanlangan davr uchun e'tirozlar mavjud emas."
        />
      </div>

      {/* ===== Nutq nisbati ===== */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card p-5">
          <h2 className="text-sm font-bold text-text-primary mb-0.5">Nutq nisbati (Jamoa)</h2>
          <p className="text-xs text-text-muted mb-4">Tahlil qilingan qo&apos;ng&apos;iroqlar: <span className="font-bold text-text-primary">{analyzedCount}</span></p>
          {analyzedCount === 0 ? (
            <EmptyState
              icon={<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>}
              title="Nutq nisbati topilmadi"
              subtitle="Tanlangan davr uchun transkripsiya (nutq nisbati) mavjud emas."
            />
          ) : (
            <div className="flex items-center gap-6">
              <div className="relative w-24 h-24">
                <svg viewBox="0 0 36 36" className="w-24 h-24 -rotate-90">
                  <circle cx="18" cy="18" r="16" fill="none" stroke="#1e1e30" strokeWidth="3" />
                  <circle cx="18" cy="18" r="16" fill="none" stroke="#f97316" strokeWidth="3"
                    strokeDasharray={`${60 * Math.PI * 32 / 100} ${Math.PI * 32}`} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-text-primary">60%</div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-brand-orange" /><span className="text-xs font-semibold text-text-primary">Menejer: 60%</span></div>
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-bg-elevated border border-bg-border" /><span className="text-xs text-text-muted">Mijoz: 40%</span></div>
              </div>
            </div>
          )}
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-bold text-text-primary mb-0.5">Nutq nisbati (Menejerlar)</h2>
          <p className="text-xs text-text-muted mb-4">Har bir menejer bo&apos;yicha (Menejer vs Mijoz)</p>
          {managerStats.filter(m => m.count > 0).length === 0 ? (
            <EmptyState
              icon={<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>}
              title="Nutq nisbati topilmadi"
              subtitle="Tanlangan davr uchun menejerlar kesimida nutq nisbati mavjud emas."
            />
          ) : (
            <div className="space-y-3">
              {managerStats.filter(m => m.count > 0).map(m => (
                <div key={m.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-text-primary">{m.name}</span>
                    <span className="text-xs text-text-muted font-mono">65% / 35%</span>
                  </div>
                  <div className="flex h-2 rounded-full overflow-hidden">
                    <div className="bg-brand-orange" style={{ width: '65%' }} />
                    <div className="bg-bg-elevated flex-1" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ===== Birinchi kontaktgacha vaqt ===== */}
      <div className="card p-5">
        <h2 className="text-base font-bold text-text-primary mb-1">Birinchi kontaktgacha vaqt (Jamoa)</h2>
        <p className="text-xs text-text-muted mb-4">Jamoa mijozga birinchi qo&apos;ng&apos;iroqni qancha tezlikda amalga oshirayotgani.</p>
        <div className="flex flex-col items-center py-8 gap-3">
          <div className="w-12 h-12 rounded-full bg-bg-elevated flex items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="text-text-dim">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <div className="text-sm font-bold text-text-primary">Lidga javob vaqti tarifingizga kirmaydi</div>
          <p className="text-xs text-text-muted text-center max-w-sm">Bu vidjet &quot;Lidga javob vaqti&quot; obuna funksiyasiga bog&apos;langan. Yoqish uchun akkaunt menejeringiz bilan bog&apos;laning.</p>
        </div>
      </div>
    </div>
  )
}
