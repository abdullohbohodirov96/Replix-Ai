import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { format } from 'date-fns'
import UploadCallModal from '@/components/UploadCallModal'
import DeleteCallButton from '@/components/DeleteCallButton'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getCalls() {
  return prisma.call.findMany({
    include: { manager: true },
    orderBy: { createdAt: 'desc' },
  })
}

async function getManagers() {
  return prisma.manager.findMany({ orderBy: { name: 'asc' } })
}

function StarDisplay({ rating }: { rating: number | null }) {
  if (!rating) return <span className="text-[#333360] font-mono text-xs">—</span>
  return (
    <span className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(i => (
        <span key={i} className={`text-sm ${i <= Math.round(rating) ? 'text-[#FF6B35]' : 'text-[#1E1E35]'}`}>★</span>
      ))}
      <span className="ml-1 text-xs font-mono text-[#9494B8]">{rating.toFixed(1)}</span>
    </span>
  )
}

function OutcomeBadge({ outcome }: { outcome: string | null }) {
  const map: Record<string, { label: string; cls: string }> = {
    sale:      { label: '✓ Sotildi',     cls: 'badge-success' },
    followup:  { label: '→ Davom',       cls: 'badge-info' },
    rejected:  { label: '✗ Rad',         cls: 'badge-danger' },
    unknown:   { label: '? Noma\'lum',   cls: 'badge-neutral' },
  }
  const o = map[outcome || 'unknown'] || map['unknown']
  return <span className={`badge ${o.cls}`}>{o.label}</span>
}

export default async function CallsPage() {
  const [calls, managers] = await Promise.all([getCalls(), getManagers()])

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-mono text-[#FF6B35] uppercase tracking-widest mb-1">
            Replix AI / Qo'ng'iroqlar
          </div>
          <h1 className="text-3xl font-display font-700 text-white">Qo'ng'iroqlar</h1>
          <p className="text-[#9494B8] font-mono text-sm mt-1">
            Jami {calls.length} ta qo'ng'iroq
          </p>
        </div>
        <UploadCallModal managers={managers} />
      </div>

      {/* Table */}
      <div className="bg-[#0D0D1A] border border-[#1E1E35] rounded-xl overflow-hidden">
        {calls.length === 0 ? (
          <div className="py-24 text-center">
            <div className="text-5xl mb-4">📞</div>
            <h3 className="font-display font-600 text-white text-lg mb-2">Qo'ng'iroqlar yo'q</h3>
            <p className="text-[#5555AA] font-mono text-sm mb-6">
              Birinchi audio qo'ng'iroqni yuklang va AI tahlilini oling
            </p>
            <UploadCallModal managers={managers} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1E1E35]">
                  {['Sana', 'Manager', 'Fayl', 'Baho', 'Natija', 'Mijoz', 'Xulosa', ''].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-mono text-[#5555AA] uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E1E35]">
                {calls.map(call => (
                  <tr key={call.id} className="hover:bg-[#111122] transition-colors">
                    <td className="px-5 py-3.5 text-xs font-mono text-[#5555AA] whitespace-nowrap">
                      {format(new Date(call.createdAt), 'dd.MM.yyyy')}
                      <br />
                      <span className="text-[#333360]">{format(new Date(call.createdAt), 'HH:mm')}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <Link href={`/managers/${call.managerId}`} className="flex items-center gap-2 hover:text-[#FF6B35] transition-colors group">
                        <div className="w-7 h-7 rounded-full bg-[#FF6B35]/10 border border-[#FF6B35]/20 flex items-center justify-center text-xs font-display font-600 text-[#FF6B35] flex-shrink-0">
                          {call.manager.name.charAt(0)}
                        </div>
                        <span className="text-sm font-display text-white group-hover:text-[#FF6B35] transition-colors">
                          {call.manager.name}
                        </span>
                      </Link>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs font-mono text-[#5555AA] max-w-[120px] truncate block">
                        {call.audioFileName}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <StarDisplay rating={call.rating} />
                    </td>
                    <td className="px-5 py-3.5">
                      <OutcomeBadge outcome={call.callOutcome} />
                    </td>
                    <td className="px-5 py-3.5">
                      {call.clientSentiment && (
                        <span className={`badge ${
                          call.clientSentiment === 'positive' ? 'badge-success' :
                          call.clientSentiment === 'negative' ? 'badge-danger' : 'badge-neutral'
                        }`}>
                          {call.clientSentiment === 'positive' ? '😊' : call.clientSentiment === 'negative' ? '😞' : '😐'}
                          {' '}{call.clientSentiment === 'positive' ? 'Ijobiy' : call.clientSentiment === 'negative' ? 'Salbiy' : 'Neytral'}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 max-w-[200px]">
                      {call.summary ? (
                        <p className="text-xs font-mono text-[#9494B8] line-clamp-2">{call.summary}</p>
                      ) : (
                        <span className="text-xs font-mono text-[#333360] italic">Tahlil yo'q</span>
                      )}
                    </td>
                    <td className="px-3 py-3.5">
                      <DeleteCallButton callId={call.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
