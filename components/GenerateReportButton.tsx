'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function GenerateReportButton() {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const router = useRouter()

  const handleGenerate = async () => {
    setLoading(true)
    setDone(false)

    try {
      // Get all managers first
      const res = await fetch('/api/managers')
      const managers = await res.json()

      // Generate report for each manager
      await Promise.allSettled(
        managers.map((m: { id: string }) =>
          fetch('/api/reports', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ managerId: m.id, date: new Date().toISOString() }),
          })
        )
      )

      setDone(true)
      router.refresh()
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleGenerate}
      disabled={loading}
      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-display font-600 rounded-lg transition-all
        ${done
          ? 'bg-green-500/10 border border-green-500/20 text-green-400'
          : 'bg-[#FF6B35] hover:bg-[#FF5520] text-white shadow-lg shadow-orange-500/20'
        }
        disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {loading ? (
        <>
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          AI hisobot yozmoqda...
        </>
      ) : done ? (
        <>✓ Hisobotlar tayyor</>
      ) : (
        <>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          AI Hisobot Yaratish
        </>
      )}
    </button>
  )
}
