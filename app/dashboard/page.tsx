import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { format } from 'date-fns'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getDashboardStats() {
  try {
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

    return { totalManagers, totalCalls, recentCalls, avgRating, todayCalls, managers, error: null }
  } catch (e) {
    console.error('Dashboard DB error:', e)
    return {
      totalManagers: 0, totalCalls: 0, recentCalls: [], managers: [],
      avgRating: { _avg: { rating: null } }, todayCalls: 0,
      error: 'Database ulanishida xato. Iltimos DATABASE_URL ni tekshiring.',
    }
  }
}

function StarRatingDisplay({ rating }: { rating: number | null }) {
  if (!rating) return <span className="text-[#333360] font-mono text-sm">—</span>
  
  const stars = []
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <span key={i} className={i <= Math.round(rating) ? 'text-[#FF6B35]' : 'text-[#1E1E35]'}>
        ★
      </span>
    )
  }
  return (
    <span className="flex items-center gap-0.5 text-sm">
      {stars}
      <span className="ml-1.5 font-mono text-xs text-[#9494B8]">{rating.toFixed(1)}</span>
    </span>
  )
}

function OutcomeBadge({ outcome }: { outcome: string | null }) {
  const map: Record<string, { label: string; cls: string }> = {
    sale:      { label: '✓ Sotildi',     cls: 'badge-success' },
    followup:  { label: '→ Davom etadi', cls: 'badge-info' },
    rejected:  { label: '✗ Rad etildi',  cls: 'badge-danger' },
    unknown:   { label: '? Noma\'lum',   cls: 'badge-neutral' },
  }
  const o = map[outcome || 'unknown'] || map['unknown']
  return <span className={`badge ${o.cls}`}>{o.label}</span>
}

function SentimentBadge({ sentiment }: { sentiment: string | null }) {
  if (!sentiment) return null
  const map: Record<string, { label: string; cls: string }> = {
    positive: { label: '😊 Ijobiy', cls: 'badge-success' },
    negative: { label: '😞 Salbiy', cls: 'badge-danger' },
    neutral:  { label: '😐 Neytral', cls: 'badge-neutral' },
  }
  const s = map[sentiment] || map['neutral']
  return <span className={`badge ${s.cls}`}>{s.label}</span>
}

