'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Project = {
  id: string
  name: string
  adminEmail: string | null
  createdAt: string
  _count: { users: number; managers: number }
}

export default function ProjectsClient({ projects }: { projects: Project[] }) {
  const router = useRouter()
  const refresh = () => router.refresh()

  const [showAdd, setShowAdd] = useState(false)
  const [name, setName] = useState('')
  const [adminName, setAdminName] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const createProject = async () => {
    if (!name.trim() || !adminEmail.trim() || !adminPassword.trim()) {
      setError('Ism, admin email va parol majburiy')
      return
    }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, adminName: adminName || adminEmail, adminEmail, adminPassword }),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error || 'Xatolik yuz berdi')
        return
      }
      setName(''); setAdminName(''); setAdminEmail(''); setAdminPassword('')
      setShowAdd(false)
      refresh()
    } finally {
      setSaving(false)
    }
  }

  const deleteProject = async (id: string) => {
    if (!confirm("Projectni o'chirish? Barcha ma'lumotlar o'chadi.")) return
    await fetch(`/api/projects?id=${id}`, { method: 'DELETE' })
    refresh()
  }

  return (
    <div className="animate-fade-up max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Projectlar boshqaruvi</h1>
          <p className="text-xs text-text-muted mt-0.5">CEO / Superadmin paneli — har bir project alohida workspace</p>
        </div>
        <button onClick={() => setShowAdd(v => !v)}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-brand-orange hover:bg-brand-orange-hover rounded-md transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Yangi project
        </button>
      </div>

      {showAdd && (
        <div className="card p-5 mb-6">
          <div className="section-title mb-4">Yangi project yaratish</div>
          {error && <div className="mb-3 px-3 py-2 bg-status-danger/10 border border-status-danger/20 rounded-md text-xs text-status-danger">{error}</div>}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="col-span-2">
              <label className="text-xs text-text-muted mb-1 block">Project nomi *</label>
              <input value={name} onChange={e => setName(e.target.value)} className="input-field" placeholder="Masalan: Dunya Bunya Company" />
            </div>
            <div>
              <label className="text-xs text-text-muted mb-1 block">Admin ismi</label>
              <input value={adminName} onChange={e => setAdminName(e.target.value)} className="input-field" placeholder="Abdulloh Bohodirov" />
            </div>
            <div>
              <label className="text-xs text-text-muted mb-1 block">Admin email *</label>
              <input value={adminEmail} onChange={e => setAdminEmail(e.target.value)} className="input-field" placeholder="admin@company.uz" type="email" />
            </div>
            <div>
              <label className="text-xs text-text-muted mb-1 block">Admin paroli *</label>
              <input value={adminPassword} onChange={e => setAdminPassword(e.target.value)} className="input-field" placeholder="Kuchli parol" type="password" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={createProject} disabled={saving || !name.trim() || !adminEmail.trim() || !adminPassword.trim()}
              className="px-4 py-2 text-sm font-semibold text-white bg-brand-orange rounded-md disabled:opacity-50">
              {saving ? "Yaratilmoqda..." : "Yaratish"}
            </button>
            <button onClick={() => { setShowAdd(false); setError('') }} className="px-4 py-2 text-sm text-text-muted border border-bg-border rounded-md hover:bg-bg-elevated">Bekor</button>
          </div>
        </div>
      )}

      {projects.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="text-text-muted text-sm">Hali projectlar yaratilmagan</div>
          <p className="text-xs text-text-dim mt-1">Har bir project — alohida kompaniya workspace&apos;i</p>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map(p => (
            <div key={p.id} className="card p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-brand-orange-dim flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-brand-orange">{p.name.charAt(0).toUpperCase()}</span>
                </div>
                <div>
                  <div className="font-bold text-text-primary">{p.name}</div>
                  <div className="text-xs text-text-muted mt-0.5">{p.adminEmail || 'Admin email yo\'q'}</div>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-sm font-bold text-text-primary">{p._count.managers}</div>
                  <div className="text-xs text-text-muted">Menejerlar</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-bold text-text-primary">{p._count.users}</div>
                  <div className="text-xs text-text-muted">Foydalanuvchilar</div>
                </div>
                <div className="text-xs text-text-muted">
                  {new Date(p.createdAt).toLocaleDateString('uz-UZ')}
                </div>
                <button onClick={() => deleteProject(p.id)} className="text-xs text-status-danger hover:text-red-400 font-semibold transition-colors px-2 py-1">
                  O&apos;chirish
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
