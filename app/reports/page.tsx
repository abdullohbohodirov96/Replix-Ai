import { prisma } from '@/lib/prisma'
import { format, startOfDay, endOfDay } from 'date-fns'
import GenerateReportButton from '@/components/GenerateReportButton'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getReportsData() {
  const managers = await prisma.manager.findMany({
    include: {
      calls: {
        orderBy: { createdAt: 'desc' },
        select: {
          rating: true,
          callOutcome: true,
          problems: true,
          summary: true,
          clientSentiment: true,
          createdAt: true,
        },
      },
      reports: {
        orderBy: { date: 'desc' },
        take: 3,
      },
    },
  })
  return managers
}

function RatingBar({ value, max = 5 }: { value: number; max?: number }) {
  const pct = (value / max) * 100
  const color = value >= 4 ? '#10B981' : value >= 3 ? '#F59E0B' : '#EF4444'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-[#1E1E35] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-mono font-500 w-6" style={{ color }}>{value.toFixed(1)}</span>
    </div>
  )
}

export default async function ReportsPage() {
  const managers = await getReportsData()

  // Today's stats per manager
  const today = new Date()
  const todayStats = managers.map(mgr => {
    const todayCalls = mgr.calls.filter(c =>
      new Date(c.createdAt) >= startOfDay(today) &&
      new Date(c.createdAt) <= endOfDay(today)
    )
    const allCalls = mgr.calls
    const avgRating = allCalls.length > 0
      ? allCalls.reduce((s, c) => s + (c.rating || 0), 0) / allCalls.length
      : 0
    const todayAvg = todayCalls.length > 0
      ? todayCalls.reduce((s, c) => s + (c.rating || 0), 0) / todayCalls.length
      : 0

    const allProblems = allCalls.flatMap(c => {
      try { return JSON.parse(c.problems || '[]') } catch { return [] }
    })
    const problemFreq = allProblems.reduce((acc, p) => {
      acc[p] = (acc[p] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    const topProblems = Object.entries(problemFreq).sort(([,a],[,b]) => b-a).slice(0,3)

    return { manager: mgr, todayCalls, allCalls, avgRating, todayAvg, topProblems }
  })

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-mono text-[#FF6B35] uppercase tracking-widest mb-1">
            Replix AI / Hisobotlar
          </div>
          <h1 className="text-3xl font-display font-700 text-white">Kunlik Hisobotlar</h1>
          <p className="text-[#9494B8] font-mono text-sm mt-1">
            {format(today, 'dd MMMM yyyy')} — barcha managerlar tahlili
          </p>
        </div>
        <GenerateReportButton />
      </div>

      {/* Overall summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Managerlar', value: managers.length, icon: '👥' },
          { label: 'Jami qo\'ng\'iroq', value: managers.reduce((s, m) => s + m.calls.length, 0), icon: '📞' },
          {
            label: 'O\'rtacha baho',
            value: (() => {
              const allCalls = managers.flatMap(m => m.calls)
              if (!allCalls.length) return '—'
              const avg = allCalls.reduce((s, c) => s + (c.rating || 0), 0) / allCalls.length
              return avg.toFixed(1) + ' ★'
            })(),
            icon: '⭐',
          },
          {
            label: 'Jami sotuvlar',
            value: managers.reduce((s, m) => s + m.calls.filter(c => c.callOutcome === 'sale').length, 0),
            icon: '💰',
          },
        ].map(card => (
          <div key={card.label} className="bg-[#0D0D1A] border border-[#1E1E35] rounded-xl p-4">
            <div className="text-xl mb-2">{card.icon}</div>
            <div className="text-2xl font-display font-700 text-white">{card.value}</div>
            <div className="text-xs font-mono text-[#5555AA] mt-1">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Per-manager reports */}
      <div className="space-y-5">
        <h2 className="font-display font-600 text-white text-lg">Manager bo'yicha tahlil</h2>
        
        {todayStats.length === 0 ? (
          <div className="bg-[#0D0D1A] border border-[#1E1E35] rounded-xl p-12 text-center">
            <div className="text-4xl mb-3">📊</div>
            <p className="text-[#5555AA] font-mono text-sm">Managerlar qo'shilmagan</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {todayStats.map(({ manager, todayCalls, allCalls, avgRating, todayAvg, topProblems }) => (
              <div key={manager.id} className="bg-[#0D0D1A] border border-[#1E1E35] rounded-xl overflow-hidden">
                {/* Manager header */}
                <div className="px-5 py-4 border-b border-[#1E1E35] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#FF6B35]/10 border border-[#FF6B35]/20 flex items-center justify-center text-sm font-display font-700 text-[#FF6B35]">
                      {manager.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-display font-600 text-white text-sm">{manager.name}</div>
                      <div className="text-xs font-mono text-[#5555AA]">{manager.position}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-xl font-display font-700 ${avgRating >= 4 ? 'text-green-400' : avgRating >= 3 ? 'text-yellow-400' : avgRating > 0 ? 'text-red-400' : 'text-[#333360]'}`}>
                      {avgRating > 0 ? avgRating.toFixed(1) : '—'}
                    </div>
                    <div className="text-[10px] font-mono text-[#5555AA]">umumiy baho</div>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-[#111122] rounded-lg p-2 text-center border border-[#1E1E35]">
                      <div className="text-base font-display font-700 text-white">{allCalls.length}</div>
                      <div className="text-[10px] font-mono text-[#333360]">Jami</div>
                    </div>
                    <div className="bg-[#111122] rounded-lg p-2 text-center border border-[#1E1E35]">
                      <div className="text-base font-display font-700 text-[#FF6B35]">{todayCalls.length}</div>
                      <div className="text-[10px] font-mono text-[#333360]">Bugun</div>
                    </div>
                    <div className="bg-[#111122] rounded-lg p-2 text-center border border-[#1E1E35]">
                      <div className="text-base font-display font-700 text-green-400">
                        {allCalls.filter(c => c.callOutcome === 'sale').length}
                      </div>
                      <div className="text-[10px] font-mono text-[#333360]">Sotuv</div>
                    </div>
                  </div>

                  {/* Rating bar */}
                  <div>
                    <div className="text-xs font-mono text-[#5555AA] mb-1.5">Umumiy baho</div>
                    <RatingBar value={avgRating} />
                  </div>

                  {/* Top problems */}
                  {topProblems.length > 0 && (
                    <div>
                      <div className="text-xs font-mono text-red-400 mb-1.5">Asosiy muammolar</div>
                      <div className="space-y-1">
                        {topProblems.map(([problem, count]) => (
                          <div key={problem} className="flex items-start gap-1.5">
                            <span className="text-[#333360] mt-0.5 font-mono text-xs">⚠</span>
                            <span className="text-xs font-mono text-[#9494B8] flex-1 line-clamp-1">{problem}</span>
                            <span className="text-xs font-mono text-red-400/60">{count}x</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Latest AI report */}
                  {manager.reports[0] && (
                    <div className="bg-[#FF6B35]/5 border border-[#FF6B35]/15 rounded-lg p-3">
                      <div className="text-xs font-mono text-[#FF6B35] mb-1">
                        AI hisoboti — {format(new Date(manager.reports[0].date), 'dd.MM.yyyy')}
                      </div>
                      <p className="text-xs font-mono text-[#9494B8]">{manager.reports[0].summary}</p>
                      {manager.reports[0].improvement && (
                        <p className="text-xs font-mono text-[#5555AA] mt-1.5 border-t border-[#1E1E35] pt-1.5">
                          💡 {manager.reports[0].improvement}
                        </p>
                      )}
                    </div>
                  )}

                  {allCalls.length === 0 && (
                    <p className="text-xs font-mono text-[#333360] italic text-center py-2">
                      Qo'ng'iroqlar mavjud emas
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
