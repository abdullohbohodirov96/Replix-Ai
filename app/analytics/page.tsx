import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getConstructionInsights } from '@/lib/ai-learning'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function Badge({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'green' | 'orange' | 'blue' | 'purple' | 'default' }) {
  const cls = {
    green: 'bg-green-500/10 text-green-400 border-green-500/20',
    orange: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    default: 'bg-[#1E1E35] text-[#9494B8] border-[#1E1E35]',
  }[variant]
  return <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${cls}`}>{children}</span>
}

function FreqBar({ label, freq, max, color }: { label: string; freq: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((freq / max) * 100) : 0
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-sm font-mono text-[#E8E8F5] truncate max-w-[70%]">{label}</span>
        <span className="text-xs font-mono text-[#5555AA]">{freq}x</span>
      </div>
      <div className="h-1.5 bg-[#1E1E35] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}

export default async function AnalyticsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const [insights, totalCalls, managers, outcomeStats] = await Promise.all([
    getConstructionInsights(),
    prisma.call.count(),
    prisma.manager.findMany({
      include: { calls: { select: { rating: true, callOutcome: true } } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.call.groupBy({ by: ['callOutcome'], _count: { id: true } }),
  ])

  const managerStats = managers.map(m => {
    const calls = m.calls
    const avg = calls.length > 0 ? calls.reduce((s, c) => s + (c.rating || 0), 0) / calls.length : 0
    const sales = calls.filter(c => c.callOutcome === 'sale').length
    return { name: m.name, avg: Math.round(avg * 10) / 10, total: calls.length, sales }
  }).sort((a, b) => b.avg - a.avg)

  const maxProd = insights.products[0]?.frequency || 1
  const maxObj = insights.objections[0]?.frequency || 1
  const maxTech = insights.techniques[0]?.frequency || 1

  const outcomeMap: Record<string, number> = {}
  for (const o of outcomeStats) outcomeMap[o.callOutcome || 'unknown'] = o._count.id

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-white">AI Tahlil & Bilim Bazasi</h1>
        <p className="text-sm font-mono text-[#9494B8] mt-1">
          AI o'rganilgan bilimlar — {insights.totalPatterns} ta pattern, {totalCalls} ta qo'ng'iroqdan
        </p>
      </div>

      {/* Stats overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Mahsulotlar', val: insights.products.length, color: '#FF6B35' },
          { label: "E'tirozlar", val: insights.objections.length, color: '#3B82F6' },
          { label: 'Texnikalar', val: insights.techniques.length, color: '#10B981' },
          { label: 'Mijoz turlari', val: insights.customer_types.length, color: '#8B5CF6' },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-[#1E1E35] bg-[#0D0D1A] p-4">
            <div className="text-2xl font-display font-bold" style={{ color: s.color }}>{s.val}</div>
            <div className="text-xs font-mono text-[#9494B8] mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Products */}
        <div className="rounded-xl border border-[#1E1E35] bg-[#0D0D1A] p-5 space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="font-display font-semibold text-white">Ko'p so'ralgan mahsulotlar</h2>
            <Badge variant="orange">{insights.products.length}</Badge>
          </div>
          {insights.products.length === 0
            ? <p className="text-xs font-mono text-[#5555AA]">Hali ma'lumot yo'q</p>
            : insights.products.slice(0, 8).map(p => (
                <FreqBar key={p.pattern} label={p.pattern} freq={p.frequency} max={maxProd} color="#FF6B35" />
              ))}
        </div>

        {/* Objections */}
        <div className="rounded-xl border border-[#1E1E35] bg-[#0D0D1A] p-5 space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="font-display font-semibold text-white">Keng tarqalgan e'tirozlar</h2>
            <Badge variant="blue">{insights.objections.length}</Badge>
          </div>
          {insights.objections.length === 0
            ? <p className="text-xs font-mono text-[#5555AA]">Hali ma'lumot yo'q</p>
            : insights.objections.slice(0, 8).map(o => (
                <FreqBar key={o.pattern} label={o.pattern} freq={o.frequency} max={maxObj} color="#3B82F6" />
              ))}
        </div>

        {/* Techniques */}
        <div className="rounded-xl border border-[#1E1E35] bg-[#0D0D1A] p-5 space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="font-display font-semibold text-white">Samarali savdo texnikalari</h2>
            <Badge variant="green">{insights.techniques.length}</Badge>
          </div>
          {insights.techniques.length === 0
            ? <p className="text-xs font-mono text-[#5555AA]">Hali ma'lumot yo'q</p>
            : insights.techniques.slice(0, 8).map(t => (
                <FreqBar key={t.pattern} label={t.pattern} freq={t.frequency} max={maxTech} color="#10B981" />
              ))}
        </div>

        {/* Call outcomes */}
        <div className="rounded-xl border border-[#1E1E35] bg-[#0D0D1A] p-5 space-y-3">
          <h2 className="font-display font-semibold text-white">Qo'ng'iroq natijalari</h2>
          {[
            { key: 'sale', label: 'Sotuv', color: '#10B981' },
            { key: 'followup', label: "Kuzatuv kerak", color: '#F59E0B' },
            { key: 'rejected', label: 'Rad etildi', color: '#EF4444' },
            { key: 'unknown', label: "Noma'lum", color: '#6B7280' },
          ].map(o => (
            <FreqBar key={o.key} label={o.label} freq={outcomeMap[o.key] || 0} max={totalCalls || 1} color={o.color} />
          ))}
        </div>
      </div>

      {/* Manager leaderboard */}
      <div className="rounded-xl border border-[#1E1E35] bg-[#0D0D1A] p-5">
        <h2 className="font-display font-semibold text-white mb-4">Manager reytingi</h2>
        <div className="space-y-2">
          {managerStats.slice(0, 10).map((m, i) => (
            <div key={m.name} className="flex items-center gap-3 py-2 border-b border-[#0D0D1A] last:border-0">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-display font-bold shrink-0 ${i === 0 ? 'bg-yellow-500/20 text-yellow-400' : i === 1 ? 'bg-gray-400/20 text-gray-300' : i === 2 ? 'bg-orange-700/20 text-orange-600' : 'bg-[#1E1E35] text-[#5555AA]'}`}>
                {i + 1}
              </span>
              <span className="flex-1 font-display text-sm text-white">{m.name}</span>
              <span className="font-mono text-xs text-[#9494B8]">{m.total} ta qo'ng'iroq</span>
              <span className="font-mono text-xs text-green-400">{m.sales} sotuv</span>
              <span className="font-display font-semibold text-sm" style={{ color: m.avg >= 4 ? '#10B981' : m.avg >= 3 ? '#F59E0B' : '#EF4444' }}>
                {m.avg}/5
              </span>
            </div>
          ))}
          {managerStats.length === 0 && <p className="text-xs font-mono text-[#5555AA]">Manager ma'lumotlari yo'q</p>}
        </div>
      </div>

      {/* AI learning info */}
      <div className="rounded-xl border border-[#FF6B35]/20 bg-[#FF6B35]/5 p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#FF6B35]/10 flex items-center justify-center shrink-0">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#FF6B35" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-display font-semibold text-[#FF6B35]">AI o'z-o'zidan o'rganmoqda</p>
            <p className="text-xs font-mono text-[#9494B8] mt-1">
              Har yangi audio yuklanganda AI qurilish do'koni kontekstini o'rganadi: mahsulot nomlari, 
              mijoz e'tirozlari, samarali texnikalar. Bu bilimlar keyingi tahlillarni yaxshilaydi.
              Hozircha <span className="text-[#FF6B35]">{insights.totalPatterns}</span> ta pattern o'rganildi.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
