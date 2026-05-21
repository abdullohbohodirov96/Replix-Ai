'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  messageId: string
  hasReply: boolean
  isRead: boolean
}

export default function AdminReplyForm({ messageId, hasReply, isRead }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [reply, setReply] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const markAsRead = async () => {
    if (isRead) return
    try {
      await fetch(`/api/support/${messageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: true }),
      })
      router.refresh()
    } catch {
      // Ignore
    }
  }

  const handleSubmit = async () => {
    if (!reply.trim() || loading) return
    setLoading(true)
    try {
      const res = await fetch(`/api/support/${messageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminReply: reply.trim(), isRead: true }),
      })
      if (res.ok) {
        setReply('')
        setShowForm(false)
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  if (showForm) {
    return (
      <div className="space-y-2 mt-2">
        <textarea
          value={reply}
          onChange={e => setReply(e.target.value)}
          placeholder="Admin javobini yozing..."
          rows={3}
          className="w-full bg-[#111122] border border-[#1E1E35] focus:border-[#FF6B35]/50 text-[#E8E8F5] text-xs font-mono rounded-lg px-3 py-2.5 focus:outline-none transition-colors resize-none placeholder:text-[#333360]"
        />
        <div className="flex items-center gap-2">
          <button
            onClick={handleSubmit}
            disabled={!reply.trim() || loading}
            className="px-3 py-1.5 bg-green-500/15 hover:bg-green-500/25 border border-green-500/25 text-green-400 text-xs font-mono rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? 'Yuborilmoqda...' : 'Javob yuborish'}
          </button>
          <button
            onClick={() => { setShowForm(false); setReply('') }}
            className="px-3 py-1.5 bg-[#161628] hover:bg-[#1E1E35] border border-[#1E1E35] text-[#9494B8] text-xs font-mono rounded-lg transition-colors"
          >
            Bekor
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 mt-1">
      <button
        onClick={() => setShowForm(true)}
        className="px-2.5 py-1 bg-[#111122] hover:bg-[#161628] border border-[#1E1E35] text-[#5555AA] hover:text-[#9494B8] text-[10px] font-mono rounded-lg transition-colors"
      >
        {hasReply ? 'Javobni o\'zgartirish' : '+ Javob berish'}
      </button>
      {!isRead && (
        <button
          onClick={markAsRead}
          className="px-2.5 py-1 bg-[#111122] hover:bg-[#161628] border border-[#1E1E35] text-[#5555AA] hover:text-green-400 text-[10px] font-mono rounded-lg transition-colors"
        >
          O&apos;qilgan deb belgilash
        </button>
      )}
    </div>
  )
}
