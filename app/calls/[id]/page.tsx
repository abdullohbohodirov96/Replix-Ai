import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Link from 'next/link'
import DeleteCallButton from '@/components/DeleteCallButton'
import UploadCallModal from '@/components/UploadCallModal'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type Recommendation = { problem: string; betterApproach: string }

function parse<T>(json: string | null, fallback: T): T {
  if (!json) return fallback
  try { return JSON.parse(json) as T } catch { return fallback }
}

function StarRow({ rating }: { rating: number | null }) {
  if (!rating) return null
  return (
    <div className="flex items-center gap-1">
      {[1,2,3,4,5].map(i => (
        <span key={i} className={`text-2xl ${i <= Math.round(rating) ? 'text-[#FF6B35]' : 'text-[#1E1E35]'}`}>★</span>
      ))}
      <span className="ml-2 text-xl font-display font-bold text-[#FF6B35]">{rating.toFixed(1)}</span>
      <span className="text-sm font-mono text-[#5555AA]">/ 5.0</span>
    </div>
  )
}

function Section({ title, color = '#FF6B35', children }: { title: string; color?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[#1E1E35] bg-[#0D0D1A] p-5">
      <h3 className="text-xs font-mono uppercase tracking-widest mb-3" style={{ color }}>{title}</h3>
      {children}
    </div>
  )
}

export default async function CallDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const sessionUser = session?.user as { role?: string; managerId?: string | null } | undefined

  const call = await prisma.call.findUnique({
    where: { id: params.id },
    include: { manager: true },
  })
  if (!call) notFound()

  if (sessionUser?.role !== 'admin' && call.managerId !== sessionUser?.managerId) notFound()

  const problems = parse<string[]>(call.problems, [])
  const positives = parse<string[]>(call.positives, [])
  const recs = parse<Recommendation[]>(call.recommendations, [])

  const outcomeMap: Record<string, { label: string; color: string }> = {
    sale:     { label: 'Sotildi', color: '#10B981' },
    followup: { label: 'Davom kerak', color: '#3B82F6' },
    rejected: { label: 'Rad etildi', color: '#EF4444' },
    unknown:  { label: "Noma'lum", color: '#6B7280' },
  }
  const outcome = outcomeMap[call.callOutcome || 'unknown'] || outcomeMap['unknown']

  const sentimentMap: Record<string, { label: string; emoji: string; color: string }> = {
    positive: { label: 'Ijobiy', emoji: '😊', color: '#10B981' },
    negative: { label: 'Salbiy', emoji: '😞', color: '#EF4444' },
    neutral:  { label: 'Neytral', emoji: '😐', color: '#6B7280' },
  }
  const sentiment = sentimentMap[call.clientSentiment || 'neutral'] || sentimentMap['neutral']

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-mono text-[#5555AA]">
        <Link href="/calls" className="hover:text-[#FF6B35] transition-colors">Qo'ng'iroqlar</Link>
        <span>/</span>
        <span className="text-[#9494B8]">{call.audioFileName}</span>
      </div>

      {/* Header */}
      <div className="rounded-xl border border-[#1E1E35] bg-[#0D0D1A] p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-[#FF6B35]/10 border border-[#FF6B35]/20 flex items-center justify-center text-sm font-display font-bold text-[#FF6B35]">
                {call.manager.name.charAt(0)}
              </div>
              <div>
                <Link href={`/managers/${call.managerId}`} className="font-display font-semibold text-white hover:text-[#FF6B35] transition-colors">
                  {call.manager.name}
                </Link>
                <p className="text-xs font-mono text-[#5555AA]">
                  {new Date(call.createdAt).toLocaleString('uz-UZ')}
                </p>
              </div>
            </div>
            <StarRow rating={call.rating} />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono px-2.5 py-1 rounded-full border" style={{ color: outcome.color, borderColor: `${outcome.color}40`, backgroundColor: `${outcome.color}15` }}>
              {outcome.label}
            </span>
            <span className="text-xs font-mono px-2.5 py-1 rounded-full border" style={{ color: sentiment.color, borderColor: `${sentiment.color}40`, backgroundColor: `${sentiment.color}15` }}>
              {sentiment.emoji} {sentiment.label}
            </span>
            <UploadCallModal existingCallId={call.id} managerId={call.managerId} />
            <DeleteCallButton callId={call.id} redirectTo="/calls" />
          </div>
        </div>
      </div>

      {/* Audio player */}
      <Section title="🎧 Audio Yozuv">
        <div className="space-y-2">
          <p className="text-xs font-mono text-[#5555AA]">{call.audioFileName}</p>
          <audio controls preload="metadata" className="w-full" style={{ filter: 'invert(0.85) sepia(0.2) saturate(5) hue-rotate(346deg)' }}>
            <source src={`/api/calls/${call.id}/audio`} type={call.audioMimeType || 'audio/mpeg'} />
            Brauzer audioni qo&apos;llab-quvvatlamaydi
          </audio>
        </div>
      </Section>

      {/* Summary */}
      {call.summary && (
        <Section title="📋 Xulosa">
          <p className="text-sm font-mono text-[#E8E8F5] leading-relaxed">{call.summary}</p>
        </Section>
      )}

      {/* Analysis */}
      {call.analysis && (
        <Section title="🔍 Batafsil Tahlil">
          <p className="text-sm font-mono text-[#9494B8] leading-relaxed whitespace-pre-wrap">{call.analysis}</p>
        </Section>
      )}

      {/* Recommendations */}
      {recs.length > 0 && (
        <Section title="💡 Tavsiyalar" color="#FF6B35">
          <div className="space-y-3">
            {recs.map((rec, i) => (
              <div key={i} className="bg-[#111122] border border-[#1E1E35] rounded-lg p-4">
                <div className="flex items-start gap-2 mb-2">
                  <span className="text-red-400 text-sm mt-0.5">✗</span>
                  <p className="text-sm font-mono text-[#E8E8F5] flex-1">{rec.problem}</p>
                </div>
                <div className="flex items-start gap-2 border-l-2 border-green-500/40 pl-3 ml-3">
                  <span className="text-green-400 text-sm mt-0.5">✓</span>
                  <p className="text-sm font-mono text-[#9494B8] flex-1 leading-relaxed">{rec.betterApproach}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Problems */}
        {problems.length > 0 && (
          <Section title="⚠ Muammolar" color="#EF4444">
            <ul className="space-y-1.5">
              {problems.map((p, i) => (
                <li key={i} className="flex items-start gap-2 text-sm font-mono text-[#9494B8]">
                  <span className="text-red-400 mt-0.5 shrink-0">•</span>{p}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Positives */}
        {positives.length > 0 && (
          <Section title="✅ Ijobiy tomonlar" color="#10B981">
            <ul className="space-y-1.5">
              {positives.map((p, i) => (
                <li key={i} className="flex items-start gap-2 text-sm font-mono text-[#9494B8]">
                  <span className="text-green-400 mt-0.5 shrink-0">•</span>{p}
                </li>
              ))}
            </ul>
          </Section>
        )}
      </div>

      {/* Improvement */}
      {call.improvement && (
        <Section title="📌 Yakuniy Maslahat" color="#F59E0B">
          <p className="text-sm font-mono text-[#9494B8] leading-relaxed">{call.improvement}</p>
        </Section>
      )}

      {/* Transcription */}
      {call.transcription && (
        <Section title="📝 Transkripsiya (Matnga aylantirilgan)">
          <p className="text-sm font-mono text-[#5555AA] leading-relaxed whitespace-pre-wrap">{call.transcription}</p>
        </Section>
      )}
    </div>
  )
}
