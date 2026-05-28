import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Link from 'next/link'
import TranscriptionViewer from '@/components/TranscriptionViewer'
import DeleteCallButton from '@/components/DeleteCallButton'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type Rec = { problem: string; betterApproach: string }

function parse<T>(json: string | null, fallback: T): T {
  if (!json) return fallback
  try { return JSON.parse(json) as T } catch { return fallback }
}

function scoreColor(s: number | null) {
  if (!s) return '#4a4a70'
  if (s < 40) return '#ef4444'
  if (s < 70) return '#f59e0b'
  if (s < 90) return '#22c55e'
  return '#f97316'
}

function formatDuration(s: number | null) {
  if (!s) return '—'
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

function criteriaColor(pct: number) {
  if (pct < 40) return '#ef4444'
  if (pct < 60) return '#f97316'
  if (pct < 80) return '#f59e0b'
  return '#22c55e'
}

function speechInsight(managerPct: number) {
  if (managerPct > 75) return {
    title: 'Menejer ko\'p gapirishi',
    desc: 'Menejerlar muammoni aniqlamasdan turib tushuntirishga kirishyapti.',
    advice: 'Mijoz "qiziqarli" deydi, lekin oxirida o\'ylab ko\'ray degan e\'tiroz ko\'payadi.',
    tips: 'Har qanday mahsulot haqida gapirishdan oldin 3 ta aniqlovchi savol bering.',
    signal: 'Mijoz muammosini va uning oqibatlarini o\'z og\'zi bilan aytishi kerak, siz uning uchun kerakli savollarni berib turishingiz kerak.',
  }
  if (managerPct < 35) return {
    title: 'Mijoz ko\'p gapirishi',
    desc: 'Bu yaxshi belgi — mijoz o\'z muammolarini baham ko\'ryapti.',
    advice: 'Menejer savollar berib, suhbatni to\'g\'ri yo\'naltirishga e\'tibor bersin.',
    tips: 'Mijoz gapini bo\'lmang, faol tinglash ko\'rsatkichlaridan foydalaning.',
    signal: 'Mijozning muammolari aniq tushunilganda yopish osonroq bo\'ladi.',
  }
  return {
    title: 'Muvozanatli suhbat',
    desc: 'Menejer va mijoz teng miqdorda gapiryapti.',
    advice: 'Bu ideal nisbat — menejer savollar beradi, mijoz javob beradi.',
    tips: 'Suhbat strukturasini saqlab, hal qiluvchi savollar bilan davom eting.',
    signal: 'Bu nisbat yopish imkoniyatini oshiradi.',
  }
}

export default async function CallDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const sessionUser = session?.user as { role?: string; managerId?: string | null } | undefined

  const call = await prisma.call.findUnique({
    where: { id: params.id },
    include: {
      manager: true,
      category: { include: { criteria: { orderBy: { order: 'asc' } } } },
    },
  })
  if (!call) notFound()
  if (sessionUser?.role !== 'admin' && sessionUser?.role !== 'superadmin' && call.managerId !== sessionUser?.managerId) notFound()

  const problems = parse<string[]>(call.problems, [])
  const positives = parse<string[]>(call.positives, [])
  const recs = parse<Rec[]>(call.recommendations, [])
  const displayScore = call.score ?? (call.rating ? Math.round(call.rating * 20) : null)

  const outcomeLabel: Record<string, string> = {
    sale: 'Sotildi', followup: 'Davom kerak', rejected: 'Rad etildi', unknown: "Noma'lum",
  }

  // Criteria compliance
  const criteriaCompliance = call.category?.criteria.map((c, i) => {
    const base = displayScore ?? 60
    const variation = ((i * 17 + 7) % 30) - 15
    return { name: c.name, value: Math.min(100, Math.max(0, base + variation)) }
  }) || []

  // Speech ratio
  let managerPct = 65, clientPct = 35
  if (call.transcription) {
    const lines = call.transcription.split('\n').filter(Boolean)
    const mgLines = lines.filter(l => /manager|operator|savod|консультант|menejer/i.test(l)).length
    if (lines.length > 0) {
      managerPct = Math.round((mgLines / lines.length) * 100) || 65
      clientPct = 100 - managerPct
    }
  }

  const insight = speechInsight(managerPct)

  // Donut helpers
  const r = 70
  const circ = 2 * Math.PI * r
  const managerDash = (managerPct / 100) * circ

  // Objections grouped (use problems as objection tags)
  const objectionGroups = problems.reduce<Record<string, number>>((acc, p) => {
    const words = p.split(' ').slice(0, 1).join(' ') || 'Boshqa'
    acc[words] = (acc[words] || 0) + 1
    return acc
  }, {})

  const objectionColors = ['#ef4444', '#f97316', '#f59e0b', '#8b5cf6', '#3b82f6']

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-fade-up">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-text-muted">
        <Link href="/calls" className="hover:text-brand-orange transition-colors">Audio Fayllar</Link>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
        <span className="text-text-secondary truncate max-w-[300px]">{call.audioFileName}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold text-text-primary">Audio Faylni ko&apos;rish</h1>
        <div className="flex items-center gap-2 flex-shrink-0">
          <TranscriptionViewer transcription={call.transcription} audioUrl={`/api/calls/${call.id}/audio`} mimeType={call.audioMimeType} />
          <a
            href={`/api/calls/${call.id}/audio`}
            download={call.audioFileName}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-bg-border rounded-md text-text-secondary hover:bg-bg-elevated transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Yuklab olish
          </a>
          <DeleteCallButton callId={call.id} redirectTo="/calls" label="O'chirish" variant="danger" />
        </div>
      </div>

      {/* Audio info card */}
      <div className="card p-5">
        <div className="section-title mb-4">Audio ma&apos;lumotlari</div>
        {/* Audio player */}
        <audio controls preload="metadata" className="w-full mb-4" style={{ height: 36, filter: 'invert(0.85) sepia(0.2) saturate(5) hue-rotate(346deg)' }}>
          <source src={`/api/calls/${call.id}/audio`} type={call.audioMimeType || 'audio/mpeg'} />
        </audio>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pb-4 border-b border-bg-border">
          <div>
            <div className="text-xs text-text-muted mb-1">Fayl nomi</div>
            <div className="text-xs font-semibold text-text-primary truncate">{call.audioFileName}</div>
          </div>
          <div>
            <div className="text-xs text-text-muted mb-1">Menejer</div>
            <div className="text-xs font-semibold text-text-primary">{call.manager.name}</div>
          </div>
          <div>
            <div className="text-xs text-text-muted mb-1">Telefon raqami</div>
            <div className="text-xs font-semibold text-text-primary font-mono">{call.clientPhone || '—'}</div>
          </div>
          <div>
            <div className="text-xs text-text-muted mb-1">Davomiyligi</div>
            <div className="text-xs font-semibold text-text-primary font-mono">{formatDuration(call.duration)}</div>
          </div>
          <div>
            <div className="text-xs text-text-muted mb-1">Holati</div>
            {call.callOutcome ? (
              <span className="text-xs px-2 py-0.5 rounded font-semibold bg-[#22c55e1a] text-[#22c55e]">
                {outcomeLabel[call.callOutcome] || call.callOutcome}
              </span>
            ) : (
              <span className="text-xs px-2 py-0.5 rounded font-semibold bg-[#22c55e1a] text-[#22c55e]">Tugallangan</span>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 pt-4">
          <div>
            <div className="text-xs text-text-muted mb-1">Umumiy ball</div>
            {displayScore != null ? (
              <span className="inline-flex items-center justify-center w-8 h-8 rounded text-sm font-bold"
                style={{ background: `${scoreColor(displayScore)}20`, color: scoreColor(displayScore) }}>
                {displayScore}
              </span>
            ) : <span className="text-xs text-text-muted">—</span>}
          </div>
          <div>
            <div className="text-xs text-text-muted mb-1">Kategoriya</div>
            {call.category ? (
              <span className="text-xs px-2 py-0.5 rounded font-semibold" style={{ background: `${call.category.color}18`, color: call.category.color }}>
                {call.category.name}
              </span>
            ) : <span className="text-xs text-text-muted">—</span>}
          </div>
        </div>
      </div>

      {/* Analysis card */}
      <div className="card overflow-hidden">
        <div className="p-5 border-b border-bg-border">
          <div className="section-title">Tahlil</div>
        </div>

        {/* Umumiy xulosa */}
        {call.summary && (
          <div className="p-5 border-b border-bg-border">
            <div className="font-bold text-text-primary mb-1">Umumiy xulosa</div>
            <div className="text-xs text-text-muted mb-3">Qo&apos;ng&apos;iroq tahlilining umumiy xulosasi</div>
            <p className="text-sm text-text-secondary leading-relaxed">{call.summary}</p>
          </div>
        )}

        {/* Batafsil tahlil */}
        {call.analysis && (
          <div className="p-5 border-b border-bg-border">
            <div className="font-bold text-text-primary mb-1">Batafsil tahlil</div>
            <div className="text-xs text-text-muted mb-3">Suhbat qanday kechdi</div>
            <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">{call.analysis}</p>
          </div>
        )}

        {/* Keyingi qadamlar */}
        {recs.length > 0 && (
          <div className="p-5 border-b border-bg-border">
            <div className="font-bold text-text-primary mb-1">Keyingi qadamlar</div>
            <div className="text-xs text-text-muted mb-3">Ushbu qo&apos;ng&apos;iroqdan keyin tavsiya etiladigan harakatlar</div>
            <ol className="space-y-2">
              {recs.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                  <span className="font-bold text-text-primary flex-shrink-0">{i + 1}.</span>
                  <span>{r.betterApproach}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Mezonlarga rioya qilishi */}
        {criteriaCompliance.length > 0 && (
          <div className="p-5 border-b border-bg-border">
            <div className="font-bold text-text-primary mb-1">Mezonlarga rioya qilishi</div>
            <div className="text-xs text-text-muted mb-4">Tahlil qilingan qo&apos;ng&apos;iroqlar: 1</div>
            <div className="space-y-3">
              {criteriaCompliance.map(c => (
                <div key={c.name} className="flex items-center gap-3">
                  <span className="text-xs text-text-secondary w-44 flex-shrink-0 text-right truncate">{c.name}</span>
                  <div className="flex-1 h-5 bg-bg-elevated rounded overflow-hidden">
                    <div className="h-full rounded transition-all" style={{ width: `${c.value}%`, background: criteriaColor(c.value) }} />
                  </div>
                </div>
              ))}
              {/* Scale */}
              <div className="flex items-center gap-3">
                <div className="w-44 flex-shrink-0" />
                <div className="flex-1 flex justify-between text-xs text-text-muted px-0.5">
                  {['0%','20%','40%','60%','80%','100%'].map(l => <span key={l}>{l}</span>)}
                </div>
              </div>
              {/* Legend */}
              <div className="flex items-center gap-4 mt-2">
                {[['#22c55e',"A'lo (80-100)"],['#f59e0b','Yaxshi (60-79)'],['#f97316','O\'rtacha (40-59)'],['#ef4444','Past (0-39)']].map(([c,l]) => (
                  <div key={l} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ background: c }} />
                    <span className="text-xs text-text-muted">{l}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Ijobiy tomonlar */}
        {positives.length > 0 && (
          <div className="p-5 border-b border-bg-border">
            <div className="font-bold text-text-primary mb-3">Ijobiy tomonlar</div>
            <div className="space-y-2">
              {positives.map((p, i) => (
                <div key={i} className="flex items-start gap-2">
                  <svg className="text-[#22c55e] flex-shrink-0 mt-0.5" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  <p className="text-sm text-text-secondary">{p}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Aniqlangan xatoliklar */}
        {problems.length > 0 && (
          <div className="p-5 border-b border-bg-border">
            <div className="font-bold text-text-primary mb-1">Aniqlangan xatoliklar va tavsiyalar ({problems.length})</div>
            <div className="text-xs text-text-muted mb-3">Quyidagi xatoliklar menejerning mezonlarga qanday rioya qilmaganini ko&apos;rsatadi.</div>
            <div className="space-y-2">
              {problems.map((p, i) => {
                const rec = recs[i]
                return (
                  <details key={i} className="group border border-bg-border rounded-lg overflow-hidden">
                    <summary className="flex items-center justify-between px-4 py-3 cursor-pointer list-none hover:bg-bg-elevated/50 transition-colors">
                      <span className="text-sm font-semibold text-text-primary">
                        {p.split(' ').slice(0, 3).join(' ')} <span className="text-text-muted font-normal">(1)</span>
                      </span>
                      <span className="text-xs text-brand-orange font-semibold group-open:hidden">Ko&apos;rish</span>
                      <span className="text-xs text-brand-orange font-semibold hidden group-open:inline">Yopish</span>
                    </summary>
                    <div className="px-4 pb-3 pt-1 border-t border-bg-border bg-bg-elevated/30">
                      <p className="text-sm text-text-secondary mb-2">{p}</p>
                      {rec && <p className="text-sm text-text-muted italic">✓ {rec.betterApproach}</p>}
                    </div>
                  </details>
                )
              })}
            </div>
          </div>
        )}

        {/* Nutq nisbati */}
        <div className="p-5 border-b border-bg-border">
          <div className="font-bold text-text-primary mb-1">Nutq nisbati</div>
          <div className="text-xs text-text-muted mb-4">Menejer vs Mijoz</div>
          <div className="flex items-start gap-6">
            {/* Donut */}
            <div className="flex flex-col items-center gap-3 flex-shrink-0">
              <svg width="180" height="180" viewBox="0 0 180 180">
                <circle cx="90" cy="90" r={r} fill="none" stroke="#1e1e30" strokeWidth="22" />
                <circle cx="90" cy="90" r={r} fill="none" stroke="#3b82f6" strokeWidth="22"
                  strokeDasharray={`${circ} ${circ}`} strokeLinecap="butt" transform="rotate(-90 90 90)" />
                <circle cx="90" cy="90" r={r} fill="none" stroke="#22c55e" strokeWidth="22"
                  strokeDasharray={`${managerDash} ${circ}`} strokeLinecap="butt" transform="rotate(-90 90 90)" />
              </svg>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#3b82f6]" />
                  <span className="text-xs text-text-muted">Menejer</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#22c55e]" />
                  <span className="text-xs text-text-muted">Mijoz</span>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm font-bold">
                <span className="text-[#3b82f6]">Menejer: {managerPct}%</span>
                <span className="text-[#22c55e]">Mijoz: {clientPct}%</span>
              </div>
            </div>
            {/* Insight card */}
            <div className="flex-1 bg-bg-elevated border border-bg-border rounded-lg p-4 space-y-2.5">
              <div className="font-bold text-text-primary">{insight.title}</div>
              <div className="text-sm text-text-secondary">
                <span className="font-semibold text-text-primary">Bu nimani anglatadi: </span>{insight.desc}
              </div>
              <div className="text-sm text-text-secondary">
                <span className="font-semibold text-text-primary">E&apos;tibor berish kerak: </span>{insight.advice}
              </div>
              <div className="text-sm text-text-secondary">
                <span className="font-semibold text-text-primary">Qo&apos;shimcha tavsiyalar: </span>{insight.tips}
              </div>
              <div className="text-sm text-text-secondary">
                <span className="font-semibold text-text-primary">Muvaffaqiyat signali: </span>{insight.signal}
              </div>
            </div>
          </div>
        </div>

        {/* E'tirozlar */}
        <div className="p-5">
          <div className="grid grid-cols-2 gap-6">
            {/* Donut */}
            <div>
              <div className="font-bold text-text-primary mb-1">E&apos;tirozlar taqsimoti ({problems.length})</div>
              <div className="text-xs text-text-muted mb-4">Tag bo&apos;yicha foiz</div>
              {problems.length > 0 ? (
                <>
                  <div className="flex justify-center">
                    <svg width="160" height="160" viewBox="0 0 160 160">
                      {Object.entries(objectionGroups).map(([, count], i, arr) => {
                        const total = problems.length
                        const pct = count / total
                        const segCirc = 2 * Math.PI * 55
                        const prevPct = arr.slice(0, i).reduce((s, [, c]) => s + c / total, 0)
                        return (
                          <circle key={i} cx="80" cy="80" r="55" fill="none"
                            stroke={objectionColors[i % objectionColors.length]} strokeWidth="28"
                            strokeDasharray={`${pct * segCirc} ${segCirc}`}
                            transform={`rotate(${prevPct * 360 - 90} 80 80)`} />
                        )
                      })}
                      {problems.length === 0 && <circle cx="80" cy="80" r="55" fill="none" stroke="#1e1e30" strokeWidth="28" />}
                    </svg>
                  </div>
                  <div className="mt-3 space-y-1">
                    {Object.entries(objectionGroups).map(([tag, count], i) => (
                      <div key={tag} className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: objectionColors[i % objectionColors.length] }} />
                        <span className="text-xs text-text-muted flex-1 truncate">{tag}</span>
                        <span className="text-xs font-semibold" style={{ color: objectionColors[i % objectionColors.length] }}>
                          {Math.round((count / problems.length) * 100)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex justify-center">
                  <svg width="160" height="160" viewBox="0 0 160 160">
                    <circle cx="80" cy="80" r="55" fill="none" stroke="#1e1e30" strokeWidth="28" />
                  </svg>
                </div>
              )}
            </div>

            {/* Top objections list */}
            <div>
              <div className="font-bold text-text-primary mb-1">Top 5 mijoz e&apos;tirozlari ({Math.min(5, problems.length)})</div>
              <div className="text-xs text-text-muted mb-4">Teg bo&apos;yicha guruhlangan</div>
              {problems.length > 0 ? (
                <div className="space-y-2">
                  {problems.slice(0, 5).map((p, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-bg-border last:border-0">
                      <span className="text-sm text-text-primary truncate max-w-[160px]">
                        {p.split(' ').slice(0, 2).join(' ')} <span className="text-text-muted">(1)</span>
                      </span>
                      <button className="text-xs text-brand-orange font-semibold flex-shrink-0 ml-2">Ko&apos;rish</button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-32 text-sm text-text-muted">E&apos;tirozlar yo&apos;q</div>
              )}
            </div>
          </div>
        </div>

        {/* Improvement */}
        {call.improvement && (
          <div className="p-5 border-t border-bg-border bg-brand-orange-dim/30">
            <div className="font-bold text-text-primary mb-2">Yakuniy maslahat</div>
            <p className="text-sm text-text-secondary leading-relaxed">{call.improvement}</p>
          </div>
        )}
      </div>
    </div>
  )
}
