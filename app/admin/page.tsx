import { prisma } from '@/lib/prisma'
import { format } from 'date-fns'
import AdminReplyForm from '@/components/AdminReplyForm'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getSupportMessages() {
  return prisma.supportMessage.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
}

export default async function AdminPage() {
  const messages = await getSupportMessages()

  const unreadCount = messages.filter(m => !m.isRead).length

  // Group by sessionId
  const sessions = messages.reduce<
    Record<string, typeof messages>
  >((acc, msg) => {
    if (!acc[msg.sessionId]) acc[msg.sessionId] = []
    acc[msg.sessionId].push(msg)
    return acc
  }, {})

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-mono text-[#FF6B35] uppercase tracking-widest mb-1">
            Replix AI / Admin
          </div>
          <h1 className="text-3xl font-display font-700 text-white">Yordam Paneli</h1>
          <p className="text-[#9494B8] font-mono text-sm mt-1">
            {messages.length} ta xabar
            {unreadCount > 0 && (
              <span className="ml-2 px-1.5 py-0.5 bg-red-500/20 border border-red-500/30 text-red-400 rounded text-xs">
                {unreadCount} o&apos;qilmagan
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[#0D0D1A] border border-[#1E1E35] rounded-xl p-4 text-center">
          <div className="text-2xl font-display font-700 text-white">{messages.length}</div>
          <div className="text-xs font-mono text-[#5555AA] mt-1">Jami xabarlar</div>
        </div>
        <div className="bg-[#0D0D1A] border border-red-500/20 rounded-xl p-4 text-center">
          <div className="text-2xl font-display font-700 text-red-400">{unreadCount}</div>
          <div className="text-xs font-mono text-[#5555AA] mt-1">O&apos;qilmagan</div>
        </div>
        <div className="bg-[#0D0D1A] border border-[#1E1E35] rounded-xl p-4 text-center">
          <div className="text-2xl font-display font-700 text-[#FF6B35]">
            {Object.keys(sessions).length}
          </div>
          <div className="text-xs font-mono text-[#5555AA] mt-1">Sessiyalar</div>
        </div>
      </div>

      {/* Messages */}
      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-[#0D0D1A] border border-[#1E1E35] rounded-xl">
          <div className="text-5xl mb-4">💬</div>
          <h3 className="font-display font-600 text-white text-lg mb-2">Xabarlar yo&apos;q</h3>
          <p className="text-[#5555AA] font-mono text-sm text-center max-w-xs">
            Foydalanuvchilar chat bot orqali savol yuborganida bu yerda ko&apos;rinadi
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(sessions).map(([sid, sessionMsgs]) => {
            const latestMsg = sessionMsgs[0]
            const hasUnread = sessionMsgs.some(m => !m.isRead)
            const shortSid = sid.slice(-8)

            return (
              <div
                key={sid}
                className={`bg-[#0D0D1A] border rounded-xl overflow-hidden ${
                  hasUnread ? 'border-[#FF6B35]/30' : 'border-[#1E1E35]'
                }`}
              >
                {/* Session header */}
                <div className="px-5 py-3 border-b border-[#1E1E35] flex items-center justify-between bg-[#111122]">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-[#FF6B35]/10 border border-[#FF6B35]/20 flex items-center justify-center">
                      <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="#FF6B35" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div>
                      <span className="text-xs font-mono text-[#9494B8]">
                        Sessiya: <span className="text-[#FF6B35]">#{shortSid}</span>
                      </span>
                      <span className="ml-3 text-xs font-mono text-[#5555AA]">
                        {sessionMsgs.length} ta xabar
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasUnread && (
                      <span className="px-2 py-0.5 bg-red-500/15 border border-red-500/25 text-red-400 text-[10px] font-mono rounded">
                        Yangi
                      </span>
                    )}
                    <span className="text-xs font-mono text-[#333360]">
                      {format(new Date(latestMsg.createdAt), 'dd.MM.yyyy HH:mm')}
                    </span>
                  </div>
                </div>

                {/* Messages in session */}
                <div className="p-5 space-y-4">
                  {[...sessionMsgs].reverse().map((msg) => (
                    <div key={msg.id} className="space-y-3">
                      {/* User message */}
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="#60A5FA" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-mono text-blue-400">Foydalanuvchi</span>
                            <span className="text-[10px] font-mono text-[#333360]">
                              {format(new Date(msg.createdAt), 'HH:mm')}
                            </span>
                            {!msg.isRead && (
                              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                            )}
                          </div>
                          <div className="bg-[#111122] border border-blue-500/10 rounded-xl rounded-tl-sm px-3.5 py-2.5">
                            <p className="text-xs font-mono text-[#E8E8F5] leading-relaxed">{msg.userMsg}</p>
                          </div>
                        </div>
                      </div>

                      {/* AI message */}
                      <div className="flex items-start gap-3 ml-4">
                        <div className="w-6 h-6 rounded-full bg-[#FF6B35]/20 border border-[#FF6B35]/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="#FF6B35" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-mono text-[#FF6B35]">Replix AI</span>
                          </div>
                          <div className="bg-[#FF6B35]/5 border border-[#FF6B35]/10 rounded-xl rounded-tl-sm px-3.5 py-2.5">
                            <p className="text-xs font-mono text-[#9494B8] leading-relaxed">{msg.aiMsg}</p>
                          </div>
                        </div>
                      </div>

                      {/* Admin reply (if exists) */}
                      {msg.adminReply && (
                        <div className="flex items-start gap-3 ml-4">
                          <div className="w-6 h-6 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="#10B981" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-mono text-green-400">Admin javobi</span>
                            </div>
                            <div className="bg-green-500/5 border border-green-500/15 rounded-xl rounded-tl-sm px-3.5 py-2.5">
                              <p className="text-xs font-mono text-[#9494B8] leading-relaxed">{msg.adminReply}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Admin reply form */}
                      <div className="ml-10">
                        <AdminReplyForm messageId={msg.id} hasReply={!!msg.adminReply} isRead={msg.isRead} />
                      </div>

                      {/* Separator */}
                      <div className="border-t border-[#1E1E35] last:hidden" />
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
