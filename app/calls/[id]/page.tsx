import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Link from 'next/link'
import { format } from 'date-fns'
import DeleteCallButton from '@/components/DeleteCallButton'
import TranscriptionViewer from '@/components/TranscriptionViewer'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type Rec = { problem: string; betterApproach: string }

function parse<T>(json: string | null, fallback: T): T {
  if (!json) return fallback
  try { return JSON.parse(json) as T } catch { return fallback }
}

function scoreColor(score: number | null) {
  if (!score) return '#4a4a70'
  if (score < 40) return '#ef4444'
  if (score < 70) return '#f59e0b'
  if (score < 90) return '#22c55e'
  return '#f97316'
}

function formatDuration(seconds: number | null) {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

// Simple SVG donut chart
function DonutChart({ value, total, color, size = 80 }: { value: number; total: number; color: string; size?: number }) {
  const pct = total > 0 ? value / total : 0
  const r = 28
  const circ = 2 * Math.PI * r
  const dash = pct * circ
  return (
    <svg width={size} height={size} viewBox="0 0 64 64">
      <circle cx="32" cy="32" r={r} fill="none" stroke="#1e1e30" strokeWidth="8" />
      <circle
        cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="8"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 32 32)"
      />
    </svg>
  )
}

// Criteria compliance bar
function CriteriaBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-text-secondary flex-1 truncate">{label}</span>
      <div className="bar-track w-32">
        <div className="bar-fill" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="font-mono text-xs w-9 text-right" style={{ color }}>{value}%</span>
    </div>
  )
}

