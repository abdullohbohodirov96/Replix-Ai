'use client'

import { useState, useEffect, useCallback } from 'react'

interface User {
  id: string
  name: string
  email: string
  role: string
  createdAt: string
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'user' })
  const [error, setError] = useState('')
  const [adding, setAdding] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch('/api/users')
    if (res.ok) setUsers(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setAdding(true)
    setError('')
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setAdding(false); return }
    setForm({ name: '', email: '', password: '', role: 'user' })
    setShowForm(false)
    setAdding(false)
    load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('O\'chirishni tasdiqlaysizmi?')) return
    await fetch(`/api/users/${id}`, { method: 'DELETE' })
    load()
  }

  const handleRoleChange = async (id: string, role: string) => {
    await fetch(`/api/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })
    load()
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-mono text-[#FF6B35] uppercase tracking-widest mb-1">Admin / Foydalanuvchilar</div>
          <h1 className="text-2xl font-display font-700 text-white">Akkauntlar</h1>
          <p className="text-[#9494B8] font-mono text-sm mt-1">{users.length} ta foydalanuvchi</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#FF6B35] hover:bg-[#FF5520] text-white text-sm font-display font-600 rounded-lg transition-colors"
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Yangi akkaunt
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-[#0D0D1A] border border-[#FF6B35]/20 rounded-xl p-6">
          <h3 className="font-display font-600 text-white mb-4">Yangi foydalanuvchi</h3>
          <form onSubmit={handleAdd} className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-mono text-[#9494B8] uppercase tracking-wider mb-1.5 block">Ism *</label>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="To'liq ism" required disabled={adding}
                className="w-full bg-[#111122] border border-[#1E1E35] focus:border-[#FF6B35] text-[#E8E8F5] font-mono text-sm rounded-lg px-3 py-2.5 focus:outline-none transition-colors" />
            </div>
            <div>
              <label className="text-xs font-mono text-[#9494B8] uppercase tracking-wider mb-1.5 block">Email *</label>
              <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="user@dunyabunya.uz" required disabled={adding}
                className="w-full bg-[#111122] border border-[#1E1E35] focus:border-[#FF6B35] text-[#E8E8F5] font-mono text-sm rounded-lg px-3 py-2.5 focus:outline-none transition-colors" />
            </div>
            <div>
              <label className="text-xs font-mono text-[#9494B8] uppercase tracking-wider mb-1.5 block">Parol *</label>
              <input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                placeholder="Kamida 6 ta belgi" required disabled={adding}
                className="w-full bg-[#111122] border border-[#1E1E35] focus:border-[#FF6B35] text-[#E8E8F5] font-mono text-sm rounded-lg px-3 py-2.5 focus:outline-none transition-colors" />
            </div>
            <div>
              <label className="text-xs font-mono text-[#9494B8] uppercase tracking-wider mb-1.5 block">Rol *</label>
              <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} disabled={adding}
                className="w-full bg-[#111122] border border-[#1E1E35] focus:border-[#FF6B35] text-[#E8E8F5] font-mono text-sm rounded-lg px-3 py-2.5 focus:outline-none transition-colors">
                <option value="user">Oddiy foydalanuvchi</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            {error && <div className="col-span-2 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2"><p className="text-sm font-mono text-red-400">{error}</p></div>}
            <div className="col-span-2 flex gap-3">
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2.5 bg-[#161628] text-[#9494B8] text-sm font-display rounded-lg transition-colors hover:bg-[#1E1E35]">Bekor</button>
              <button type="submit" disabled={adding}
                className="flex-1 py-2.5 bg-[#FF6B35] hover:bg-[#FF5520] disabled:opacity-40 text-white text-sm font-display font-600 rounded-lg transition-colors">
                {adding ? 'Yaratilmoqda...' : 'Yaratish'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users list */}
      <div className="bg-[#0D0D1A] border border-[#1E1E35] rounded-xl overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-[#5555AA] font-mono text-sm">Yuklanmoqda...</div>
        ) : users.length === 0 ? (
          <div className="py-12 text-center text-[#5555AA] font-mono text-sm">Foydalanuvchilar yo'q</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1E1E35]">
                {['Ism', 'Email', 'Rol', 'Qo\'shilgan', ''].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-mono text-[#5555AA] uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E1E35]">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-[#111122] transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#FF6B35]/10 border border-[#FF6B35]/20 flex items-center justify-center text-xs font-display font-600 text-[#FF6B35]">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-display text-white">{user.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm font-mono text-[#9494B8]">{user.email}</td>
                  <td className="px-5 py-4">
                    <select value={user.role}
                      onChange={e => handleRoleChange(user.id, e.target.value)}
                      className="bg-[#111122] border border-[#1E1E35] text-xs font-mono rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#FF6B35] transition-colors text-[#E8E8F5]">
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="px-5 py-4 text-xs font-mono text-[#5555AA]">
                    {new Date(user.createdAt).toLocaleDateString('uz-UZ')}
                  </td>
                  <td className="px-5 py-4">
                    <button onClick={() => handleDelete(user.id)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-[#333360] hover:text-red-400 hover:bg-red-500/10 transition-colors">
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
