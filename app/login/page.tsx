'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    if (res?.error) {
      setError('Email yoki parol noto\'g\'ri')
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-[#080810] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FF6B35] to-[#FF3D00] shadow-lg shadow-orange-500/30 mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                strokeLinecap="round" strokeLinejoin="round" stroke="white" strokeWidth="2"/>
            </svg>
          </div>
          <h1 className="text-2xl font-display font-700 text-white">Dunyabunya</h1>
          <p className="text-sm font-mono text-[#5555AA] mt-1">Replix AI Analytics</p>
        </div>

        {/* Card */}
        <div className="bg-[#0D0D1A] border border-[#1E1E35] rounded-2xl p-8 shadow-2xl">
          <h2 className="text-lg font-display font-600 text-white mb-6">Tizimga kirish</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-mono text-[#9494B8] uppercase tracking-wider mb-1.5 block">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@dunyabunya.uz"
                required
                disabled={loading}
                className="w-full bg-[#111122] border border-[#1E1E35] focus:border-[#FF6B35] text-[#E8E8F5] font-mono text-sm rounded-lg px-4 py-3 focus:outline-none transition-colors disabled:opacity-50 placeholder-[#333360]"
              />
            </div>

            <div>
              <label className="text-xs font-mono text-[#9494B8] uppercase tracking-wider mb-1.5 block">
                Parol
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={loading}
                className="w-full bg-[#111122] border border-[#1E1E35] focus:border-[#FF6B35] text-[#E8E8F5] font-mono text-sm rounded-lg px-4 py-3 focus:outline-none transition-colors disabled:opacity-50 placeholder-[#333360]"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
                <p className="text-sm font-mono text-red-400">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full py-3 bg-[#FF6B35] hover:bg-[#FF5520] disabled:opacity-40 disabled:cursor-not-allowed text-white font-display font-600 rounded-lg transition-colors shadow-lg shadow-orange-500/20 mt-2"
            >
              {loading ? 'Kirilmoqda...' : 'Kirish'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs font-mono text-[#333360] mt-6">
          Dunyabunya × Replix AI v1.0
        </p>
      </div>
    </div>
  )
}
