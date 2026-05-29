'use client'
import { useState, useTransition, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

type Criteria = { id: string; name: string; description: string | null; order: number; weight?: number }
type CallCategory = { id: string; name: string; description: string | null; color: string; order: number; criteria: Criteria[] }
type LeadCategory = { id: string; name: string; label: string; description: string | null; color: string; order: number; criteria: Criteria[] }
type Manager = { id: string; name: string; email: string | null; phone: string | null; position: string | null; createdAt: string }
type Integration = { id: string; name: string; enabled: boolean; config: unknown; lastSync: string | null }
type ProjectStats = {
  id: string
  name: string
  adminEmail: string | null
  createdAt: string
  company: { id: string; name: string; description: string | null } | null
  managerCount: number
  adminCount: number
  admins: { id: string; name: string; email: string; createdAt: string }[]
  totalCalls: number
  sales: number
  maxManagers: number
  maxAdmins: number
  dailyLimitMinutes: number
  features: Record<string, boolean>
  todayUsageMinutes: number
}

interface Props {
  user: { id: string; name: string | null; email: string; role: string; managerId: string | null; createdAt: Date } | null
  company: { id: string; name: string; description: string | null; industry: string | null; aiContext: string | null } | null
  callCategories: CallCategory[]
  leadCategories: LeadCategory[]
  managers: Manager[]
  integrations: Integration[]
  isAdmin: boolean
  isSuperAdmin?: boolean
  managerCount: number
  allProjects?: ProjectStats[]
}

const TABS = [
  { id: 'profile', label: 'Profil', adminOnly: false, superAdminOnly: false },
  { id: 'companies', label: 'Kompaniyalar', adminOnly: false, superAdminOnly: true },
  { id: 'criteria', label: 'Suhbat mezonlari', adminOnly: true, superAdminOnly: false },
  { id: 'metrics', label: 'Suhbat metrikalari', adminOnly: true, superAdminOnly: false },
  { id: 'lead-quality', label: 'Lid sifati', adminOnly: true, superAdminOnly: false },
  { id: 'managers', label: 'Menejerlar', adminOnly: true, superAdminOnly: false },
  { id: 'notifications', label: 'Bildirishnomalar', adminOnly: true, superAdminOnly: false },
  { id: 'integrations', label: 'Integratsiyalar', adminOnly: true, superAdminOnly: false },
]

const COLORS = ['#3b82f6', '#f97316', '#22c55e', '#ef4444', '#8b5cf6', '#06b6d4', '#f59e0b', '#ec4899']

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {COLORS.map(c => (
        <button key={c} type="button" onClick={() => onChange(c)}
          className="w-5 h-5 rounded-full border-2 transition-all flex-shrink-0"
          style={{ background: c, borderColor: value === c ? '#fff' : 'transparent', outline: value === c ? `2px solid ${c}40` : 'none' }}
        />
      ))}
    </div>
  )
}

const DragIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-dim flex-shrink-0 cursor-grab">
    <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
    <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
  </svg>
)
const TrashIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
)
const EditIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
)
const PlusIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
)

