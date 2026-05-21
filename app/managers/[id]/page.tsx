import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import UploadCallModal from '@/components/UploadCallModal'
import DeleteCallButton from '@/components/DeleteCallButton'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getManager(id: string) {
  const manager = await prisma.manager.findUnique({
    where: { id },
    include: {
      calls: {
        orderBy: { createdAt: 'desc' },
      },
      reports: {
        orderBy: { date: 'desc' },
        take: 7,
      },
    },
  })
  return manager
}

function StarDisplay({ rating }: { rating: number | null }) {
  if (!rating) return <span className="text-[#333360] font-mono text-xs">Baholanmagan</span>
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(i => (
        <span key={i} className={`text-sm ${i <= Math.round(rating) ? 'text-[#FF6B35]' : 'text-[#1E1E35]'}`}>★</span>
      ))}
      <span className="ml-1.5 text-xs font-mono text-[#9494B8]">{rating.toFixed(1)}</span>
    </div>
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
    positive: { label: '😊 Ijobiy',  cls: 'badge-success' },
    negative: { label: '😞 Salbiy',  cls: 'badge-danger' },
    neutral:  { label: '😐 Neytral', cls: 'badge-neutral' },
  }
  const s = map[sentiment] || map['neutral']
  return <span className={`badge ${s.cls}`}>{s.label}</span>
}

