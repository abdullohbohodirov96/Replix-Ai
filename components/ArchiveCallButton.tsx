'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  callId: string
  isArchived: boolean
}

export default function ArchiveCallButton({ callId, isArchived }: Props) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const toggle = async () => {
    setLoading(true)
    try {
      await fetch(`/api/calls/${callId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archivedAt: isArchived ? null : new Date().toISOString() }),
      })
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className="w-7 h-7 flex items-center justify-center rounded text-text-muted hover:text-status-warning hover:bg-status-warning/10 transition-colors disabled:opacity-40"
      title={isArchived ? 'Arxivdan chiqarish' : 'Arxivlash'}
    >
      {isArchived ? (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/>
        </svg>
      ) : (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/>
        </svg>
      )}
    </button>
  )
}
