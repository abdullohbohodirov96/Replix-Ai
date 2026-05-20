'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AddManagerModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ name: '', phone: '', email: '', position: 'Sales Manager' })
  const router = useRouter()

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setError('Ism majburiy')
      return
    }
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/managers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Xatolik')
      
      setIsOpen(false)
      setForm({ name: '', phone: '', email: '', position: 'Sales Manager' })
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Xatolik')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setIsOpen(false)
    setForm({ name: '', phone: '', email: '', position: 'Sales Manager' })
    setError('')
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 bg-[#FF6B35] hover:bg-[#FF5520] text-white text-sm font-display font-600 rounded-lg transition-colors shadow-lg shadow-orange-500/20"
      >
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Manager Qo'shish
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleClose} />
          <div className="relative w-full max-w-md bg-[#0D0D1A] border border-[#1E1E35] rounded-2xl shadow-2xl animate-slide-up">
            <div className="px-6 py-5 border-b border-[#1E1E35] flex items-center justify-between">
              <h2 className="font-display font-700 text-white text-lg">Yangi Manager</h2>
              <button onClick={handleClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-[#5555AA] hover:text-white hover:bg-[#161628] transition-colors">✕</button>
            </div>

            <div className="p-6 space-y-4">
              {[
                { key: 'name', label: 'Ism Familiya *', placeholder: 'Jasur Toshmatov', type: 'text' },
                { key: 'position', label: 'Lavozim', placeholder: 'Sales Manager', type: 'text' },
                { key: 'phone', label: 'Telefon', placeholder: '+998 90 123 45 67', type: 'tel' },
                { key: 'email', label: 'Email', placeholder: 'jasur@quaramanda.uz', type: 'email' },
              ].map(field => (
                <div key={field.key}>
                  <label className="text-xs font-mono text-[#9494B8] mb-1.5 block uppercase tracking-wider">
                    {field.label}
                  </label>
                  <input
                    type={field.type}
                    value={form[field.key as keyof typeof form]}
                    onChange={e => setForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    disabled={loading}
                    className="w-full bg-[#111122] border border-[#1E1E35] focus:border-[#FF6B35] text-[#E8E8F5] text-sm font-mono rounded-lg px-3 py-2.5 focus:outline-none transition-colors disabled:opacity-50 placeholder-[#333360]"
                  />
                </div>
              ))}

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">
                  <p className="text-sm font-mono text-red-400">{error}</p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleClose}
                  className="px-4 py-2.5 bg-[#161628] hover:bg-[#1E1E35] text-[#9494B8] text-sm font-display rounded-lg transition-colors"
                >
                  Bekor
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading || !form.name.trim()}
                  className="flex-1 py-2.5 bg-[#FF6B35] hover:bg-[#FF5520] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-display font-600 rounded-lg transition-colors"
                >
                  {loading ? 'Saqlanmoqda...' : "Qo'shish"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
