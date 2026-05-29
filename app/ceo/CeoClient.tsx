'use client'
import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type Admin = { id: string; name: string; email: string; createdAt: string }
type Manager = {
  id: string
  name: string
  email: string | null
  phone: string | null
  position: string | null
  createdAt: string
}
type ProjectData = {
  id: string
  name: string
  adminEmail: string | null
  createdAt: string
  company: { id: string; name: string; description: string | null } | null
  admins: Admin[]
  managers: Manager[]
  totalCalls: number
  sales: number
  maxManagers: number
  maxAdmins: number
  dailyLimitMinutes: number
  features: Record<string, boolean>
  todayUsageMinutes: number
}

const FEATURES = [
  { key: 'transcription', label: 'Transkripsiya', desc: "Audio matnini ko'rish" },
  { key: 'aiAnalysis', label: 'AI Tahlil', desc: 'Avtomatik AI suhbat tahlili' },
  { key: 'scoring', label: 'Ball tizimi', desc: 'Suhbat ballini hisoblash (0-100)' },
  { key: 'leadQuality', label: 'Lid sifati', desc: 'Lead sifatini baholash' },
  { key: 'reports', label: 'Hisobotlar', desc: 'Kunlik va oylik hisobotlar' },
  { key: 'criteria', label: 'Suhbat mezonlari', desc: 'Maxsus mezonlarni boshqarish' },
  { key: 'dashboard', label: 'Dashboard', desc: 'Umumiy statistika sahifasi' },
]

const TrashIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
)

