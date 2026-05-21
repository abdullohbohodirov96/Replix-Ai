import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import AddManagerModal from '@/components/AddManagerModal'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getManagers() {
  return prisma.manager.findMany({
    include: {
      calls: {
        select: {
          rating: true,
          callOutcome: true,
          problems: true,
          createdAt: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
}

function ManagerCard({ manager }: { manager: Awaited<ReturnType<typeof getManagers>>[0] }) {
  const calls = manager.calls
  const avgRating = calls.length > 0
    ? calls.reduce((s, c) => s + (c.rating || 0), 0) / calls.length
    : 0

  const sales = calls.filter(c => c.callOutcome === 'sale').length
  const rejected = calls.filter(c => c.callOutcome === 'rejected').length
  const followup = calls.filter(c => c.callOutcome === 'followup').length

  const allProblems: string[] = calls
    .flatMap(c => {
      try { return JSON.parse(c.problems || '[]') as string[] } catch { return [] }
    })
  const uniqueProblems = Array.from(new Set(allProblems)).slice(0, 2)

  const ratingColor = avgRating >= 4 ? 'text-green-400' : avgRating >= 3 ? 'text-yellow-400' : avgRating > 0 ? 'text-red-400' : 'text-[#333360]'
  const ratingBg = avgRating >= 4 ? 'border-green-500/20 bg-green-500/5' : avgRating >= 3 ? 'border-yellow-500/20 bg-yellow-500/5' : avgRating > 0 ? 'border-red-500/20 bg-red-500/5' : 'border-[#1E1E35] bg-[#0D0D1A]'

  return (
    <Link href={`/managers/${manager.id}`}>
      <div className="bg-[#0D0D1A] border border-[#1E1E35] rounded-xl p-5 card-hover cursor-pointer h-full">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#FF6B35]/20 to-[#FF3D00]/10 border border-[#FF6B35]/20 flex items-center justify-center text-lg font-display font-700 text-[#FF6B35]">
              {manager.name.charAt(0)}
            </div>
            <div>
              <h3 className="font-display font-600 text-white text-base">{manager.name}</h3>
              <p className="text-xs font-mono text-[#5555AA]">{manager.position}</p>
            </div>
          </div>
          <div className={`px-3 py-1.5 rounded-lg border text-center ${ratingBg}`}>
            <div className={`text-xl font-display font-700 ${ratingColor}`}>
              {avgRating > 0 ? avgRating.toFixed(1) : '—'}
            </div>
            <div className="text-[10px] font-mono text-[#5555AA]">/ 5.0</div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { label: "Jami", value: calls.length, color: 'text-[#9494B8]' },
            { label: "Sotuv", value: sales, color: 'text-green-400' },
            { label: "Davom", value: followup, color: 'text-blue-400' },
            { label: "Rad", value: rejected, color: 'text-red-400' },
          ].map(stat => (
            <div key={stat.label} className="bg-[#111122] rounded-lg px-2 py-1.5 text-center border border-[#1E1E35]">
              <div className={`text-sm font-display font-600 ${stat.color}`}>{stat.value}</div>
              <div className="text-[9px] font-mono text-[#333360] uppercase">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Stars */}
        {avgRating > 0 && (
          <div className="flex items-center gap-1 mb-3">
            {[1,2,3,4,5].map(i => (
              <span key={i} className={`text-base ${i <= Math.round(avgRating) ? 'text-[#FF6B35]' : 'text-[#1E1E35]'}`}>★</span>
            ))}
          </div>
        )}

        {/* Problems */}
        {uniqueProblems.length > 0 && (
          <div className="space-y-1">
            {uniqueProblems.map((p, i) => (
              <div key={i} className="flex items-start gap-1.5 text-xs font-mono text-[#9494B8]">
                <span className="text-[#EF4444] mt-0.5">⚠</span>
                <span className="line-clamp-1">{p}</span>
              </div>
            ))}
          </div>
        )}

        {calls.length === 0 && (
          <p className="text-xs font-mono text-[#333360] italic">Hali qo'ng'iroqlar yo'q</p>
        )}

        <div className="mt-3 pt-3 border-t border-[#1E1E35] flex items-center justify-between">
          {manager.phone && (
            <span className="text-xs font-mono text-[#5555AA]">{manager.phone}</span>
          )}
          <span className="text-xs font-mono text-[#FF6B35] ml-auto">Batafsil →</span>
        </div>
      </div>
    </Link>
  )
}

export default async function ManagersPage() {
  const managers = await getManagers()

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-mono text-[#FF6B35] uppercase tracking-widest mb-1">
            Replix AI / Managerlar
          </div>
          <h1 className="text-3xl font-display font-700 text-white">Managerlar</h1>
          <p className="text-[#9494B8] font-mono text-sm mt-1">
            {managers.length} ta manager ro'yxatda
          </p>
        </div>
        <AddManagerModal />
      </div>

      {/* Grid */}
      {managers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-[#0D0D1A] border border-[#1E1E35] rounded-xl">
          <div className="text-5xl mb-4">👥</div>
          <h3 className="font-display font-600 text-white text-lg mb-2">Manager qo'shilmagan</h3>
          <p className="text-[#5555AA] font-mono text-sm mb-6 text-center max-w-xs">
            Birinchi managerni qo'shing va qo'ng'iroqlarini tahlil qilishni boshlang
          </p>
          <AddManagerModal />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {managers.map(mgr => (
            <ManagerCard key={mgr.id} manager={mgr} />
          ))}
        </div>
      )}
    </div>
  )
}