export default async function DashboardPage() {
  const { totalManagers, totalCalls, recentCalls, avgRating, todayCalls, managers, error } =
    await getDashboardStats()

  if (error) {
    return (
      <div className="max-w-2xl mx-auto mt-20 text-center space-y-4">
        <div className="text-5xl">⚠️</div>
        <h1 className="text-2xl font-display font-700 text-white">Database xatosi</h1>
        <p className="text-[#9494B8] font-mono text-sm">{error}</p>
        <div className="mt-6 p-4 bg-[#0D0D1A] border border-red-500/30 rounded-xl text-left">
          <p className="text-xs font-mono text-red-400">Render → Environment → DATABASE_URL ni tekshiring</p>
        </div>
      </div>
    )
  }

  const statCards = [
    {
      label: 'Jami Managerlar',
      value: totalManagers,
      icon: '👥',
      color: 'from-blue-500/10 to-blue-600/5',
      border: 'border-blue-500/20',
    },
    {
      label: "Jami Qo'ng'iroqlar",
      value: totalCalls,
      icon: '📞',
      color: 'from-orange-500/10 to-orange-600/5',
      border: 'border-orange-500/20',
    },
    {
      label: 'Bugun',
      value: todayCalls,
      icon: '📅',
      color: 'from-purple-500/10 to-purple-600/5',
      border: 'border-purple-500/20',
    },
    {
      label: "O'rtacha Baho",
      value: avgRating._avg.rating ? `${avgRating._avg.rating.toFixed(1)} ★` : '—',
      icon: '⭐',
      color: 'from-yellow-500/10 to-yellow-600/5',
      border: 'border-yellow-500/20',
    },
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-[#FF6B35] uppercase tracking-widest">
              Replix AI
            </span>
            <span className="text-[#1E1E35]">—</span>
            <span className="text-xs font-mono text-[#5555AA]">
              {format(new Date(), 'dd.MM.yyyy')}
            </span>
          </div>
          <h1 className="text-3xl font-display font-700 text-white">
            Bosh Panel
          </h1>
          <p className="text-[#9494B8] font-mono text-sm mt-1">
            Dunyabunya — AI savdo tahlili
          </p>
        </div>
        <Link
          href="/calls"
          className="flex items-center gap-2 px-4 py-2.5 bg-[#FF6B35] hover:bg-[#FF5520] text-white text-sm font-display font-600 rounded-lg transition-colors shadow-lg shadow-orange-500/20"
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Qo'ng'iroq Yuklash
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className={`bg-gradient-to-br ${card.color} border ${card.border} rounded-xl p-5 transition-all hover:scale-[1.02]`}
          >
            <div className="text-2xl mb-3">{card.icon}</div>
            <div className="text-2xl font-display font-700 text-white">{card.value}</div>
            <div className="text-xs font-mono text-[#9494B8] mt-1">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent Calls */}
        <div className="xl:col-span-2 bg-[#0D0D1A] border border-[#1E1E35] rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[#1E1E35] flex items-center justify-between">
            <h2 className="font-display font-600 text-white">So'nggi Qo'ng'iroqlar</h2>
            <Link href="/calls" className="text-xs font-mono text-[#FF6B35] hover:text-[#FF9D6E] transition-colors">
              Barchasi →
            </Link>
          </div>

          {recentCalls.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="text-4xl mb-3">📞</div>
              <p className="text-[#5555AA] font-mono text-sm">
                Hali qo'ng'iroqlar yuklenmagan
              </p>
              <Link href="/calls" className="mt-3 inline-block text-xs text-[#FF6B35] hover:underline">
                Birinchi qo'ng'iroqni yuklash →
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-[#1E1E35]">
              {recentCalls.map((call) => (
                <div key={call.id} className="px-6 py-4 hover:bg-[#111122] transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF6B35]/20 to-[#FF3D00]/10 border border-[#FF6B35]/20 flex items-center justify-center text-xs font-display font-600 text-[#FF6B35]">
                        {call.manager.name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-sm font-display font-500 text-white">
                          {call.manager.name}
                        </div>
                        <div className="text-xs font-mono text-[#5555AA]">
                          {format(new Date(call.createdAt), 'dd.MM HH:mm')}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <OutcomeBadge outcome={call.callOutcome} />
                      <StarRatingDisplay rating={call.rating} />
                    </div>
                  </div>
                  {call.summary && (
                    <p className="mt-2 text-xs font-mono text-[#9494B8] line-clamp-2 pl-11">
                      {call.summary}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Manager Leaderboard */}
        <div className="bg-[#0D0D1A] border border-[#1E1E35] rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[#1E1E35] flex items-center justify-between">
            <h2 className="font-display font-600 text-white">Managerlar</h2>
            <Link href="/managers" className="text-xs font-mono text-[#FF6B35] hover:text-[#FF9D6E] transition-colors">
              Barchasi →
            </Link>
          </div>

          {managers.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="text-4xl mb-3">👥</div>
              <p className="text-[#5555AA] font-mono text-sm">Manager qo'shilmagan</p>
            </div>
          ) : (
            <div className="divide-y divide-[#1E1E35]">
              {managers.map((mgr, idx) => {
                const avg = mgr.calls.length > 0
                  ? mgr.calls.reduce((s, c) => s + (c.rating || 0), 0) / mgr.calls.length
                  : 0
                const sales = mgr.calls.filter(c => c.callOutcome === 'sale').length

                return (
                  <Link
                    key={mgr.id}
                    href={`/managers/${mgr.id}`}
                    className="flex items-center gap-3 px-6 py-3.5 hover:bg-[#111122] transition-colors"
                  >
                    <span className="text-xs font-mono text-[#333360] w-4">#{idx + 1}</span>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF6B35]/20 to-[#FF3D00]/10 border border-[#FF6B35]/20 flex items-center justify-center text-xs font-display font-600 text-[#FF6B35] flex-shrink-0">
                      {mgr.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-display font-500 text-white truncate">
                        {mgr.name}
                      </div>
                      <div className="text-xs font-mono text-[#5555AA]">
                        {mgr.calls.length} ta | {sales} sotuv
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-mono font-500 ${avg >= 4 ? 'text-green-400' : avg >= 3 ? 'text-yellow-400' : avg > 0 ? 'text-red-400' : 'text-[#333360]'}`}>
                        {avg > 0 ? avg.toFixed(1) : '—'}
                      </div>
                      <div className="text-[10px] text-[#5555AA]">baho</div>
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