export default async function ManagerDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const manager = await getManager(params.id)
  if (!manager) notFound()

  const calls = manager.calls
  const avgRating = calls.length > 0
    ? calls.reduce((s, c) => s + (c.rating || 0), 0) / calls.length
    : 0

  const outcomes = {
    sale:     calls.filter(c => c.callOutcome === 'sale').length,
    followup: calls.filter(c => c.callOutcome === 'followup').length,
    rejected: calls.filter(c => c.callOutcome === 'rejected').length,
    unknown:  calls.filter(c => c.callOutcome === 'unknown').length,
  }

  const allProblems: string[] = calls.flatMap(c => {
    try { return JSON.parse(c.problems || '[]') as string[] } catch { return [] }
  })
  const problemFreq = allProblems.reduce<Record<string, number>>((acc, p) => {
    acc[p] = (acc[p] || 0) + 1
    return acc
  }, {})
  const topProblems = (Object.entries(problemFreq) as [string, number][])
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)

  const ratingColor = avgRating >= 4 ? '#10B981' : avgRating >= 3 ? '#F59E0B' : avgRating > 0 ? '#EF4444' : '#333360'

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-mono text-[#5555AA]">
        <Link href="/" className="hover:text-[#FF6B35] transition-colors">Dashboard</Link>
        <span>/</span>
        <Link href="/managers" className="hover:text-[#FF6B35] transition-colors">Managerlar</Link>
        <span>/</span>
        <span className="text-[#9494B8]">{manager.name}</span>
      </div>

      {/* Manager Header */}
      <div className="bg-[#0D0D1A] border border-[#1E1E35] rounded-xl p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FF6B35]/20 to-[#FF3D00]/10 border border-[#FF6B35]/20 flex items-center justify-center text-2xl font-display font-800 text-[#FF6B35]">
              {manager.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl font-display font-700 text-white">{manager.name}</h1>
              <p className="text-[#9494B8] font-mono text-sm mt-0.5">{manager.position}</p>
              <div className="flex items-center gap-4 mt-2">
                {manager.phone && (
                  <span className="text-xs font-mono text-[#5555AA]">📞 {manager.phone}</span>
                )}
                {manager.email && (
                  <span className="text-xs font-mono text-[#5555AA]">✉ {manager.email}</span>
                )}
              </div>
            </div>
          </div>
          <UploadCallModal managerId={manager.id} managerName={manager.name} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
        <div className="bg-[#0D0D1A] border border-[#1E1E35] rounded-xl p-4 text-center">
          <div className="text-2xl font-display font-700 text-white">{calls.length}</div>
          <div className="text-xs font-mono text-[#5555AA] mt-1">Jami</div>
        </div>
        <div className="bg-[#0D0D1A] border border-[#1E1E35] rounded-xl p-4 text-center">
          <div className="text-2xl font-display font-700" style={{ color: ratingColor }}>
            {avgRating > 0 ? avgRating.toFixed(1) : '—'}
          </div>
          <div className="text-xs font-mono text-[#5555AA] mt-1">O'rtacha baho</div>
        </div>
        <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4 text-center">
          <div className="text-2xl font-display font-700 text-green-400">{outcomes.sale}</div>
          <div className="text-xs font-mono text-[#5555AA] mt-1">Sotuvlar</div>
        </div>
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 text-center">
          <div className="text-2xl font-display font-700 text-blue-400">{outcomes.followup}</div>
          <div className="text-xs font-mono text-[#5555AA] mt-1">Davom etadi</div>
        </div>
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 text-center">
          <div className="text-2xl font-display font-700 text-red-400">{outcomes.rejected}</div>
          <div className="text-xs font-mono text-[#5555AA] mt-1">Rad etildi</div>
        </div>
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Calls List */}
        <div className="xl:col-span-2 space-y-4">
          <h2 className="font-display font-600 text-white text-lg">
            Qo'ng'iroqlar tarixı
          </h2>

          {calls.length === 0 ? (
            <div className="bg-[#0D0D1A] border border-[#1E1E35] rounded-xl p-12 text-center">
              <div className="text-4xl mb-3">📞</div>
              <p className="text-[#5555AA] font-mono text-sm">Hali qo'ng'iroqlar yo'q</p>
            </div>
          ) : (
            <div className="space-y-3">
              {calls.map((call) => {
                let problems: string[] = []
                let positives: string[] = []
                try { problems = JSON.parse(call.problems || '[]') as string[] } catch {}
                try { positives = JSON.parse(call.positives || '[]') as string[] } catch {}

                return (
                  <div key={call.id} className="bg-[#0D0D1A] border border-[#1E1E35] rounded-xl overflow-hidden">
                    {/* Call header */}
                    <div className="px-5 py-3.5 border-b border-[#1E1E35] flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-[#5555AA]">
                          {format(new Date(call.createdAt), 'dd.MM.yyyy HH:mm')}
                        </span>
                        <span className="text-[#1E1E35]">|</span>
                        <span className="text-xs font-mono text-[#9494B8]">
                          {call.audioFileName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <SentimentBadge sentiment={call.clientSentiment} />
                        <OutcomeBadge outcome={call.callOutcome} />
                        <DeleteCallButton callId={call.id} />
                      </div>
                    </div>

                    <div className="p-5 space-y-4">
                      {/* Rating + Summary */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <StarDisplay rating={call.rating} />
                          {call.summary && (
                            <p className="mt-2 text-sm font-mono text-[#9494B8]">{call.summary}</p>
                          )}
                        </div>
                      </div>

                      {/* Analysis */}
                      {call.analysis && (
                        <div className="bg-[#111122] border border-[#1E1E35] rounded-lg p-3">
                          <div className="text-xs font-mono text-[#FF6B35] mb-1.5 uppercase tracking-wider">
                            Replix AI tahlili
                          </div>
                          <p className="text-xs font-mono text-[#9494B8] leading-relaxed">
                            {call.analysis}
                          </p>
                        </div>
                      )}

                      {/* Problems & Positives */}
                      <div className="grid grid-cols-2 gap-3">
                        {problems.length > 0 && (
                          <div>
                            <div className="text-xs font-mono text-red-400 mb-1.5 flex items-center gap-1">
                              <span>⚠</span> Muammolar
                            </div>
                            <ul className="space-y-1">
                              {problems.map((p, i) => (
                                <li key={i} className="text-xs font-mono text-[#9494B8] flex items-start gap-1.5">
                                  <span className="text-red-400 mt-0.5">•</span>{p}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {positives.length > 0 && (
                          <div>
                            <div className="text-xs font-mono text-green-400 mb-1.5 flex items-center gap-1">
                              <span>✓</span> Ijobiy tomonlar
                            </div>
                            <ul className="space-y-1">
                              {positives.map((p, i) => (
                                <li key={i} className="text-xs font-mono text-[#9494B8] flex items-start gap-1.5">
                                  <span className="text-green-400 mt-0.5">•</span>{p}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      {/* Transcription (collapsible) */}
                      {call.transcription && (
                        <details className="group">
                          <summary className="text-xs font-mono text-[#5555AA] cursor-pointer hover:text-[#9494B8] transition-colors list-none flex items-center gap-1">
                            <span className="group-open:rotate-90 inline-block transition-transform">▶</span>
                            Transkripsiya
                          </summary>
                          <div className="mt-2 bg-[#111122] border border-[#1E1E35] rounded-lg p-3 max-h-40 overflow-y-auto">
                            <p className="text-xs font-mono text-[#9494B8] whitespace-pre-wrap leading-relaxed">
                              {call.transcription}
                            </p>
                          </div>
                        </details>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Sidebar analytics */}
        <div className="space-y-5">
          {/* Top Problems */}
          <div className="bg-[#0D0D1A] border border-[#1E1E35] rounded-xl p-5">
            <h3 className="font-display font-600 text-white mb-4 text-sm">
              Eng Ko'p Muammolar
            </h3>
            {topProblems.length === 0 ? (
              <p className="text-xs font-mono text-[#333360]">Muammolar yo'q</p>
            ) : (
              <div className="space-y-2.5">
                {topProblems.map(([problem, count]) => (
                  <div key={problem}>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="text-xs font-mono text-[#9494B8] flex-1 leading-snug">{problem}</span>
                      <span className="text-xs font-mono text-red-400 flex-shrink-0">{count}x</span>
                    </div>
                    <div className="progress-bar">
                      <div
                        className="progress-fill bg-red-500/60"
                        style={{ width: `${(count / allProblems.length) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Rating distribution */}
          <div className="bg-[#0D0D1A] border border-[#1E1E35] rounded-xl p-5">
            <h3 className="font-display font-600 text-white mb-4 text-sm">
              Baho Taqsimoti
            </h3>
            {[5,4,3,2,1].map(star => {
              const count = calls.filter(c => c.rating && Math.round(c.rating) === star).length
              const pct = calls.length > 0 ? (count / calls.length) * 100 : 0
              const colors = { 5: '#10B981', 4: '#84CC16', 3: '#F59E0B', 2: '#F97316', 1: '#EF4444' }
              return (
                <div key={star} className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-mono text-[#5555AA] w-3">{star}</span>
                  <span className="text-[#FF6B35] text-xs">★</span>
                  <div className="flex-1 progress-bar">
                    <div
                      className="progress-fill transition-all duration-700"
                      style={{ width: `${pct}%`, background: colors[star as keyof typeof colors] }}
                    />
                  </div>
                  <span className="text-xs font-mono text-[#5555AA] w-5 text-right">{count}</span>
                </div>
              )
            })}
          </div>

          {/* Recent daily reports */}
          {manager.reports.length > 0 && (
            <div className="bg-[#0D0D1A] border border-[#1E1E35] rounded-xl p-5">
              <h3 className="font-display font-600 text-white mb-4 text-sm">
                So'nggi Hisobotlar
              </h3>
              <div className="space-y-3">
                {manager.reports.map(r => (
                  <div key={r.id} className="border-b border-[#1E1E35] pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono text-[#5555AA]">
                        {format(new Date(r.date), 'dd.MM.yyyy')}
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-mono text-[#FF6B35]">{r.avgRating.toFixed(1)}</span>
                        <span className="text-xs text-[#FF6B35]">★</span>
                      </div>
                    </div>
                    <p className="text-xs font-mono text-[#9494B8] line-clamp-2">{r.summary}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
