'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  managerId: string
  managerName: string
}

export default function DeleteManagerButton({ managerId, managerName }: Props) {
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleDelete = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/managers/${managerId}`, { method: 'DELETE' })
      if (res.ok) {
        router.refresh()
      }
    } finally {
      setLoading(false)
      setConfirming(false)
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-1" onClick={e => e.preventDefault()}>
        <span className="text-xs font-mono text-[#9494B8] mr-1">O'chirilsinmi?</span>
        <button
          onClick={handleDelete}
          disabled={loading}
          className="px-2 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs font-mono rounded border border-red-500/30 transition-colors disabled:opacity-50"
        >
          {loading ? '...' : "Ha, o'chir"}
        </button>
        <button
          onClick={e => { e.preventDefault(); setConfirming(false) }}
          className="px-2 py-1 bg-[#161628] hover:bg-[#1E1E35] text-[#9494B8] text-xs font-mono rounded border border-[#1E1E35] transition-colors"
        >
          Bekor
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={e => { e.preventDefault(); setConfirming(true) }}
      className="w-7 h-7 flex items-center justify-center rounded-lg text-[#333360] hover:text-red-400 hover:bg-red-500/10 transition-colors"
      title={`${managerName}ni o'chirish`}
    >
      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    </button>
  )
}