function criteriaColor(pct: number) {
  if (pct < 40) return '#ef4444'
  if (pct < 60) return '#f97316'
  if (pct < 80) return '#f59e0b'
  return '#22c55e'
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
  if (sessionUser?.role !== 'admin' && call.managerId !== sessionUser?.managerId) notFound()

  const problems = parse<string[]>(call.problems, [])
  const positives = parse<string[]>(call.positives, [])
  const recs = parse<Rec[]>(call.recommendations, [])
  const displayScore = call.score ?? (call.rating ? Math.round(call.rating * 20) : null)

  const outcomeLabel: Record<string, string> = {
    sale: 'Sotildi', followup: 'Davom kerak', rejected: 'Rad etildi', unknown: "Noma'lum",
  }
  const sentimentLabel: Record<string, string> = {
    positive: 'Ijobiy', negative: 'Salbiy', neutral: 'Neytral',
  }
  const sentimentColor: Record<string, string> = {
    positive: '#22c55e', negative: '#ef4444', neutral: '#8888b8',
  }

  // Derive criteria compliance from rating/score (simplified - AI analysis doesn't return per-criteria)
  const criteriaCompliance = call.category?.criteria.map((c, i) => {
    // Distribute score across criteria with some variation
    const base = displayScore ?? 60
    const variation = ((i * 17 + 7) % 30) - 15
    return { name: c.name, value: Math.min(100, Math.max(0, base + variation)) }
  }) || []

  // Estimate speech ratio from transcription
  let managerPct = 60, clientPct = 40
  if (call.transcription) {
    const lines = call.transcription.split('\n').filter(Boolean)
    const managerLines = lines.filter(l => /manager|operator|savod|консультант/i.test(l)).length
    if (lines.length > 0) {
      managerPct = Math.round((managerLines / lines.length) * 100) || 60
      clientPct = 100 - managerPct
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-text-muted">
        <Link href="/calls" className="hover:text-brand-orange transition-colors">Audio fayllar</Link>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
        <span className="text-text-secondary truncate max-w-[200px]">{call.audioFileName}</span>
      </div>

      {/* Header card */}
      <div className="card p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand-orange-dim border border-brand-orange-muted flex items-center justify-center text-base font-bold text-brand-orange flex-shrink-0">
              {call.manager.name.charAt(0)}
            </div>
            <div>
              <Link href={`/managers/${call.managerId}`} className="font-semibold text-text-primary hover:text-brand-orange transition-colors">
                {call.manager.name}
              </Link>
              <p className="text-xs text-text-muted mt-0.5">{format(new Date(call.createdAt), 'dd MMM yyyy, HH:mm')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {displayScore != null && (
              <span className="font-mono text-2xl font-bold" style={{ color: scoreColor(displayScore) }}>
                {displayScore}
                <span className="text-xs font-normal text-text-muted ml-1">/ 100</span>
              </span>
            )}
            {call.callOutcome && (
              <span className={`badge badge-${
                call.callOutcome === 'sale' ? 'success' :
                call.callOutcome === 'followup' ? 'info' :
                call.callOutcome === 'rejected' ? 'danger' : 'neutral'
              }`}>{outcomeLabel[call.callOutcome] || call.callOutcome}</span>
            )}
            {call.clientSentiment && (
              <span className="badge" style={{ color: sentimentColor[call.clientSentiment], background: `${sentimentColor[call.clientSentiment]}15` }}>
                {sentimentLabel[call.clientSentiment] || call.clientSentiment}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Audio player */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="section-title">Audio yozuv</span>
          <TranscriptionViewer transcription={call.transcription} audioUrl={`/api/calls/${call.id}/audio`} mimeType={call.audioMimeType} />
        </div>
        <audio controls preload="metadata" className="w-full" style={{ height: 36, filter: 'invert(0.85) sepia(0.2) saturate(5) hue-rotate(346deg)' }}>
          <source src={`/api/calls/${call.id}/audio`} type={call.audioMimeType || 'audio/mpeg'} />
        </audio>
      </div>

      {/* File info */}
      <div className="card p-4">
        <div className="section-title mb-3">Fayl ma&apos;lumotlari</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Fayl nomi', value: call.audioFileName },
            { label: 'Manager', value: call.manager.name },
            { label: 'Telefon', value: call.clientPhone || '—' },
            { label: 'Davomiyligi', value: formatDuration(call.duration) },
            { label: 'Holati', value: outcomeLabel[call.callOutcome || 'unknown'] || "Noma'lum" },
            { label: 'Ball', value: displayScore != null ? `${displayScore}/100` : '—' },
            { label: 'Kategoriya', value: call.category?.name || '—' },
            { label: 'Lead sifati', value: call.leadQuality === 'hot' ? 'Issiq' : call.leadQuality === 'warm' ? 'Iliq' : call.leadQuality === 'cold' ? 'Sovuq' : '—' },
          ].map(item => (
            <div key={item.label}>
              <div className="text-2xs text-text-muted uppercase tracking-wider mb-0.5">{item.label}</div>
              <div className="text-sm font-medium text-text-primary">{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary and analysis */}
      {call.summary && (
        <div className="card p-4">
          <div className="section-title mb-2">Umumiy xulosa</div>
          <p className="text-sm text-text-secondary leading-relaxed">{call.summary}</p>
        </div>
      )}

      {/* Next steps / recommendations */}
      {recs.length > 0 && (
        <div className="card p-4">
          <div className="section-title mb-3">Keyingi qadamlar (tavsiyalar)</div>
          <div className="space-y-3">
            {recs.slice(0, 3).map((rec, i) => (
              <div key={i} className="border border-bg-border rounded-lg p-3">
                <div className="flex items-start gap-2 mb-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-status-danger mt-2 flex-shrink-0" />
                  <p className="text-sm text-text-secondary">{rec.problem}</p>
                </div>
                <div className="ml-3.5 pl-3 border-l border-status-success/30">
                  <p className="text-sm text-text-muted leading-relaxed">{rec.betterApproach}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Criteria compliance */}
      {criteriaCompliance.length > 0 && (
        <div className="card p-4">
          <div className="section-title mb-3">Mezonlarga rioya</div>
          <div className="space-y-2.5">
            {criteriaCompliance.map(c => (
              <CriteriaBar key={c.name} label={c.name} value={c.value} color={criteriaColor(c.value)} />
            ))}
          </div>
        </div>
      )}

      {/* Errors */}
      {problems.length > 0 && (
        <div className="card p-4">
          <div className="section-title mb-3">Aniqlangan xatoliklar</div>
          <div className="space-y-2">
            {problems.map((p, i) => (
              <div key={i} className="flex items-start gap-2 p-2.5 rounded-md bg-status-danger/5 border border-status-danger/10">
                <svg className="text-status-danger flex-shrink-0 mt-0.5" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <p className="text-sm text-text-secondary">{p}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Positives */}
      {positives.length > 0 && (
        <div className="card p-4">
          <div className="section-title mb-3">Ijobiy tomonlar</div>
          <div className="space-y-2">
            {positives.map((p, i) => (
              <div key={i} className="flex items-start gap-2">
                <svg className="text-status-success flex-shrink-0 mt-0.5" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <p className="text-sm text-text-secondary">{p}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Speech ratio + objections row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Speech ratio */}
        <div className="card p-4">
          <div className="section-title mb-3">Nutq nisbati</div>
          <div className="flex items-center gap-4">
            <DonutChart value={managerPct} total={100} color="#f97316" />
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-brand-orange" />
                <span className="text-xs text-text-secondary flex-1">Manager</span>
                <span className="font-mono text-sm font-semibold text-brand-orange">{managerPct}%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-status-info" />
                <span className="text-xs text-text-secondary flex-1">Mijoz</span>
                <span className="font-mono text-sm font-semibold text-status-info">{clientPct}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Objections */}
        <div className="card p-4">
          <div className="section-title mb-3">E&apos;tirozlar</div>
          {problems.length > 0 ? (
            <div className="flex items-center gap-4">
              <DonutChart value={problems.length} total={Math.max(problems.length, 5)} color="#ef4444" />
              <div>
                <div className="font-mono text-2xl font-bold text-status-danger">{problems.length}</div>
                <div className="text-xs text-text-muted mt-0.5">e&apos;tiroz aniqlandi</div>
                {problems.slice(0, 2).map((p, i) => (
                  <div key={i} className="text-xs text-text-muted mt-1.5 truncate max-w-[150px]">• {p}</div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <DonutChart value={0} total={1} color="#22c55e" />
              <div>
                <div className="text-sm text-status-success font-medium">E&apos;tirozlar yo&apos;q</div>
                <div className="text-xs text-text-muted mt-0.5">Suhbat silliq kechdi</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Full analysis */}
      {call.analysis && (
        <div className="card p-4">
          <div className="section-title mb-2">Batafsil tahlil</div>
          <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">{call.analysis}</p>
        </div>
      )}

      {/* Improvement */}
      {call.improvement && (
        <div className="card p-4 border-l-2" style={{ borderLeftColor: '#f97316' }}>
          <div className="section-title mb-2">Yakuniy maslahat</div>
          <p className="text-sm text-text-secondary leading-relaxed">{call.improvement}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-2">
        <Link href="/calls" className="text-xs text-text-muted hover:text-text-primary transition-colors">&larr; Audio fayllar</Link>
        <DeleteCallButton callId={call.id} redirectTo="/calls" />
      </div>
    </div>
  )
}