export default function CeoClient({ allProjects: init }: { allProjects: ProjectData[] }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const refresh = () => startTransition(() => router.refresh())

  const [projects, setProjects] = useState(init)
  const [selectedId, setSelectedId] = useState<string | null>(init[0]?.id ?? null)
  const [tab, setTab] = useState<'admins' | 'managers' | 'limits' | 'features'>('admins')
  const [showCreate, setShowCreate] = useState(false)
  const [search, setSearch] = useState('')

  const selected = projects.find(p => p.id === selectedId) ?? null
  const filtered = projects.filter(
    p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.adminEmail || '').toLowerCase().includes(search.toLowerCase())
  )

  // Create project
  const [projName, setProjName] = useState('')
  const [projAdminName, setProjAdminName] = useState('')
  const [projAdminEmail, setProjAdminEmail] = useState('')
  const [projAdminPass, setProjAdminPass] = useState('')
  const [projSaving, setProjSaving] = useState(false)
  const [projError, setProjError] = useState('')

  // Admin form
  const [newAdminName, setNewAdminName] = useState('')
  const [newAdminEmail, setNewAdminEmail] = useState('')
  const [newAdminPass, setNewAdminPass] = useState('')
  const [adminSaving, setAdminSaving] = useState(false)
  const [adminError, setAdminError] = useState('')
  const [showAddAdmin, setShowAddAdmin] = useState(false)

  // Manager form
  const [newMgrName, setNewMgrName] = useState('')
  const [newMgrEmail, setNewMgrEmail] = useState('')
  const [newMgrPhone, setNewMgrPhone] = useState('')
  const [newMgrPos, setNewMgrPos] = useState('')
  const [mgrSaving, setMgrSaving] = useState(false)
  const [mgrError, setMgrError] = useState('')
  const [showAddMgr, setShowAddMgr] = useState(false)

  // Limits
  const [limitMaxMgr, setLimitMaxMgr] = useState(10)
  const [limitMaxAdm, setLimitMaxAdm] = useState(3)
  const [limitDaily, setLimitDaily] = useState(120)
  const [limitSaving, setLimitSaving] = useState(false)

  // Features
  const [editFeatures, setEditFeatures] = useState<Record<string, boolean>>({})
  const [featSaving, setFeatSaving] = useState(false)

  useEffect(() => {
    setProjects(init)
  }, [init])

  useEffect(() => {
    if (selected) {
      setLimitMaxMgr(selected.maxManagers)
      setLimitMaxAdm(selected.maxAdmins)
      setLimitDaily(selected.dailyLimitMinutes)
      setEditFeatures(selected.features || {})
      setAdminError('')
      setMgrError('')
      setShowAddAdmin(false)
      setShowAddMgr(false)
    }
  }, [selected?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const createProject = async () => {
    if (!projName.trim() || !projAdminEmail.trim() || !projAdminPass.trim()) {
      setProjError('Nomi, admin email va parol majburiy')
      return
    }
    setProjSaving(true)
    setProjError('')
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: projName,
          adminName: projAdminName || projAdminEmail,
          adminEmail: projAdminEmail,
          adminPassword: projAdminPass,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setProjError(data.error || 'Xatolik')
        return
      }
      setProjName('')
      setProjAdminName('')
      setProjAdminEmail('')
      setProjAdminPass('')
      setShowCreate(false)
      refresh()
    } finally {
      setProjSaving(false)
    }
  }

  const deleteProject = async (id: string) => {
    if (!confirm("Kompaniyani o'chirish? Barcha ma'lumotlar o'chadi.")) return
    setProjects(prev => prev.filter(p => p.id !== id))
    if (selectedId === id) setSelectedId(projects.find(p => p.id !== id)?.id ?? null)
    await fetch(`/api/projects?id=${id}`, { method: 'DELETE' })
    refresh()
  }

  const addAdmin = async () => {
    if (!selected || !newAdminEmail.trim() || !newAdminPass.trim()) return
    setAdminSaving(true)
    setAdminError('')
    try {
      const res = await fetch('/api/projects/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selected.id,
          name: newAdminName || newAdminEmail,
          email: newAdminEmail,
          password: newAdminPass,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setAdminError(data.error || 'Xatolik')
        return
      }
      const newAdmin = { ...data, createdAt: data.createdAt || new Date().toISOString() }
      setProjects(prev =>
        prev.map(p =>
          p.id === selected.id ? { ...p, admins: [newAdmin, ...p.admins] } : p
        )
      )
      setNewAdminName('')
      setNewAdminEmail('')
      setNewAdminPass('')
      setShowAddAdmin(false)
    } finally {
      setAdminSaving(false)
    }
  }

  const removeAdmin = async (adminId: string) => {
    if (!selected || !confirm("Adminni o'chirish?")) return
    setProjects(prev =>
      prev.map(p =>
        p.id === selected.id ? { ...p, admins: p.admins.filter(a => a.id !== adminId) } : p
      )
    )
    await fetch(`/api/projects/admins?id=${adminId}`, { method: 'DELETE' })
  }

  const addManager = async () => {
    if (!selected || !newMgrName.trim()) return
    setMgrSaving(true)
    setMgrError('')
    try {
      const res = await fetch('/api/ceo/managers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selected.id,
          name: newMgrName,
          email: newMgrEmail || undefined,
          phone: newMgrPhone || undefined,
          position: newMgrPos || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMgrError(data.error || 'Xatolik')
        return
      }
      setProjects(prev =>
        prev.map(p =>
          p.id === selected.id
            ? {
                ...p,
                managers: [
                  { ...data, createdAt: data.createdAt || new Date().toISOString() },
                  ...p.managers,
                ],
              }
            : p
        )
      )
      setNewMgrName('')
      setNewMgrEmail('')
      setNewMgrPhone('')
      setNewMgrPos('')
      setShowAddMgr(false)
    } finally {
      setMgrSaving(false)
    }
  }

  const removeManager = async (mgrId: string) => {
    if (!selected || !confirm("Managerni o'chirish? Uning barcha qo'ng'iroqlari ham o'chadi.")) return
    setProjects(prev =>
      prev.map(p =>
        p.id === selected.id ? { ...p, managers: p.managers.filter(m => m.id !== mgrId) } : p
      )
    )
    await fetch(`/api/managers/${mgrId}`, { method: 'DELETE' })
  }

  const saveProjectLimits = async () => {
    if (!selected) return
    setLimitSaving(true)
    try {
      await fetch('/api/projects/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selected.id,
          maxManagers: limitMaxMgr,
          maxAdmins: limitMaxAdm,
          dailyLimitMinutes: limitDaily,
        }),
      })
      setProjects(prev =>
        prev.map(p =>
          p.id === selected.id
            ? { ...p, maxManagers: limitMaxMgr, maxAdmins: limitMaxAdm, dailyLimitMinutes: limitDaily }
            : p
        )
      )
    } finally {
      setLimitSaving(false)
    }
  }

  const saveProjectFeatures = async () => {
    if (!selected) return
    setFeatSaving(true)
    try {
      await fetch('/api/projects/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selected.id, features: editFeatures }),
      })
      setProjects(prev =>
        prev.map(p => (p.id === selected.id ? { ...p, features: editFeatures } : p))
      )
    } finally {
      setFeatSaving(false)
    }
  }

  return (
    <div className="flex gap-5" style={{ minHeight: 'calc(100vh - 80px)' }}>
      {/* LEFT PANEL */}
      <div className="w-72 flex-shrink-0 flex flex-col gap-2">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-lg font-bold text-text-primary">CEO Paneli</h1>
          <button
            onClick={() => {
              setShowCreate(true)
              setSelectedId(null)
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-brand-orange hover:opacity-90 rounded-lg transition-opacity"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Yangi
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Qidirish..."
            className="w-full pl-7 pr-3 py-1.5 text-xs bg-bg-card border border-bg-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-brand-orange/40"
          />
        </div>

        {/* Companies list */}
        <div className="flex-1 overflow-y-auto space-y-1.5">
          {filtered.length === 0 && (
            <div className="text-center py-8 text-xs text-text-muted">Kompaniyalar yo&apos;q</div>
          )}
          {filtered.map(p => (
            <button
              key={p.id}
              onClick={() => {
                setSelectedId(p.id)
                setShowCreate(false)
              }}
              className={`w-full text-left p-3 rounded-xl border transition-all ${
                selectedId === p.id && !showCreate
                  ? 'bg-brand-orange-dim border-brand-orange/40'
                  : 'bg-bg-card border-bg-border hover:bg-bg-elevated'
              }`}
            >
              <div className="flex items-center gap-2.5 mb-2">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0"
                  style={{ background: '#f9731620', color: '#f97316' }}
                >
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-text-primary truncate">{p.name}</div>
                  <div className="text-xs text-text-muted truncate">{p.adminEmail || '—'}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 pt-1.5 border-t border-bg-border">
                <span className="text-xs text-text-muted">
                  <span className="font-semibold text-text-secondary">{p.managers.length}</span>/
                  {p.maxManagers} mgr
                </span>
                <span className="text-xs text-text-muted">
                  <span className="font-semibold text-text-secondary">{p.admins.length}</span>/
                  {p.maxAdmins} adm
                </span>
                <span className="text-xs text-text-muted">
                  <span className="font-semibold text-[#22c55e]">{p.sales}</span> sotuv
                </span>
              </div>
              {/* Daily usage mini bar */}
              <div className="mt-1.5 w-full h-1 bg-bg-elevated rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-orange/60 rounded-full"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round((p.todayUsageMinutes / Math.max(1, p.dailyLimitMinutes)) * 100)
                    )}%`,
                  }}
                />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="flex-1 min-w-0">
        {showCreate ? (
          /* Create project form */
          <div className="bg-bg-card border border-bg-border rounded-xl p-6 max-w-lg">
            <div className="text-base font-bold text-text-primary mb-4">Yangi kompaniya yaratish</div>
            {projError && (
              <div className="mb-3 px-3 py-2 bg-status-danger/10 border border-status-danger/20 rounded-md text-xs text-status-danger">
                {projError}
              </div>
            )}
            <div className="space-y-3">
              <div>
                <label className="text-xs text-text-muted mb-1.5 block">Kompaniya nomi *</label>
                <input
                  value={projName}
                  onChange={e => setProjName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-bg-base border border-bg-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-brand-orange/40"
                  placeholder="Masalan: ABC Kompaniyasi"
                />
              </div>
              <div>
                <label className="text-xs text-text-muted mb-1.5 block">Admin ismi</label>
                <input
                  value={projAdminName}
                  onChange={e => setProjAdminName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-bg-base border border-bg-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-brand-orange/40"
                  placeholder="Admin ismi"
                />
              </div>
              <div>
                <label className="text-xs text-text-muted mb-1.5 block">Admin email *</label>
                <input
                  value={projAdminEmail}
                  onChange={e => setProjAdminEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-bg-base border border-bg-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-brand-orange/40"
                  placeholder="admin@company.uz"
                  type="email"
                />
              </div>
              <div>
                <label className="text-xs text-text-muted mb-1.5 block">Admin paroli *</label>
                <input
                  value={projAdminPass}
                  onChange={e => setProjAdminPass(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-bg-base border border-bg-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-brand-orange/40"
                  type="password"
                  placeholder="Kuchli parol"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={createProject}
                disabled={projSaving || !projName.trim() || !projAdminEmail.trim() || !projAdminPass.trim()}
                className="px-5 py-2 text-sm font-semibold text-white bg-brand-orange rounded-lg disabled:opacity-50 transition-opacity"
              >
                {projSaving ? 'Yaratilmoqda...' : 'Yaratish'}
              </button>
              <button
                onClick={() => {
                  setShowCreate(false)
                  setProjError('')
                }}
                className="px-4 py-2 text-sm text-text-muted border border-bg-border rounded-lg hover:bg-bg-elevated transition-colors"
              >
                Bekor
              </button>
            </div>
          </div>
        ) : selected ? (
          <div className="space-y-4">
            {/* Header */}
            <div className="bg-bg-card border border-bg-border rounded-xl p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-bold flex-shrink-0"
                    style={{
                      background: '#f9731620',
                      color: '#f97316',
                      border: '2px solid #f9731630',
                    }}
                  >
                    {selected.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-xl font-bold text-text-primary">{selected.name}</div>
                    <div className="text-sm text-text-muted mt-0.5">{selected.adminEmail || '—'}</div>
                    <div className="text-xs text-text-muted mt-0.5">
                      Yaratilgan:{' '}
                      {new Date(selected.createdAt).toLocaleDateString('uz-UZ')}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => deleteProject(selected.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-status-danger/10 hover:bg-status-danger/20 text-status-danger rounded-lg border border-status-danger/20 transition-colors"
                >
                  <TrashIcon /> O&apos;chirish
                </button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-5 gap-2.5 mb-3">
                <div className="rounded-lg p-3 text-center bg-bg-elevated">
                  <div className="text-lg font-bold text-text-primary">{selected.managers.length}</div>
                  <div className="text-[10px] text-text-muted">/{selected.maxManagers} mgr</div>
                </div>
                <div className="rounded-lg p-3 text-center bg-bg-elevated">
                  <div className="text-lg font-bold text-text-primary">{selected.admins.length}</div>
                  <div className="text-[10px] text-text-muted">/{selected.maxAdmins} adm</div>
                </div>
                <div className="rounded-lg p-3 text-center bg-bg-elevated">
                  <div className="text-lg font-bold text-[#3b82f6]">{selected.totalCalls}</div>
                  <div className="text-[10px] text-text-muted">tahlil</div>
                </div>
                <div className="rounded-lg p-3 text-center bg-bg-elevated">
                  <div className="text-lg font-bold text-[#22c55e]">{selected.sales}</div>
                  <div className="text-[10px] text-text-muted">sotuv</div>
                </div>
                <div className="rounded-lg p-3 text-center bg-bg-elevated">
                  <div className="text-lg font-bold text-brand-orange">
                    {selected.totalCalls > 0
                      ? Math.round((selected.sales / selected.totalCalls) * 100)
                      : 0}
                    %
                  </div>
                  <div className="text-[10px] text-text-muted">konv.</div>
                </div>
              </div>

              {/* Daily usage */}
              <div className="p-2.5 rounded-lg bg-bg-elevated flex items-center gap-3">
                <span className="text-xs text-text-muted flex-shrink-0">Bugun:</span>
                <div className="flex-1 h-2 bg-bg-base rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-orange rounded-full"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round(
                          (selected.todayUsageMinutes / Math.max(1, selected.dailyLimitMinutes)) * 100
                        )
                      )}%`,
                    }}
                  />
                </div>
                <span className="text-xs font-semibold text-brand-orange flex-shrink-0">
                  {selected.todayUsageMinutes}/{selected.dailyLimitMinutes}min
                </span>
              </div>
            </div>

            {/* Inner tabs */}
            <div className="flex gap-1 border-b border-bg-border">
              {(['admins', 'managers', 'limits', 'features'] as const).map(t => {
                const labels = {
                  admins: 'Adminlar',
                  managers: 'Menejerlar',
                  limits: 'Limitlar',
                  features: 'Funksiyalar',
                }
                const counts: Record<string, number | null> = {
                  admins: selected.admins.length,
                  managers: selected.managers.length,
                  limits: null,
                  features: null,
                }
                return (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`flex items-center gap-1.5 px-4 pb-2.5 pt-0.5 text-xs font-semibold border-b-2 transition-all ${
                      tab === t
                        ? 'border-brand-orange text-text-primary'
                        : 'border-transparent text-text-muted hover:text-text-primary'
                    }`}
                  >
                    {labels[t]}
                    {counts[t] !== null && (
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          tab === t ? 'bg-brand-orange text-white' : 'bg-bg-elevated text-text-muted'
                        }`}
                      >
                        {counts[t]}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* ---- ADMINLAR ---- */}
            {tab === 'admins' && (
              <div className="space-y-3">
                <div className="bg-bg-card border border-bg-border rounded-xl divide-y divide-bg-border overflow-hidden">
                  {selected.admins.length === 0 && (
                    <div className="p-6 text-center text-xs text-text-muted">Adminlar yo&apos;q</div>
                  )}
                  {selected.admins.map(admin => (
                    <div key={admin.id} className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#3b82f620] flex items-center justify-center text-xs font-bold text-[#3b82f6]">
                          {admin.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-text-primary">{admin.name}</div>
                          <div className="text-xs text-text-muted">{admin.email}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => removeAdmin(admin.id)}
                        className="w-7 h-7 flex items-center justify-center rounded text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  ))}
                </div>

                {!showAddAdmin ? (
                  <button
                    onClick={() => setShowAddAdmin(true)}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-brand-orange border border-brand-orange/30 rounded-lg hover:bg-brand-orange-dim transition-colors"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Yangi admin qo&apos;shish
                  </button>
                ) : (
                  <div className="bg-bg-card border border-bg-border rounded-xl p-4">
                    <div className="text-xs font-semibold text-text-secondary mb-3">Yangi admin</div>
                    {adminError && (
                      <div className="mb-2 text-xs text-red-400">{adminError}</div>
                    )}
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <input
                        value={newAdminName}
                        onChange={e => setNewAdminName(e.target.value)}
                        placeholder="Ism"
                        className="px-3 py-2 text-xs bg-bg-base border border-bg-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-brand-orange/40"
                      />
                      <input
                        value={newAdminEmail}
                        onChange={e => setNewAdminEmail(e.target.value)}
                        placeholder="Email *"
                        type="email"
                        className="px-3 py-2 text-xs bg-bg-base border border-bg-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-brand-orange/40"
                      />
                      <input
                        value={newAdminPass}
                        onChange={e => setNewAdminPass(e.target.value)}
                        placeholder="Parol *"
                        type="password"
                        className="px-3 py-2 text-xs bg-bg-base border border-bg-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-brand-orange/40 col-span-2"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={addAdmin}
                        disabled={adminSaving || !newAdminEmail.trim() || !newAdminPass.trim()}
                        className="px-4 py-1.5 text-xs font-semibold text-white bg-brand-orange rounded-lg disabled:opacity-50 transition-opacity"
                      >
                        {adminSaving ? "Qo'shilmoqda..." : "Qo'shish"}
                      </button>
                      <button
                        onClick={() => {
                          setShowAddAdmin(false)
                          setAdminError('')
                        }}
                        className="px-3 py-1.5 text-xs text-text-muted border border-bg-border rounded-lg hover:bg-bg-elevated transition-colors"
                      >
                        Bekor
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ---- MENEJERLAR ---- */}
            {tab === 'managers' && (
              <div className="space-y-3">
                <div className="bg-bg-card border border-bg-border rounded-xl divide-y divide-bg-border overflow-hidden">
                  {selected.managers.length === 0 && (
                    <div className="p-6 text-center text-xs text-text-muted">Menejerlar yo&apos;q</div>
                  )}
                  {selected.managers.map(mgr => (
                    <div key={mgr.id} className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#22c55e20] flex items-center justify-center text-xs font-bold text-[#22c55e]">
                          {mgr.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-text-primary">{mgr.name}</div>
                          <div className="text-xs text-text-muted">
                            {mgr.email || mgr.phone || mgr.position || '—'}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => removeManager(mgr.id)}
                        className="w-7 h-7 flex items-center justify-center rounded text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  ))}
                </div>

                {!showAddMgr ? (
                  <button
                    onClick={() => setShowAddMgr(true)}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-[#22c55e] border border-[#22c55e30] rounded-lg hover:bg-[#22c55e10] transition-colors"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Yangi menejer qo&apos;shish
                  </button>
                ) : (
                  <div className="bg-bg-card border border-bg-border rounded-xl p-4">
                    <div className="text-xs font-semibold text-text-secondary mb-3">Yangi menejer</div>
                    {mgrError && <div className="mb-2 text-xs text-red-400">{mgrError}</div>}
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <input
                        value={newMgrName}
                        onChange={e => setNewMgrName(e.target.value)}
                        placeholder="Ism *"
                        className="px-3 py-2 text-xs bg-bg-base border border-bg-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-brand-orange/40 col-span-2"
                      />
                      <input
                        value={newMgrEmail}
                        onChange={e => setNewMgrEmail(e.target.value)}
                        placeholder="Email"
                        type="email"
                        className="px-3 py-2 text-xs bg-bg-base border border-bg-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-brand-orange/40"
                      />
                      <input
                        value={newMgrPhone}
                        onChange={e => setNewMgrPhone(e.target.value)}
                        placeholder="Telefon"
                        className="px-3 py-2 text-xs bg-bg-base border border-bg-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-brand-orange/40"
                      />
                      <input
                        value={newMgrPos}
                        onChange={e => setNewMgrPos(e.target.value)}
                        placeholder="Lavozim"
                        className="px-3 py-2 text-xs bg-bg-base border border-bg-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-brand-orange/40 col-span-2"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={addManager}
                        disabled={mgrSaving || !newMgrName.trim()}
                        className="px-4 py-1.5 text-xs font-semibold text-white bg-[#22c55e] hover:bg-[#16a34a] rounded-lg disabled:opacity-50 transition-colors"
                      >
                        {mgrSaving ? "Qo'shilmoqda..." : "Qo'shish"}
                      </button>
                      <button
                        onClick={() => {
                          setShowAddMgr(false)
                          setMgrError('')
                        }}
                        className="px-3 py-1.5 text-xs text-text-muted border border-bg-border rounded-lg hover:bg-bg-elevated transition-colors"
                      >
                        Bekor
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ---- LIMITLAR ---- */}
            {tab === 'limits' && (
              <div className="bg-bg-card border border-bg-border rounded-xl p-5 space-y-5">
                <div>
                  <label className="text-xs font-semibold text-text-muted mb-2 block">
                    Har kunlik audio limiti
                  </label>
                  <div className="flex items-center gap-3 mb-2">
                    <input
                      type="number"
                      min={1}
                      max={600}
                      value={limitDaily}
                      onChange={e => setLimitDaily(Math.max(1, Number(e.target.value)))}
                      className="w-24 text-center px-3 py-2 text-sm bg-bg-base border border-bg-border rounded-lg text-text-primary focus:outline-none focus:border-brand-orange/40"
                    />
                    <span className="text-xs text-text-muted">
                      daqiqa = {Math.floor(limitDaily / 60)}h {limitDaily % 60}min
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[30, 60, 120, 240, 480].map(m => (
                      <button
                        key={m}
                        onClick={() => setLimitDaily(m)}
                        className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${
                          limitDaily === m
                            ? 'bg-brand-orange text-white border-brand-orange'
                            : 'border-bg-border text-text-muted hover:bg-bg-elevated'
                        }`}
                      >
                        {m < 60 ? `${m}min` : `${m / 60}s`}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-text-muted mb-2 block">
                    Maksimal menejerlar
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={limitMaxMgr}
                    onChange={e => setLimitMaxMgr(Math.max(1, Number(e.target.value)))}
                    className="w-28 text-center px-3 py-2 text-sm bg-bg-base border border-bg-border rounded-lg text-text-primary focus:outline-none focus:border-brand-orange/40"
                  />
                  <div className="text-xs text-text-muted mt-1">
                    Hozir: {selected.managers.length} ta menejer
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-text-muted mb-2 block">
                    Maksimal adminlar
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={limitMaxAdm}
                    onChange={e => setLimitMaxAdm(Math.max(1, Number(e.target.value)))}
                    className="w-28 text-center px-3 py-2 text-sm bg-bg-base border border-bg-border rounded-lg text-text-primary focus:outline-none focus:border-brand-orange/40"
                  />
                  <div className="text-xs text-text-muted mt-1">
                    Hozir: {selected.admins.length} ta admin
                  </div>
                </div>
                <button
                  onClick={saveProjectLimits}
                  disabled={limitSaving}
                  className="px-5 py-2 text-sm font-semibold text-white bg-brand-orange rounded-lg disabled:opacity-50 transition-opacity"
                >
                  {limitSaving ? 'Saqlanmoqda...' : 'Saqlash'}
                </button>
              </div>
            )}

            {/* ---- FUNKSIYALAR ---- */}
            {tab === 'features' && (
              <div className="bg-bg-card border border-bg-border rounded-xl p-5">
                <div className="space-y-2.5 mb-4">
                  {FEATURES.map(feat => {
                    const enabled = editFeatures[feat.key] !== false
                    return (
                      <div
                        key={feat.key}
                        className="flex items-center justify-between p-3 rounded-lg bg-bg-elevated"
                      >
                        <div>
                          <div className="text-sm font-semibold text-text-primary">{feat.label}</div>
                          <div className="text-xs text-text-muted">{feat.desc}</div>
                        </div>
                        <button
                          onClick={() =>
                            setEditFeatures(prev => ({ ...prev, [feat.key]: !enabled }))
                          }
                          className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${
                            enabled ? 'bg-brand-orange' : 'bg-bg-border'
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                              enabled ? 'translate-x-5' : 'translate-x-0.5'
                            }`}
                          />
                        </button>
                      </div>
                    )
                  })}
                </div>
                <button
                  onClick={saveProjectFeatures}
                  disabled={featSaving}
                  className="px-5 py-2 text-sm font-semibold text-white bg-brand-orange rounded-lg disabled:opacity-50 transition-opacity"
                >
                  {featSaving ? 'Saqlanmoqda...' : 'Saqlash'}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-brand-orange-dim flex items-center justify-center mb-4">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#f97316"
                strokeWidth="1.75"
              >
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
            <div className="text-sm font-semibold text-text-secondary mb-1">
              Kompaniya tanlang
            </div>
            <div className="text-xs text-text-muted">Yoki yangi kompaniya yarating</div>
          </div>
        )}
      </div>
    </div>
  )
}
