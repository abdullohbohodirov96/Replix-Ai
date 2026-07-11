import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import DeleteCallButton from '@/components/DeleteCallButton'
import ReuploadCallButton from '@/components/ReuploadCallButton'

export const dynamic = 'force-dynamic'

async function getCall(id: string) {
  return prisma.call.findUnique({
    where: { id },
    include: { manager: true },
  })
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

export default async function CallDetailPage({ params }: { params: { id: string } }) {
  const call = await getCall(params.id)
  if (!call) notFound()

  let problems: string[] = []
  let positives: string[] = []
  let recommendations: { problem: string; betterApproach: string }[] = []
  try { problems = JSON.parse(call.problems || '[]') as string[] } catch {}
  try { positives = JSON.parse(call.positives || '[]') as string[] } catch {}
  try { recommendations = JSON.parse(call.recommendations || '[]') as { problem: string; betterApproach: string }[] } catch {}

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-mono text-[#5555AA]">
        <Link href="/calls" className="hover:text-[#FF6B35] transition-colors">Qo'ng'iroqlar</Link>
        <span>/</span>
        <span className="text-[#9494B8]">Tahlil natijasi</span>
      </div>

      <div className="bg-[#0D0D1A] border border-[#1E1E35] rounded-xl overflow-hidden">
        {/* Call header */}
        <div className="px-6 py-4 border-b border-[#1E1E35] flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FF6B35]/20 to-[#FF3D00]/10 border border-[#FF6B35]/20 flex items-center justify-center text-xl font-display font-800 text-[#FF6B35]">
              {call.manager.name.charAt(0)}
            </div>
            <div>
              <Link href={`/managers/${call.managerId}`} className="text-lg font-display font-700 text-white hover:text-[#FF6B35] transition-colors">
                {call.manager.name}
              </Link>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs font-mono text-[#5555AA]">
                  {format(new Date(call.createdAt), 'dd.MM.yyyy HH:mm')}
                </span>
                <span className="text-[#1E1E35]">|</span>
                <span className="text-xs font-mono text-[#9494B8]">
                  {call.audioFileName}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <SentimentBadge sentiment={call.clientSentiment} />
            <OutcomeBadge outcome={call.callOutcome} />
            <ReuploadCallButton callId={call.id} managerId={call.managerId} managerName={call.manager.name} />
            <DeleteCallButton callId={call.id} />
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Rating + Summary */}
          <div className="flex flex-col gap-3">
            <StarDisplay rating={call.rating} />
            {call.summary ? (
              <p className="text-sm font-mono text-[#E8E8F5] leading-relaxed">{call.summary}</p>
            ) : (
              <p className="text-sm font-mono text-red-400">Tahlil natijalari mavjud emas.</p>
            )}
          </div>

          {/* Audio player */}
          <div className="bg-[#111122] border border-[#1E1E35] rounded-xl p-4">
            <div className="text-xs font-mono text-[#FF6B35] mb-3 uppercase tracking-wider flex items-center gap-1.5">
              <span>🎧</span> Audio yozuv
            </div>
            <audio controls preload="none" className="w-full h-10" src={`/api/calls/${call.id}/audio`}>
              Brauzeringiz audioni qo&apos;llab-quvvatlamaydi
            </audio>
          </div>

          {/* Analysis */}
          {call.analysis && (
            <div className="bg-[#111122] border border-[#1E1E35] rounded-xl p-5">
              <div className="text-xs font-mono text-[#FF6B35] mb-2.5 uppercase tracking-wider">
                🤖 Replix AI tahlili
              </div>
              <p className="text-sm font-mono text-[#9494B8] leading-relaxed whitespace-pre-wrap">
                {call.analysis}
              </p>
            </div>
          )}

          {/* Problems & Positives */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {problems.length > 0 && (
              <div className="bg-[#0D0D1A] border border-red-500/20 rounded-xl p-5">
                <div className="text-sm font-mono text-red-400 mb-3 flex items-center gap-2 border-b border-red-500/20 pb-2">
                  <span>⚠</span> Muammolar
                </div>
                <ul className="space-y-2">
                  {problems.map((p, i) => (
                    <li key={i} className="text-sm font-mono text-[#9494B8] flex items-start gap-2">
                      <span className="text-red-400 mt-0.5">•</span>
                      <span className="leading-relaxed">{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {positives.length > 0 && (
              <div className="bg-[#0D0D1A] border border-green-500/20 rounded-xl p-5">
                <div className="text-sm font-mono text-green-400 mb-3 flex items-center gap-2 border-b border-green-500/20 pb-2">
                  <span>✓</span> Ijobiy tomonlar
                </div>
                <ul className="space-y-2">
                  {positives.map((p, i) => (
                    <li key={i} className="text-sm font-mono text-[#9494B8] flex items-start gap-2">
                      <span className="text-green-400 mt-0.5">•</span>
                      <span className="leading-relaxed">{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <div className="bg-[#FF6B35]/5 border border-[#FF6B35]/20 rounded-xl p-5">
              <div className="text-sm font-mono text-[#FF6B35] mb-4 uppercase tracking-wider flex items-center gap-2 border-b border-[#FF6B35]/20 pb-2">
                <span>💡</span> Tavsiyalar — qanday qilish kerak edi
              </div>
              <div className="space-y-4">
                {recommendations.map((rec, i) => (
                  <div key={i} className="bg-[#0D0D1A] border border-[#1E1E35] rounded-xl p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <span className="text-red-400 text-sm mt-0.5">✗</span>
                      <p className="text-sm font-mono text-[#E8E8F5] flex-1 leading-relaxed">{rec.problem}</p>
                    </div>
                    <div className="flex items-start gap-3 pl-1 border-l-2 border-green-500/30 ml-1.5 pl-4">
                      <span className="text-green-400 text-sm mt-0.5">✓</span>
                      <p className="text-sm font-mono text-[#9494B8] flex-1 leading-relaxed">{rec.betterApproach}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Improvement summary */}
          {call.improvement && (
            <div className="bg-[#111122] border border-[#1E1E35] rounded-xl p-5">
              <div className="text-sm font-mono text-yellow-400 mb-2.5 uppercase tracking-wider flex items-center gap-2 border-b border-[#1E1E35] pb-2">
                <span>📌</span> Yakuniy maslahat
              </div>
              <p className="text-sm font-mono text-[#9494B8] leading-relaxed">
                {call.improvement}
              </p>
            </div>
          )}

          {/* Transcription */}
          {call.transcription && (
            <div className="bg-[#111122] border border-[#1E1E35] rounded-xl p-5">
              <div className="text-sm font-mono text-[#5555AA] mb-3 uppercase tracking-wider flex items-center gap-2 border-b border-[#1E1E35] pb-2">
                <span>📝</span> To'liq Transkripsiya (Matn)
              </div>
              <div className="max-h-96 overflow-y-auto pr-2">
                <p className="text-sm font-mono text-[#9494B8] whitespace-pre-wrap leading-relaxed">
                  {call.transcription}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