export default function ProfileClient({ user, company, callCategories: initCallCats, leadCategories: initLeadCats, managers: initManagers, integrations, isAdmin, isSuperAdmin, managerCount, allProjects = [] }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeTab = searchParams.get('tab') || 'profile'
  const [isPending, startTransition] = useTransition()

  const setTab = (tab: string) => router.push(`/profile?tab=${tab}`, { scroll: false })
  const refresh = () => startTransition(() => router.refresh())

  // Local optimistic state
  const [callCats, setCallCats] = useState(initCallCats)
  const [leadCats, setLeadCats] = useState(initLeadCats)
  const [managers, setManagers] = useState(initManagers)

  // Profile tab state
  const [editMode, setEditMode] = useState(false)
  const [name, setName] = useState(user?.name || '')
  const [saving, setSaving] = useState(false)
  const [companyName, setCompanyName] = useState(company?.name || '')
  const [companyDesc, setCompanyDesc] = useState(company?.description || '')
  const [companyIndustry, setCompanyIndustry] = useState(company?.industry || '')
  const [aiContext, setAiContext] = useState(company?.aiContext || '')
  const [compSaving, setCompSaving] = useState(false)
  const [compSaved, setCompSaved] = useState(false)

  // Criteria tab
  const [selectedCatId, setSelectedCatId] = useState<string | null>(initCallCats[0]?.id ?? null)
  const [newCatName, setNewCatName] = useState('')
  const [newCatDesc, setNewCatDesc] = useState('')
  const [newCatColor, setNewCatColor] = useState('#3b82f6')
  const [showAddCat, setShowAddCat] = useState(false)
  const [newCritName, setNewCritName] = useState('')
  const [newCritDesc, setNewCritDesc] = useState('')
  const [addCritLoading, setAddCritLoading] = useState(false)
  const selectedCat = callCats.find(c => c.id === selectedCatId)

  // Metrics tab
  const [selectedMetCatId, setSelectedMetCatId] = useState<string | null>(initCallCats[0]?.id ?? null)

  // Lead quality tab
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(initLeadCats[0]?.id ?? null)
  const [newLeadCatName, setNewLeadCatName] = useState('')
  const [newLeadCatLabel, setNewLeadCatLabel] = useState('')
  const [newLeadCatColor, setNewLeadCatColor] = useState('#f97316')
  const [showAddLeadCat, setShowAddLeadCat] = useState(false)
  const [newLeadCritName, setNewLeadCritName] = useState('')
  const [newLeadCritDesc, setNewLeadCritDesc] = useState('')
  const [leadBannerOpen, setLeadBannerOpen] = useState(true)
  const selectedLeadCat = leadCats.find(c => c.id === selectedLeadId)

  // Managers tab
  const [managerSearch, setManagerSearch] = useState('')
  const [showAddMgr, setShowAddMgr] = useState(false)
  const [newMgrName, setNewMgrName] = useState('')
  const [newMgrEmail, setNewMgrEmail] = useState('')
  const [newMgrPhone, setNewMgrPhone] = useState('')
  const [newMgrPos, setNewMgrPos] = useState('')
  const [mgrSaving, setMgrSaving] = useState(false)

  // Companies tab (superadmin)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(allProjects[0]?.id ?? null)
  const [showAddProject, setShowAddProject] = useState(false)
  const [newProjName, setNewProjName] = useState('')
  const [newProjAdminName, setNewProjAdminName] = useState('')
  const [newProjAdminEmail, setNewProjAdminEmail] = useState('')
  const [newProjAdminPass, setNewProjAdminPass] = useState('')
  const [projSaving, setProjSaving] = useState(false)
  const [projError, setProjError] = useState('')
  const selectedProject = allProjects.find(p => p.id === selectedProjectId) ?? null

  // Company detail sub-tabs
  const [companyTab, setCompanyTab] = useState<'stats' | 'limits' | 'features' | 'admins'>('stats')
  const [limitMaxMgr, setLimitMaxMgr] = useState(10)
  const [limitMaxAdm, setLimitMaxAdm] = useState(3)
  const [limitDaily, setLimitDaily] = useState(120)
  const [editFeatures, setEditFeatures] = useState<Record<string, boolean>>({})
  const [limitSaving, setLimitSaving] = useState(false)
  const [featSaving, setFeatSaving] = useState(false)
  const [localAdmins, setLocalAdmins] = useState<{ id: string; name: string; email: string; createdAt: string }[]>([])
  const [newAdminName, setNewAdminName] = useState('')
  const [newAdminEmail, setNewAdminEmail] = useState('')
  const [newAdminPass, setNewAdminPass] = useState('')
  const [adminSaving, setAdminSaving] = useState(false)
  const [adminError, setAdminError] = useState('')

  useEffect(() => {
    if (selectedProject) {
      setLimitMaxMgr(selectedProject.maxManagers)
      setLimitMaxAdm(selectedProject.maxAdmins)
      setLimitDaily(selectedProject.dailyLimitMinutes)
      setEditFeatures(selectedProject.features || {})
      setLocalAdmins(selectedProject.admins || [])
      setCompanyTab('stats')
      setAdminError('')
    }
  }, [selectedProject?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // --- API helpers ---
  const saveProfile = async () => {
    setSaving(true)
    try {
      await fetch('/api/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) })
      setEditMode(false)
      refresh()
    } finally { setSaving(false) }
  }

  const saveCompany = async () => {
    setCompSaving(true)
    try {
      await fetch('/api/company', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: companyName, description: companyDesc, industry: companyIndustry, aiContext }) })
      setCompSaved(true); setTimeout(() => setCompSaved(false), 2000)
      refresh()
    } finally { setCompSaving(false) }
  }

  const addCallCat = async () => {
    if (!newCatName.trim()) return
    const tempId = `temp_${Date.now()}`
    const tempCat: CallCategory = { id: tempId, name: newCatName, description: newCatDesc || null, color: newCatColor, order: callCats.length, criteria: [] }
    setCallCats(prev => [...prev, tempCat])
    setSelectedCatId(tempId)
    setNewCatName(''); setNewCatDesc(''); setShowAddCat(false)
    const r = await fetch('/api/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newCatName, description: newCatDesc || undefined, color: newCatColor }) })
    const cat = await r.json()
    setCallCats(prev => prev.map(c => c.id === tempId ? { ...c, id: cat.id } : c))
    setSelectedCatId(cat.id)
    refresh()
  }

  const deleteCallCat = async (id: string) => {
    if (!confirm("Kategoriyani o'chirish? Barcha mezonlar ham o'chadi.")) return
    setCallCats(prev => prev.filter(c => c.id !== id))
    if (selectedCatId === id) setSelectedCatId(callCats.find(c => c.id !== id)?.id ?? null)
    await fetch(`/api/categories?id=${id}`, { method: 'DELETE' })
    refresh()
  }

  const addCriteria = async (categoryId: string) => {
    if (!newCritName.trim()) return
    setAddCritLoading(true)
    const tempId = `temp_${Date.now()}`
    const tempCrit: Criteria = { id: tempId, name: newCritName, description: newCritDesc || null, order: selectedCat?.criteria.length ?? 0 }
    setCallCats(prev => prev.map(c => c.id === categoryId ? { ...c, criteria: [...c.criteria, tempCrit] } : c))
    setNewCritName(''); setNewCritDesc('')
    try {
      const r = await fetch('/api/criteria', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newCritName, description: newCritDesc || undefined, categoryId }) })
      const crit = await r.json()
      setCallCats(prev => prev.map(c => c.id === categoryId ? { ...c, criteria: c.criteria.map(cr => cr.id === tempId ? { ...cr, id: crit.id } : cr) } : c))
      refresh()
    } finally { setAddCritLoading(false) }
  }

  const deleteCriteria = async (catId: string, critId: string) => {
    setCallCats(prev => prev.map(c => c.id === catId ? { ...c, criteria: c.criteria.filter(cr => cr.id !== critId) } : c))
    await fetch(`/api/criteria?id=${critId}`, { method: 'DELETE' })
    refresh()
  }

  const addLeadCat = async () => {
    if (!newLeadCatLabel.trim()) return
    const autoName = newLeadCatLabel.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '') || `cat_${Date.now()}`
    const tempId = `temp_${Date.now()}`
    const tempCat: LeadCategory = { id: tempId, name: autoName, label: newLeadCatLabel, description: null, color: newLeadCatColor, order: leadCats.length, criteria: [] }
    setLeadCats(prev => [...prev, tempCat])
    setSelectedLeadId(tempId)
    setNewLeadCatLabel(''); setShowAddLeadCat(false)
    const r = await fetch('/api/lead-categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: autoName, label: newLeadCatLabel, color: newLeadCatColor }) })
    const cat = await r.json()
    setLeadCats(prev => prev.map(c => c.id === tempId ? { ...c, id: cat.id } : c))
    setSelectedLeadId(cat.id)
    refresh()
  }

  const deleteLeadCat = async (id: string) => {
    if (!confirm("Lead kategoriyasini o'chirish?")) return
    setLeadCats(prev => prev.filter(c => c.id !== id))
    if (selectedLeadId === id) setSelectedLeadId(leadCats.find(c => c.id !== id)?.id ?? null)
    await fetch(`/api/lead-categories?id=${id}`, { method: 'DELETE' })
    refresh()
  }

  const addLeadCrit = async (leadCategoryId: string) => {
    const text = newLeadCritDesc.trim()
    if (!text) return
    const tempId = `temp_${Date.now()}`
    const tempCrit: Criteria = { id: tempId, name: text, description: text, order: selectedLeadCat?.criteria.length ?? 0 }
    setLeadCats(prev => prev.map(c => c.id === leadCategoryId ? { ...c, criteria: [...c.criteria, tempCrit] } : c))
    setNewLeadCritDesc('')
    const r = await fetch('/api/lead-criteria', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: text, description: text, leadCategoryId }) })
    const crit = await r.json()
    setLeadCats(prev => prev.map(c => c.id === leadCategoryId ? { ...c, criteria: c.criteria.map(cr => cr.id === tempId ? { ...cr, id: crit.id } : cr) } : c))
    refresh()
  }

  const deleteLeadCrit = async (catId: string, critId: string) => {
    setLeadCats(prev => prev.map(c => c.id === catId ? { ...c, criteria: c.criteria.filter(cr => cr.id !== critId) } : c))
    await fetch(`/api/lead-criteria?id=${critId}`, { method: 'DELETE' })
    refresh()
  }

  const addManager = async () => {
    if (!newMgrName.trim()) return
    setMgrSaving(true)
    const tempId = `temp_${Date.now()}`
    const tempMgr: Manager = { id: tempId, name: newMgrName, email: newMgrEmail || null, phone: newMgrPhone || null, position: newMgrPos || null, createdAt: new Date().toISOString() }
    setManagers(prev => [tempMgr, ...prev])
    setNewMgrName(''); setNewMgrEmail(''); setNewMgrPhone(''); setNewMgrPos(''); setShowAddMgr(false)
    try {
      const r = await fetch('/api/managers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newMgrName, email: newMgrEmail || undefined, phone: newMgrPhone || undefined, position: newMgrPos || undefined }) })
      const mgr = await r.json()
      setManagers(prev => prev.map(m => m.id === tempId ? { ...m, id: mgr.id } : m))
      refresh()
    } finally { setMgrSaving(false) }
  }

  const deleteManager = async (id: string) => {
    if (!confirm("Managerni o'chirish? Uning barcha qo'ng'iroqlari ham o'chadi.")) return
    setManagers(prev => prev.filter(m => m.id !== id))
    await fetch(`/api/managers?id=${id}`, { method: 'DELETE' })
    refresh()
  }

  const createProject = async () => {
    if (!newProjName.trim() || !newProjAdminEmail.trim() || !newProjAdminPass.trim()) {
      setProjError("Kompaniya nomi, admin email va parol majburiy")
      return
    }
    setProjSaving(true); setProjError('')
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newProjName, adminName: newProjAdminName || newProjAdminEmail, adminEmail: newProjAdminEmail, adminPassword: newProjAdminPass }),
      })
      if (!res.ok) {
        const d = await res.json()
        setProjError(d.error || 'Xatolik yuz berdi')
        return
      }
      setNewProjName(''); setNewProjAdminName(''); setNewProjAdminEmail(''); setNewProjAdminPass('')
      setShowAddProject(false)
      refresh()
    } finally { setProjSaving(false) }
  }

  const deleteProject = async (id: string) => {
    if (!confirm("Kompaniyani o'chirish? Barcha ma'lumotlar o'chadi.")) return
    if (selectedProjectId === id) setSelectedProjectId(allProjects.find(p => p.id !== id)?.id ?? null)
    await fetch(`/api/projects?id=${id}`, { method: 'DELETE' })
    refresh()
  }

  const saveProjectLimits = async () => {
    if (!selectedProject) return
    setLimitSaving(true)
    try {
      await fetch('/api/projects/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedProject.id, maxManagers: limitMaxMgr, maxAdmins: limitMaxAdm, dailyLimitMinutes: limitDaily }),
      })
      refresh()
    } finally { setLimitSaving(false) }
  }

  const saveProjectFeatures = async () => {
    if (!selectedProject) return
    setFeatSaving(true)
    try {
      await fetch('/api/projects/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedProject.id, features: editFeatures }),
      })
      refresh()
    } finally { setFeatSaving(false) }
  }

  const addAdmin = async () => {
    if (!selectedProject || !newAdminEmail || !newAdminPass) return
    setAdminSaving(true); setAdminError('')
    try {
      const res = await fetch('/api/projects/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: selectedProject.id, name: newAdminName, email: newAdminEmail, password: newAdminPass }),
      })
      const data = await res.json()
      if (!res.ok) { setAdminError(data.error || 'Xatolik'); return }
      const newAdmin = { ...data, createdAt: data.createdAt || new Date().toISOString() }
      setLocalAdmins(prev => [newAdmin, ...prev])
      setNewAdminName(''); setNewAdminEmail(''); setNewAdminPass('')
      refresh()
    } finally { setAdminSaving(false) }
  }

  const removeAdmin = async (adminId: string) => {
    if (!confirm("Adminni o'chirish?")) return
    setLocalAdmins(prev => prev.filter(a => a.id !== adminId))
    await fetch(`/api/projects/admins?id=${adminId}`, { method: 'DELETE' })
    refresh()
  }

  const visibleTabs = TABS.filter(t => {
    if (t.superAdminOnly) return isSuperAdmin
    if (t.adminOnly) return isAdmin
    return true
  })
  const filteredManagers = managers.filter(m =>
    m.name.toLowerCase().includes(managerSearch.toLowerCase()) ||
    (m.email || '').toLowerCase().includes(managerSearch.toLowerCase())
  )
  const weightPct = (w?: number) => {
    if (!w) return 'Teng ahamiyat darajasi'
    return `${Math.round(w * 100)}%`
  }

  return (
    <div className="animate-fade-up">
      <h1 className="text-2xl font-bold text-text-primary mb-5">Profil sozlamalari</h1>

      {/* Tabs */}
      <div className="border-b border-bg-border mb-6">
        <div className="flex overflow-x-auto gap-1">
          {visibleTabs.map(tab => (
            <button key={tab.id} onClick={() => setTab(tab.id)}
              className={`px-4 pb-3 pt-1 text-sm font-semibold whitespace-nowrap border-b-2 transition-all flex-shrink-0 ${
                activeTab === tab.id ? 'border-brand-orange text-text-primary' : 'border-transparent text-text-muted hover:text-text-primary'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ===== PROFIL TAB ===== */}
      {activeTab === 'profile' && (
        <div className="max-w-3xl space-y-5">
          {/* Profil ma'lumotlari card */}
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-bg-border">
              <span className="section-title">Profil ma&apos;lumotlari</span>
              <button onClick={() => setEditMode(v => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-brand-orange hover:bg-brand-orange-hover rounded-md transition-colors">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                Profilni tahrirlash
              </button>
            </div>
            {/* Company logo card */}
            <div className="p-5 bg-bg-elevated/50">
              <div className="rounded-xl bg-bg-card border border-bg-border p-8 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-[#1e3a5f] border-4 border-[#1e40af30] flex items-center justify-center mb-4">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.75">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                    <polyline points="9 22 9 12 15 12 15 22"/>
                  </svg>
                </div>
                <div className="text-lg font-bold text-text-primary">{company?.name || user?.name || 'Kompaniya'}</div>
                <div className="text-xs text-text-muted mt-1">{(company?.name || user?.name || '').toLowerCase().replace(/\s+/g, '')}</div>
                <div className="text-xs text-text-muted">{user?.email}</div>
              </div>
            </div>

            {editMode && (
              <div className="p-5 border-t border-bg-border space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-text-muted mb-1.5 block">Ism</label>
                    <input value={name} onChange={e => setName(e.target.value)} className="input-field" placeholder="Ismingiz" />
                  </div>
                  <div>
                    <label className="text-xs text-text-muted mb-1.5 block">Email</label>
                    <input value={user?.email || ''} disabled className="input-field opacity-50" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={saveProfile} disabled={saving} className="px-4 py-2 text-sm font-semibold text-white bg-brand-orange rounded-md disabled:opacity-50">
                    {saving ? 'Saqlanmoqda...' : 'Saqlash'}
                  </button>
                  <button onClick={() => setEditMode(false)} className="px-4 py-2 text-sm text-text-muted border border-bg-border rounded-md hover:bg-bg-elevated">Bekor</button>
                </div>
              </div>
            )}
          </div>

          {/* TARIF VA FOYDALANISH */}
          <div>
            <div className="text-xs font-bold text-text-muted tracking-widest uppercase mb-3">Tarif va foydalanish</div>
            <div className="grid grid-cols-3 gap-3">
              <div className="card p-4">
                <div className="text-xs text-text-muted mb-1">Tarif rejasi</div>
                <div className="text-2xl font-bold text-text-primary">Pro</div>
                <div className="text-sm font-semibold text-text-secondary mt-1">1 150 000 so&apos;m / oy</div>
                <div className="text-xs text-text-muted mt-1">Kunlik limit: 2 soat har bir menejer uchun</div>
              </div>
              <div className="card p-4">
                <div className="text-xs text-text-muted mb-1">Jami menejerlar</div>
                <div className="text-2xl font-bold text-text-primary">{managerCount}</div>
                <div className="text-xs text-[#22c55e] font-semibold mt-1">{managerCount} faol obuna</div>
              </div>
              <div className="card p-4">
                <div className="text-xs text-text-muted mb-1">Bugungi foydalanish</div>
                <div className="text-2xl font-bold text-text-primary">0 daqiqa</div>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-xs text-brand-orange font-semibold">0 daqiqa / 2 soat (0%)</span>
                </div>
                <div className="w-full h-1.5 bg-bg-elevated rounded-full mt-1.5 overflow-hidden">
                  <div className="h-full bg-brand-orange rounded-full" style={{ width: '0%' }} />
                </div>
                <div className="text-xs text-text-muted mt-1">2 soat bugun qoldi</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-3">
              <div className="card p-4">
                <div className="text-xs text-text-muted mb-1">Oylik to&apos;lov</div>
                <div className="text-lg font-bold text-text-primary">1 150 000 so&apos;m</div>
                <div className="text-xs text-text-muted mt-1">1 ta faol obuna</div>
              </div>
              <div className="card p-4">
                <div className="text-xs text-text-muted mb-2">Obuna holati</div>
                <div className="flex justify-between text-xs">
                  <span className="text-text-muted">Faol:</span>
                  <span className="text-[#22c55e] font-bold">1</span>
                </div>
                <div className="flex justify-between text-xs mt-1">
                  <span className="text-text-muted">Jami:</span>
                  <span className="font-bold text-text-primary">1</span>
                </div>
              </div>
              <div className="card p-4">
                <div className="text-xs text-text-muted mb-1">Keyingi to&apos;lov sanasi</div>
                <div className="text-lg font-bold text-text-primary">26.06.2026</div>
                <div className="text-xs text-text-muted mt-1">Yaqin 4 hafta ichida</div>
              </div>
            </div>
          </div>

          {/* KOMPANIYA HAQIDA */}
          {isAdmin && (
            <div>
              <div className="text-xs font-bold text-text-muted tracking-widest uppercase mb-3">Kompaniya haqida</div>
              <div className="card p-4">
                {!editMode ? (
                  <>
                    {company?.aiContext ? (
                      <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">{company.aiContext}</p>
                    ) : (
                      <p className="text-sm text-text-muted italic">AI konteksti qo&apos;shilmagan. Profilni tahrirlash tugmasini bosib qo&apos;shing.</p>
                    )}
                  </>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-text-muted mb-1.5 block">Kompaniya nomi</label>
                        <input value={companyName} onChange={e => setCompanyName(e.target.value)} className="input-field" placeholder="Mening kompaniyam" />
                      </div>
                      <div>
                        <label className="text-xs text-text-muted mb-1.5 block">Soha</label>
                        <input value={companyIndustry} onChange={e => setCompanyIndustry(e.target.value)} className="input-field" placeholder="Qurilish materiallari" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-text-muted mb-1.5 block">Tavsif</label>
                      <textarea value={companyDesc} onChange={e => setCompanyDesc(e.target.value)} className="input-field" rows={2} placeholder="Kompaniya haqida qisqacha" />
                    </div>
                    <div>
                      <label className="text-xs text-text-muted mb-1.5 block">AI konteksti <span className="text-text-dim">(suhbat baholash uchun asosiy qoidalar)</span></label>
                      <textarea value={aiContext} onChange={e => setAiContext(e.target.value)} className="input-field" rows={6} placeholder="Masalan: Biz qurilish materiali sotamiz. Menejerlar mijozga salomlashib, ehtiyojni aniqlab, keyin taklifni bildirishi kerak..." />
                    </div>
                    <button onClick={saveCompany} disabled={compSaving} className="px-4 py-2 text-sm font-semibold text-white bg-brand-orange rounded-md disabled:opacity-50">
                      {compSaving ? 'Saqlanmoqda...' : compSaved ? '✓ Saqlandi' : 'Saqlash'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== KOMPANIYALAR (SUPERADMIN) ===== */}
      {activeTab === 'companies' && isSuperAdmin && (
        <div className="flex gap-5" style={{ minHeight: 'calc(100vh - 220px)' }}>
          {/* Left: project list */}
          <div className="w-72 flex-shrink-0 flex flex-col gap-2">
            <button
              onClick={() => { setShowAddProject(true); setSelectedProjectId(null) }}
              className="flex items-center gap-2 px-3 py-2.5 text-xs font-semibold text-white bg-brand-orange hover:bg-brand-orange-hover rounded-lg transition-colors w-full"
            >
              <PlusIcon />
              Yangi kompaniya
            </button>

            {allProjects.length === 0 ? (
              <div className="card p-6 text-center text-xs text-text-muted">Kompaniyalar yo&apos;q</div>
            ) : allProjects.map(p => (
              <button key={p.id} onClick={() => { setSelectedProjectId(p.id); setShowAddProject(false) }}
                className={`w-full text-left p-3 rounded-lg border transition-all ${
                  selectedProjectId === p.id && !showAddProject
                    ? 'bg-[#f9731615] border-[#f9731640]'
                    : 'bg-bg-card border-bg-border hover:bg-bg-elevated'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0"
                    style={{ background: '#f9731620', color: '#f97316' }}>
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-text-primary truncate">{p.name}</div>
                    <div className="text-xs text-text-muted truncate">{p.adminEmail || 'Admin yo\'q'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-2 pt-2 border-t border-bg-border">
                  <span className="text-xs text-text-muted"><span className="font-semibold text-text-primary">{p.managerCount}</span> menejer</span>
                  <span className="text-xs text-text-muted"><span className="font-semibold text-[#22c55e]">{p.sales}</span> sotuv</span>
                  <span className="text-xs text-text-muted"><span className="font-semibold text-text-secondary">{p.totalCalls}</span> tahlil</span>
                </div>
              </button>
            ))}
          </div>

          {/* Right: detail panel */}
          <div className="flex-1 min-w-0">
            {showAddProject ? (
              <div className="card p-6 max-w-lg">
                <div className="section-title mb-4">Yangi kompaniya yaratish</div>
                {projError && (
                  <div className="mb-3 px-3 py-2 bg-status-danger/10 border border-status-danger/20 rounded-md text-xs text-status-danger">{projError}</div>
                )}
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-text-muted mb-1.5 block">Kompaniya nomi *</label>
                    <input value={newProjName} onChange={e => setNewProjName(e.target.value)} className="input-field" placeholder="Masalan: ABC Kompaniyasi" />
                  </div>
                  <div>
                    <label className="text-xs text-text-muted mb-1.5 block">Admin ismi</label>
                    <input value={newProjAdminName} onChange={e => setNewProjAdminName(e.target.value)} className="input-field" placeholder="Admin ismi" />
                  </div>
                  <div>
                    <label className="text-xs text-text-muted mb-1.5 block">Admin email *</label>
                    <input value={newProjAdminEmail} onChange={e => setNewProjAdminEmail(e.target.value)} className="input-field" placeholder="admin@company.uz" type="email" />
                  </div>
                  <div>
                    <label className="text-xs text-text-muted mb-1.5 block">Admin paroli *</label>
                    <input value={newProjAdminPass} onChange={e => setNewProjAdminPass(e.target.value)} className="input-field" placeholder="Kuchli parol" type="password" />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button onClick={createProject} disabled={projSaving || !newProjName.trim() || !newProjAdminEmail.trim() || !newProjAdminPass.trim()}
                    className="px-4 py-2 text-sm font-semibold text-white bg-brand-orange rounded-md disabled:opacity-50">
                    {projSaving ? 'Yaratilmoqda...' : 'Yaratish'}
                  </button>
                  <button onClick={() => { setShowAddProject(false); setProjError('') }}
                    className="px-4 py-2 text-sm text-text-muted border border-bg-border rounded-md hover:bg-bg-elevated">
                    Bekor
                  </button>
                </div>
              </div>
            ) : selectedProject ? (
              <div className="space-y-4">
                {/* Header */}
                <div className="card p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-bold flex-shrink-0"
                        style={{ background: '#f9731620', color: '#f97316', border: '2px solid #f9731630' }}>
                        {selectedProject.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-xl font-bold text-text-primary">{selectedProject.name}</div>
                        <div className="text-sm text-text-muted mt-0.5">{selectedProject.adminEmail || "Admin email yo'q"}</div>
                        <div className="text-xs text-text-dim mt-0.5">Yaratilgan: {new Date(selectedProject.createdAt).toLocaleDateString('uz-UZ')}</div>
                      </div>
                    </div>
                    <button onClick={() => deleteProject(selectedProject.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#ef44441a] hover:bg-[#ef444430] text-[#ef4444] rounded-md border border-[#ef444430] transition-colors">
                      <TrashIcon /> O&apos;chirish
                    </button>
                  </div>
                  {/* Stats row */}
                  <div className="grid grid-cols-4 gap-2.5 mb-3">
                    <div className="rounded-lg p-3 text-center bg-bg-elevated">
                      <div className="text-xl font-bold text-text-primary">{selectedProject.managerCount}</div>
                      <div className="text-xs text-text-dim mt-0.5">/ {selectedProject.maxManagers} menejer</div>
                    </div>
                    <div className="rounded-lg p-3 text-center bg-bg-elevated">
                      <div className="text-xl font-bold text-text-primary">{selectedProject.adminCount}</div>
                      <div className="text-xs text-text-dim mt-0.5">/ {selectedProject.maxAdmins} admin</div>
                    </div>
                    <div className="rounded-lg p-3 text-center bg-bg-elevated">
                      <div className="text-xl font-bold text-[#3b82f6]">{selectedProject.totalCalls}</div>
                      <div className="text-xs text-text-muted mt-0.5">tahlillar</div>
                    </div>
                    <div className="rounded-lg p-3 text-center bg-bg-elevated">
                      <div className="text-xl font-bold text-[#22c55e]">{selectedProject.sales}</div>
                      <div className="text-xs text-text-muted mt-0.5">sotuvlar</div>
                    </div>
                  </div>
                  {/* Daily usage bar */}
                  <div className="p-3 rounded-lg bg-bg-elevated">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-xs text-text-muted">Bugungi foydalanish</span>
                      <span className="text-xs font-semibold text-brand-orange">
                        {selectedProject.todayUsageMinutes} / {selectedProject.dailyLimitMinutes} daqiqa
                        ({Math.floor(selectedProject.dailyLimitMinutes / 60)}s)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-bg-base rounded-full overflow-hidden">
                      <div className="h-full bg-brand-orange rounded-full transition-all"
                        style={{ width: `${Math.min(100, Math.round((selectedProject.todayUsageMinutes / Math.max(1, selectedProject.dailyLimitMinutes)) * 100))}%` }} />
                    </div>
                  </div>
                </div>

                {/* Sub-tabs */}
                <div className="flex gap-1 border-b border-bg-border -mb-2">
                  {(['stats', 'limits', 'features', 'admins'] as const).map(tab => {
                    const labels = { stats: 'Statistika', limits: 'Limitlar', features: 'Funksiyalar', admins: 'Adminlar' }
                    return (
                      <button key={tab} onClick={() => setCompanyTab(tab)}
                        className={`px-4 pb-2.5 pt-0.5 text-xs font-semibold border-b-2 transition-all ${
                          companyTab === tab ? 'border-brand-orange text-text-primary' : 'border-transparent text-text-muted hover:text-text-primary'
                        }`}>
                        {labels[tab]}
                      </button>
                    )
                  })}
                </div>

                {/* Tab: Statistika */}
                {companyTab === 'stats' && (
                  <div className="card p-5 space-y-3">
                    {selectedProject.totalCalls > 0 && (
                      <div className="p-3 rounded-lg bg-bg-elevated flex items-center justify-between">
                        <span className="text-xs text-text-muted">Konversiya darajasi</span>
                        <div className="flex items-center gap-3">
                          <div className="w-40 h-2 bg-bg-base rounded-full overflow-hidden">
                            <div className="h-full bg-[#22c55e] rounded-full"
                              style={{ width: `${Math.round((selectedProject.sales / selectedProject.totalCalls) * 100)}%` }} />
                          </div>
                          <span className="text-sm font-bold text-[#22c55e]">{Math.round((selectedProject.sales / selectedProject.totalCalls) * 100)}%</span>
                        </div>
                      </div>
                    )}
                    {selectedProject.company?.description && (
                      <div>
                        <div className="text-xs text-text-muted mb-1">Kompaniya haqida</div>
                        <p className="text-sm text-text-secondary">{selectedProject.company.description}</p>
                      </div>
                    )}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between py-1.5 border-b border-bg-border">
                        <span className="text-xs text-text-muted">Admin email</span>
                        <span className="text-xs text-text-primary">{selectedProject.adminEmail || '—'}</span>
                      </div>
                      <div className="flex items-center justify-between py-1.5 border-b border-bg-border">
                        <span className="text-xs text-text-muted">Jami tahlillar</span>
                        <span className="text-xs font-semibold text-text-primary">{selectedProject.totalCalls}</span>
                      </div>
                      <div className="flex items-center justify-between py-1.5">
                        <span className="text-xs text-text-muted">Muvaffaqiyatli sotuvlar</span>
                        <span className="text-xs font-semibold text-[#22c55e]">{selectedProject.sales}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab: Limitlar */}
                {companyTab === 'limits' && (
                  <div className="card p-5 space-y-5">
                    <div>
                      <label className="text-xs font-semibold text-text-muted mb-2 block">Har kunlik audio limiti</label>
                      <div className="flex items-center gap-3 mb-2">
                        <input type="number" min={1} max={600} value={limitDaily}
                          onChange={e => setLimitDaily(Math.max(1, Number(e.target.value)))}
                          className="input-field w-24 text-center" />
                        <span className="text-xs text-text-muted">daqiqa = {Math.floor(limitDaily / 60)}h {limitDaily % 60}min</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {[30, 60, 120, 240, 480].map(m => (
                          <button key={m} onClick={() => setLimitDaily(m)}
                            className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                              limitDaily === m ? 'bg-brand-orange text-white border-brand-orange' : 'border-bg-border text-text-muted hover:bg-bg-elevated'
                            }`}>
                            {m < 60 ? `${m}min` : `${m / 60}s`}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-text-muted mb-2 block">Maksimal menejerlar</label>
                      <input type="number" min={1} max={500} value={limitMaxMgr}
                        onChange={e => setLimitMaxMgr(Math.max(1, Number(e.target.value)))}
                        className="input-field w-24 text-center" />
                      <div className="text-xs text-text-dim mt-1">Hozir: {selectedProject.managerCount} ta menejer</div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-text-muted mb-2 block">Maksimal adminlar</label>
                      <input type="number" min={1} max={50} value={limitMaxAdm}
                        onChange={e => setLimitMaxAdm(Math.max(1, Number(e.target.value)))}
                        className="input-field w-24 text-center" />
                      <div className="text-xs text-text-dim mt-1">Hozir: {selectedProject.adminCount} ta admin</div>
                    </div>
                    <button onClick={saveProjectLimits} disabled={limitSaving}
                      className="px-5 py-2 text-sm font-semibold text-white bg-brand-orange hover:bg-brand-orange-hover rounded-md disabled:opacity-50 transition-colors">
                      {limitSaving ? 'Saqlanmoqda...' : 'Saqlash'}
                    </button>
                  </div>
                )}

                {/* Tab: Funksiyalar */}
                {companyTab === 'features' && (
                  <div className="card p-5">
                    <div className="space-y-2.5 mb-4">
                      {[
                        { key: 'transcription', label: 'Transkripsiya', desc: "Audio matnini ko'rish" },
                        { key: 'aiAnalysis', label: 'AI Tahlil', desc: 'Avtomatik AI suhbat tahlili' },
                        { key: 'scoring', label: 'Ball tizimi', desc: 'Suhbat ballini hisoblash (0-100)' },
                        { key: 'leadQuality', label: 'Lid sifati', desc: 'Lead sifatini baholash' },
                        { key: 'reports', label: 'Hisobotlar', desc: 'Kunlik va oylik hisobotlar' },
                        { key: 'criteria', label: 'Suhbat mezonlari', desc: "Maxsus mezonlarni boshqarish" },
                        { key: 'dashboard', label: 'Dashboard', desc: 'Umumiy statistika sahifasi' },
                      ].map(feat => {
                        const enabled = editFeatures[feat.key] !== false
                        return (
                          <div key={feat.key} className="flex items-center justify-between p-3 rounded-lg bg-bg-elevated">
                            <div>
                              <div className="text-sm font-semibold text-text-primary">{feat.label}</div>
                              <div className="text-xs text-text-muted">{feat.desc}</div>
                            </div>
                            <button
                              onClick={() => setEditFeatures(prev => ({ ...prev, [feat.key]: !enabled }))}
                              className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${enabled ? 'bg-brand-orange' : 'bg-bg-border'}`}
                            >
                              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                    <button onClick={saveProjectFeatures} disabled={featSaving}
                      className="px-5 py-2 text-sm font-semibold text-white bg-brand-orange hover:bg-brand-orange-hover rounded-md disabled:opacity-50 transition-colors">
                      {featSaving ? 'Saqlanmoqda...' : 'Saqlash'}
                    </button>
                  </div>
                )}

                {/* Tab: Adminlar */}
                {companyTab === 'admins' && (
                  <div className="space-y-3">
                    <div className="card p-4">
                      {localAdmins.length === 0 ? (
                        <div className="text-center py-4 text-xs text-text-muted">Adminlar yo&apos;q</div>
                      ) : (
                        <div className="space-y-2">
                          {localAdmins.map(admin => (
                            <div key={admin.id} className="flex items-center justify-between p-2.5 rounded-lg bg-bg-elevated">
                              <div>
                                <div className="text-sm font-semibold text-text-primary">{admin.name}</div>
                                <div className="text-xs text-text-muted">{admin.email}</div>
                              </div>
                              <button onClick={() => removeAdmin(admin.id)}
                                className="w-7 h-7 flex items-center justify-center rounded text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors">
                                <TrashIcon />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="card p-4">
                      <div className="text-xs font-semibold text-text-secondary mb-3">+ Yangi admin qo&apos;shish</div>
                      {adminError && <div className="mb-2 text-xs text-red-400">{adminError}</div>}
                      <div className="space-y-2">
                        <input value={newAdminName} onChange={e => setNewAdminName(e.target.value)}
                          placeholder="Ism" className="input-field text-xs" />
                        <input value={newAdminEmail} onChange={e => setNewAdminEmail(e.target.value)}
                          placeholder="Email *" type="email" className="input-field text-xs" />
                        <input value={newAdminPass} onChange={e => setNewAdminPass(e.target.value)}
                          placeholder="Parol *" type="password" className="input-field text-xs" />
                      </div>
                      <button onClick={addAdmin} disabled={adminSaving || !newAdminEmail || !newAdminPass}
                        className="mt-3 px-4 py-1.5 text-xs font-semibold text-white bg-brand-orange hover:bg-brand-orange-hover rounded-md disabled:opacity-50 transition-colors">
                        {adminSaving ? "Qo'shilmoqda..." : "Qo'shish"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-16 h-16 rounded-2xl bg-[#f9731615] flex items-center justify-center mb-4">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="1.75">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                    <polyline points="9 22 9 12 15 12 15 22"/>
                  </svg>
                </div>
                <div className="text-sm font-semibold text-text-secondary mb-1">Kompaniya tanlang</div>
                <div className="text-xs text-text-muted">Chap paneldan kompaniyani bosing</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== SUHBAT MEZONLARI ===== */}
      {activeTab === 'criteria' && isAdmin && (
        <div className="flex gap-4" style={{ minHeight: 'calc(100vh - 220px)' }}>
          {/* Left panel */}
          <div className="w-72 flex-shrink-0 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-text-primary">Kategoriyalar</span>
              <button onClick={() => setShowAddCat(v => !v)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-brand-orange hover:bg-brand-orange-hover rounded-md transition-colors">
                <PlusIcon /> Yangi kategoriya
              </button>
            </div>

            {showAddCat && (
              <div className="card p-3 space-y-2">
                <input value={newCatName} onChange={e => setNewCatName(e.target.value)} className="input-field" placeholder="Kategoriya nomi *" />
                <textarea value={newCatDesc} onChange={e => setNewCatDesc(e.target.value)} className="input-field text-xs" rows={2} placeholder="Tavsif (AI uchun qoidalar)..." />
                <div><div className="text-xs text-text-muted mb-1.5">Rang</div><ColorPicker value={newCatColor} onChange={setNewCatColor} /></div>
                <div className="flex gap-2">
                  <button onClick={addCallCat} disabled={!newCatName.trim()} className="flex-1 py-1.5 text-xs font-semibold text-white bg-brand-orange rounded-md disabled:opacity-50">Qo&apos;shish</button>
                  <button onClick={() => setShowAddCat(false)} className="flex-1 py-1.5 text-xs text-text-muted border border-bg-border rounded-md hover:bg-bg-elevated">Bekor</button>
                </div>
              </div>
            )}

            <div className="flex-1 space-y-1.5">
              {callCats.length === 0 && <p className="text-xs text-text-muted text-center py-8">Hali kategoriyalar qo&apos;shilmagan</p>}
              {callCats.map(cat => (
                <div key={cat.id} onClick={() => setSelectedCatId(cat.id)}
                  className={`group flex items-center gap-2 p-3 rounded-lg cursor-pointer border transition-all ${selectedCatId === cat.id ? 'border-brand-orange bg-brand-orange-dim' : 'border-bg-border hover:bg-bg-elevated'}`}>
                  <DragIcon />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-text-primary truncate">{cat.name}</span>
                      <span className="text-xs text-text-muted">({cat.criteria.length})</span>
                    </div>
                    {cat.description && <div className="text-xs text-text-muted truncate mt-0.5">{cat.description}</div>}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={e => { e.stopPropagation(); deleteCallCat(cat.id) }} className="p-1 text-text-muted hover:text-status-danger"><TrashIcon /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right panel */}
          <div className="flex-1 flex flex-col min-w-0 gap-3">
            {selectedCat ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-text-primary">&quot;{selectedCat.name}&quot; mezonlari</span>
                  <div className="flex items-center gap-2">
                    <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-bg-border rounded-md text-text-secondary hover:bg-bg-elevated transition-colors">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                      Me&apos;zon darajalarini o&apos;zgartirish
                    </button>
                    <button
                      onClick={() => { const el = document.getElementById('new-crit-input'); el?.focus() }}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-brand-orange hover:bg-brand-orange-hover rounded-md transition-colors">
                      <PlusIcon /> Yangi mezon
                    </button>
                  </div>
                </div>

                {/* Add criteria form */}
                <div className="card p-3 flex gap-2">
                  <div className="flex-1 space-y-2">
                    <input id="new-crit-input" value={newCritName} onChange={e => setNewCritName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && !e.shiftKey && addCriteria(selectedCat.id)}
                      className="input-field" placeholder="Mezon nomi (Enter tugmasini bosing)..." />
                    <textarea value={newCritDesc} onChange={e => setNewCritDesc(e.target.value)}
                      className="input-field text-xs" rows={2} placeholder="Qoidalar / tavsif (AI uchun)..." />
                  </div>
                  <button onClick={() => addCriteria(selectedCat.id)} disabled={!newCritName.trim() || addCritLoading}
                    className="px-3 text-sm font-bold text-white bg-brand-orange rounded-md disabled:opacity-50 self-stretch">
                    {addCritLoading ? '...' : '+'}
                  </button>
                </div>

                {/* Criteria list */}
                <div className="space-y-2 overflow-y-auto flex-1">
                  {selectedCat.criteria.length === 0 && <p className="text-xs text-text-muted text-center py-10">Hali mezon qo&apos;shilmagan</p>}
                  {selectedCat.criteria.map((c, i) => (
                    <div key={c.id} className="group card p-4 flex items-start gap-3">
                      <DragIcon />
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-text-primary mb-0.5">{i + 1}. {c.name}</div>
                        <div className="text-xs text-text-muted mb-2">
                          Ahamiyat darajasi (%): {selectedCat.criteria.length > 0 ? `Teng ahamiyat darajasi (~${Math.round(100/selectedCat.criteria.length)}% har biri)` : 'Teng ahamiyat darajasi'}
                        </div>
                        {c.description && (
                          <div className="text-xs text-text-secondary leading-relaxed">
                            <span className="font-semibold text-text-primary">Qoidalar:</span>
                            <div className="mt-1 whitespace-pre-wrap">{c.description}</div>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <button className="p-1.5 text-text-muted hover:text-brand-orange rounded transition-colors"><EditIcon /></button>
                        <span className="text-text-dim">|</span>
                        <button onClick={() => deleteCriteria(selectedCat.id, c.id)} className="p-1.5 text-text-muted hover:text-status-danger rounded transition-colors"><TrashIcon /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-text-muted text-sm">Chap paneldan kategoriya tanlang</div>
            )}
          </div>
        </div>
      )}

      {/* ===== SUHBAT METRIKALARI ===== */}
      {activeTab === 'metrics' && isAdmin && (
        <div className="flex gap-4" style={{ minHeight: 'calc(100vh - 220px)' }}>
          {/* Left panel */}
          <div className="w-72 flex-shrink-0 space-y-1.5">
            <div className="font-bold text-text-primary mb-3">Kategoriyalar</div>
            {callCats.map(cat => (
              <div key={cat.id} onClick={() => setSelectedMetCatId(cat.id)}
                className={`flex items-start gap-2 p-3 rounded-lg cursor-pointer border transition-all ${selectedMetCatId === cat.id ? 'border-brand-orange bg-brand-orange-dim' : 'border-bg-border hover:bg-bg-elevated'}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-text-primary truncate">{cat.name}</span>
                    <span className="text-xs text-text-muted">(0)</span>
                  </div>
                  {cat.description && <div className="text-xs text-text-muted truncate mt-0.5">{cat.description}</div>}
                </div>
              </div>
            ))}
          </div>

          {/* Right panel */}
          <div className="flex-1 flex flex-col min-w-0 gap-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-text-primary">
                {callCats.find(c => c.id === selectedMetCatId) ? `«${callCats.find(c => c.id === selectedMetCatId)!.name}» kategoriyasi metrikalari` : 'Kategoriya metrikalari'}
              </span>
              <button className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-brand-orange hover:bg-brand-orange-hover rounded-md transition-colors">
                <PlusIcon /> Yangi metrika
              </button>
            </div>
            <div className="flex-1 card flex flex-col items-center justify-center gap-3 text-center p-10">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-muted opacity-50">
                <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
              </svg>
              <div className="text-sm font-bold text-text-primary">Bu kategoriyada metrikalar yo&apos;q</div>
              <div className="text-xs text-text-muted">Yuqoridagi «Yangi metrika» tugmasini bosing</div>
            </div>
          </div>
        </div>
      )}

      {/* ===== LID SIFATI ===== */}
      {activeTab === 'lead-quality' && isAdmin && (
        <div className="space-y-4">
          {/* Info banner */}
          <div className="card border border-[#1e3a5f] bg-[#0d1f33]">
            <button onClick={() => setLeadBannerOpen(v => !v)} className="w-full flex items-center justify-between p-4">
              <div className="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <span className="text-sm font-bold text-text-primary">Lid sifati shu tartibda baholanadi</span>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`text-text-muted transition-transform ${leadBannerOpen ? '' : 'rotate-180'}`}><polyline points="18 15 12 9 6 15"/></svg>
            </button>
            {leadBannerOpen && (
              <div className="px-4 pb-4 text-xs text-text-muted leading-relaxed border-t border-[#1e3a5f] pt-3">
                Har bir kategoriya mezonlariga ball beriladi: mos kelsa 1, mos kelmasa 0, noaniq bo&apos;lsa 0.5. Eng yuqori o&apos;rtacha ball bo&apos;lgan kategoriya tanlanadi. AI tahlil qiluvchi qo&apos;ng&apos;iroqni shu mezonlarga taqqoslab lid sifatini aniqlaydi.
              </div>
            )}
          </div>

          <div className="flex gap-5" style={{ minHeight: 'calc(100vh - 340px)' }}>
            {/* Left panel */}
            <div className="w-72 flex-shrink-0 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-text-primary">Kategoriyalar</span>
                <button onClick={() => setShowAddLeadCat(v => !v)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#3b82f6] hover:bg-[#2563eb] rounded-lg transition-colors">
                  <PlusIcon /> Yangi kategoriya
                </button>
              </div>

              {showAddLeadCat && (
                <div className="card p-3 space-y-2">
                  <input
                    value={newLeadCatLabel}
                    onChange={e => setNewLeadCatLabel(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addLeadCat()}
                    className="input-field"
                    placeholder="Kategoriya nomi (masalan: Issiq lead)"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button onClick={addLeadCat} disabled={!newLeadCatLabel.trim()}
                      className="flex-1 py-1.5 text-xs font-semibold text-white bg-[#3b82f6] hover:bg-[#2563eb] rounded-md disabled:opacity-50">
                      Qo&apos;shish
                    </button>
                    <button onClick={() => { setShowAddLeadCat(false); setNewLeadCatLabel('') }}
                      className="flex-1 py-1.5 text-xs text-text-muted border border-bg-border rounded-md hover:bg-bg-elevated">
                      Bekor
                    </button>
                  </div>
                </div>
              )}

              <div className="flex-1 space-y-1.5">
                {leadCats.length === 0 && (
                  <div className="text-center py-10">
                    <div className="text-xs text-text-muted">Hali kategoriyalar qo&apos;shilmagan</div>
                    <div className="text-xs text-text-dim mt-1">Masalan: Sovuq, Iliq, Issiq</div>
                  </div>
                )}
                {leadCats.map((cat, idx) => (
                  <div key={cat.id} onClick={() => setSelectedLeadId(cat.id)}
                    className={`group flex items-center gap-2.5 p-3 rounded-lg cursor-pointer border transition-all ${
                      selectedLeadId === cat.id
                        ? 'border-[#3b82f6] bg-[#3b82f608] border-l-2'
                        : 'border-bg-border hover:bg-bg-elevated'
                    }`}>
                    <DragIcon />
                    <div className="flex-1 min-w-0 flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-text-primary">{idx + 1}. {cat.label}</span>
                      <span className="text-xs text-text-muted">({cat.criteria.length})</span>
                    </div>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button className="p-1.5 text-text-muted hover:text-[#3b82f6] rounded transition-colors"><EditIcon /></button>
                      <span className="text-text-dim text-xs">|</span>
                      <button onClick={e => { e.stopPropagation(); deleteLeadCat(cat.id) }}
                        className="p-1.5 text-text-muted hover:text-status-danger rounded transition-colors"><TrashIcon /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right panel */}
            <div className="flex-1 flex flex-col min-w-0 gap-3">
              {selectedLeadCat ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-text-primary">&laquo;{selectedLeadCat.label}&raquo; mezonlari</span>
                    <button onClick={() => { const el = document.getElementById('new-lead-crit-input'); el?.focus() }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#3b82f6] hover:bg-[#2563eb] rounded-lg transition-colors">
                      <PlusIcon /> Yangi mezon
                    </button>
                  </div>

                  {/* Add criteria — description only */}
                  <div className="card p-3 flex gap-2 items-start">
                    <textarea
                      id="new-lead-crit-input"
                      value={newLeadCritDesc}
                      onChange={e => setNewLeadCritDesc(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addLeadCrit(selectedLeadCat.id) } }}
                      className="input-field flex-1 text-sm resize-none"
                      rows={2}
                      placeholder="Mezon tavsifi... (masalan: Mijoz mahsulotga qiziqish bildirdi va narxni so'radi)"
                    />
                    <button
                      onClick={() => addLeadCrit(selectedLeadCat.id)}
                      disabled={!newLeadCritDesc.trim()}
                      className="px-4 py-2 text-sm font-bold text-white bg-[#3b82f6] hover:bg-[#2563eb] rounded-lg disabled:opacity-40 self-stretch transition-colors flex-shrink-0"
                    >
                      +
                    </button>
                  </div>

                  {/* Criteria list */}
                  <div className="space-y-2 overflow-y-auto flex-1">
                    {selectedLeadCat.criteria.length === 0 && (
                      <div className="text-center py-12 text-text-muted">
                        <div className="text-xs">Hali mezon qo&apos;shilmagan</div>
                        <div className="text-xs text-text-dim mt-1">Yuqoridagi maydonga mezon tavsifini yozing</div>
                      </div>
                    )}
                    {selectedLeadCat.criteria.map((c, i) => (
                      <div key={c.id} className="group card p-4 flex items-start gap-3">
                        <DragIcon />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-text-muted mb-1">{i + 1}.</div>
                          <div className="text-sm text-text-secondary leading-relaxed">
                            {c.description || c.name}
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          <button className="p-1.5 text-text-muted hover:text-[#3b82f6] rounded transition-colors"><EditIcon /></button>
                          <span className="text-text-dim text-xs">|</span>
                          <button onClick={() => deleteLeadCrit(selectedLeadCat.id, c.id)}
                            className="p-1.5 text-text-muted hover:text-status-danger rounded transition-colors"><TrashIcon /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-muted opacity-40">
                    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                    <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                  </svg>
                  <div className="text-sm font-semibold text-text-muted">Kategoriya tanlang</div>
                  <div className="text-xs text-text-dim">Chap paneldan kategoriya bosing</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== MENEJERLAR ===== */}
      {activeTab === 'managers' && isAdmin && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-text-primary">Menejerlar</h2>
            <button onClick={() => setShowAddMgr(v => !v)}
              className="flex items-center gap-1 px-4 py-2 text-sm font-semibold text-white bg-brand-orange hover:bg-brand-orange-hover rounded-md transition-colors">
              <PlusIcon /> Yangi menejer
            </button>
          </div>

          {showAddMgr && (
            <div className="card p-4 mb-4">
              <div className="section-title mb-3">Yangi menejer qo&apos;shish</div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div><label className="text-xs text-text-muted mb-1 block">Ism *</label><input value={newMgrName} onChange={e => setNewMgrName(e.target.value)} className="input-field" placeholder="To'liq ism" /></div>
                <div><label className="text-xs text-text-muted mb-1 block">Lavozim</label><input value={newMgrPos} onChange={e => setNewMgrPos(e.target.value)} className="input-field" placeholder="Sales Manager" /></div>
                <div><label className="text-xs text-text-muted mb-1 block">Email</label><input value={newMgrEmail} onChange={e => setNewMgrEmail(e.target.value)} className="input-field" type="email" /></div>
                <div><label className="text-xs text-text-muted mb-1 block">Telefon</label><input value={newMgrPhone} onChange={e => setNewMgrPhone(e.target.value)} className="input-field" placeholder="+998901234567" /></div>
              </div>
              <div className="flex gap-2">
                <button onClick={addManager} disabled={mgrSaving || !newMgrName.trim()} className="px-4 py-2 text-sm font-semibold text-white bg-brand-orange rounded-md disabled:opacity-50">
                  {mgrSaving ? "Qo'shilmoqda..." : "Qo'shish"}
                </button>
                <button onClick={() => setShowAddMgr(false)} className="px-4 py-2 text-sm text-text-muted border border-bg-border rounded-md hover:bg-bg-elevated">Bekor</button>
              </div>
            </div>
          )}

          <div className="card">
            <div className="p-3 border-b border-bg-border">
              <div className="relative max-w-xs">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input value={managerSearch} onChange={e => setManagerSearch(e.target.value)} className="input-field pl-8 text-sm" placeholder="Qidirish..." />
              </div>
            </div>
            <table className="data-table">
              <thead><tr><th>ID</th><th>Ism</th><th>Email</th><th>Telefon</th><th>Lavozim</th><th>Qo&apos;shilgan</th><th></th></tr></thead>
              <tbody>
                {filteredManagers.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-8 text-text-muted text-sm">Menejerlar topilmadi</td></tr>
                ) : filteredManagers.map(m => (
                  <tr key={m.id}>
                    <td className="font-mono text-xs text-text-dim">{m.id.slice(0, 8)}</td>
                    <td className="font-semibold text-text-primary">{m.name}</td>
                    <td className="text-text-muted">{m.email || '—'}</td>
                    <td className="text-text-muted">{m.phone || '—'}</td>
                    <td className="text-text-muted">{m.position || 'Sales Manager'}</td>
                    <td className="text-text-muted">{new Date(m.createdAt).toLocaleDateString('uz-UZ')}</td>
                    <td><button onClick={() => deleteManager(m.id)} className="text-xs text-status-danger hover:text-red-400 px-2 py-1 font-semibold">O&apos;chirish</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="p-3 border-t border-bg-border text-xs text-text-muted">{filteredManagers.length} natija</div>
          </div>
        </div>
      )}

      {/* ===== BILDIRISHNOMALAR ===== */}
      {activeTab === 'notifications' && isAdmin && (
        <div className="max-w-2xl space-y-3">
          <div className="card p-5 text-center">
            <div className="w-12 h-12 rounded-full bg-bg-elevated flex items-center justify-center mx-auto mb-3">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="text-text-muted">
                <path d="M21.2 8.4c.5.38.8.97.8 1.6v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V10a2 2 0 0 1 .8-1.6l8-6a2 2 0 0 1 2.4 0l8 6Z"/>
                <path d="m22 10-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 10"/>
              </svg>
            </div>
            <div className="text-sm font-bold text-text-primary mb-1">Telegram bildirishnomalar</div>
            <p className="text-xs text-text-muted mb-4">Qo&apos;ng&apos;iroq tahlillari va kunlik hisobotlarni Telegram orqali oling</p>
            <button className="px-4 py-2 text-sm font-semibold text-white bg-brand-orange rounded-md">Telegram ulash</button>
          </div>
          {[
            { label: "Har bir tahlil natijasini yuborish", on: true },
            { label: "Faqat muhim holatlarda xabar berish", on: false },
            { label: "Kunlik xulosa", on: true },
            { label: "Haftalik xulosa", on: true },
            { label: "Oylik xulosa", on: true },
          ].map(item => (
            <div key={item.label} className="card p-4 flex items-center justify-between">
              <span className="text-sm font-semibold text-text-primary">{item.label}</span>
              <div className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${item.on ? 'bg-brand-orange' : 'bg-bg-elevated border border-bg-border'}`}>
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${item.on ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ===== INTEGRATSIYALAR ===== */}
      {activeTab === 'integrations' && isAdmin && (
        <div className="max-w-2xl space-y-3">
          {integrations.length === 0 ? (
            <div className="card p-8 text-center">
              <div className="text-text-muted text-sm mb-2">Hali integratsiyalar sozlanmagan</div>
              <p className="text-xs text-text-dim">CRM, telephony va boshqa xizmatlarni ulash uchun tez orada qo&apos;llab-quvvatlanadi</p>
            </div>
          ) : integrations.map(intg => (
            <div key={intg.id} className="card p-4 flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-text-primary">{intg.name}</div>
                {intg.lastSync && <div className="text-xs text-text-muted mt-0.5">Oxirgi sinx: {new Date(intg.lastSync).toLocaleString('uz-UZ')}</div>}
              </div>
              <span className={`badge ${intg.enabled ? 'badge-success' : 'badge-neutral'}`}>{intg.enabled ? 'Faol' : 'Nofaol'}</span>
            </div>
          ))}
          <div className="card p-4 border-dashed text-center cursor-pointer hover:bg-bg-elevated transition-colors">
            <div className="text-sm text-text-muted font-semibold">+ Yangi integratsiya</div>
            <p className="text-xs text-text-dim mt-1">Bitrix24, AmoCRM, Yclients va boshqalar</p>
          </div>
        </div>
      )}
    </div>
  )
}
