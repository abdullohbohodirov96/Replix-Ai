'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

type Criteria = { id: string; name: string; description: string | null; order: number }
type CallCategory = { id: string; name: string; description: string | null; color: string; order: number; criteria: Criteria[] }
type LeadCategory = { id: string; name: string; label: string; description: string | null; color: string; order: number; criteria: Criteria[] }
type Manager = { id: string; name: string; email: string | null; phone: string | null; position: string | null; createdAt: string }
type Integration = { id: string; name: string; enabled: boolean; config: unknown; lastSync: string | null }

interface Props {
  user: { id: string; name: string | null; email: string; role: string; managerId: string | null; createdAt: Date } | null
  company: { id: string; name: string; description: string | null; industry: string | null; aiContext: string | null } | null
  callCategories: CallCategory[]
  leadCategories: LeadCategory[]
  managers: Manager[]
  integrations: Integration[]
  isAdmin: boolean
  managerCount: number
}

const TABS = [
  { id: 'profile', label: 'Profil', adminOnly: false },
  { id: 'criteria', label: 'Suhbat mezonlari', adminOnly: true },
  { id: 'metrics', label: 'Suhbat metrikalari', adminOnly: true },
  { id: 'lead-quality', label: 'Lid sifati', adminOnly: true },
  { id: 'managers', label: 'Menejerlar', adminOnly: true },
  { id: 'notifications', label: 'Bildirishnomalar', adminOnly: true },
  { id: 'integrations', label: 'Integratsiyalar', adminOnly: true },
]

const COLORS = ['#3b82f6', '#f97316', '#22c55e', '#ef4444', '#8b5cf6', '#06b6d4', '#f59e0b', '#ec4899']

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {COLORS.map(c => (
        <button key={c} type="button" onClick={() => onChange(c)}
          className="w-5 h-5 rounded-full border-2 transition-all flex-shrink-0"
          style={{ background: c, borderColor: value === c ? '#ffffff' : 'transparent', outline: value === c ? `2px solid ${c}40` : 'none' }}
        />
      ))}
    </div>
  )
}

export default function ProfileClient({ user, company, callCategories, leadCategories, managers, integrations, isAdmin, managerCount }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeTab = searchParams.get('tab') || 'profile'
  const setTab = (tab: string) => router.push(`/profile?tab=${tab}`)
  const refresh = () => router.refresh()

  // Profile tab
  const [name, setName] = useState(user?.name || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [companyName, setCompanyName] = useState(company?.name || '')
  const [companyDesc, setCompanyDesc] = useState(company?.description || '')
  const [companyIndustry, setCompanyIndustry] = useState(company?.industry || '')
  const [aiContext, setAiContext] = useState(company?.aiContext || '')
  const [compSaving, setCompSaving] = useState(false)
  const [compSaved, setCompSaved] = useState(false)

  // Criteria tab
  const [selectedCatId, setSelectedCatId] = useState<string | null>(callCategories[0]?.id ?? null)
  const [newCatName, setNewCatName] = useState('')
  const [newCatDesc, setNewCatDesc] = useState('')
  const [newCatColor, setNewCatColor] = useState('#3b82f6')
  const [showAddCat, setShowAddCat] = useState(false)
  const [newCritName, setNewCritName] = useState('')
  const [newCritDesc, setNewCritDesc] = useState('')
  const selectedCat = callCategories.find(c => c.id === selectedCatId)

  // Lead quality tab
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(leadCategories[0]?.id ?? null)
  const [newLeadCatName, setNewLeadCatName] = useState('')
  const [newLeadCatLabel, setNewLeadCatLabel] = useState('')
  const [newLeadCatColor, setNewLeadCatColor] = useState('#f97316')
  const [showAddLeadCat, setShowAddLeadCat] = useState(false)
  const [newLeadCritName, setNewLeadCritName] = useState('')
  const [newLeadCritDesc, setNewLeadCritDesc] = useState('')
  const selectedLeadCat = leadCategories.find(c => c.id === selectedLeadId)

  // Managers tab
  const [managerSearch, setManagerSearch] = useState('')
  const [showAddMgr, setShowAddMgr] = useState(false)
  const [newMgrName, setNewMgrName] = useState('')
  const [newMgrEmail, setNewMgrEmail] = useState('')
  const [newMgrPhone, setNewMgrPhone] = useState('')
  const [newMgrPos, setNewMgrPos] = useState('')
  const [mgrSaving, setMgrSaving] = useState(false)

  // ---- API helpers ----
  const saveProfile = async () => {
    setSaving(true)
    try {
      await fetch('/api/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) })
      setSaved(true); setTimeout(() => setSaved(false), 2000)
    } finally { setSaving(false) }
  }

  const saveCompany = async () => {
    setCompSaving(true)
    try {
      await fetch('/api/company', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: companyName, description: companyDesc, industry: companyIndustry, aiContext }) })
      setCompSaved(true); setTimeout(() => setCompSaved(false), 2000)
    } finally { setCompSaving(false) }
  }

  const addCallCat = async () => {
    if (!newCatName.trim()) return
    const r = await fetch('/api/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newCatName, description: newCatDesc || undefined, color: newCatColor }) })
    const cat = await r.json()
    setNewCatName(''); setNewCatDesc(''); setShowAddCat(false); setSelectedCatId(cat.id)
    refresh()
  }

  const deleteCallCat = async (id: string) => {
    if (!confirm("Kategoriyani o'chirish? Barcha mezonlar ham o'chadi.")) return
    await fetch(`/api/categories?id=${id}`, { method: 'DELETE' })
    if (selectedCatId === id) setSelectedCatId(callCategories.find(c => c.id !== id)?.id ?? null)
    refresh()
  }

  const addCriteria = async (categoryId: string) => {
    if (!newCritName.trim()) return
    await fetch('/api/criteria', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newCritName, description: newCritDesc || undefined, categoryId }) })
    setNewCritName(''); setNewCritDesc(''); refresh()
  }

  const deleteCriteria = async (id: string) => {
    await fetch(`/api/criteria?id=${id}`, { method: 'DELETE' }); refresh()
  }

  const addLeadCat = async () => {
    if (!newLeadCatName.trim() || !newLeadCatLabel.trim()) return
    const r = await fetch('/api/lead-categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newLeadCatName, label: newLeadCatLabel, color: newLeadCatColor }) })
    const cat = await r.json()
    setNewLeadCatName(''); setNewLeadCatLabel(''); setShowAddLeadCat(false); setSelectedLeadId(cat.id)
    refresh()
  }

  const deleteLeadCat = async (id: string) => {
    if (!confirm("Lead kategoriyasini o'chirish?")) return
    await fetch(`/api/lead-categories?id=${id}`, { method: 'DELETE' })
    if (selectedLeadId === id) setSelectedLeadId(leadCategories.find(c => c.id !== id)?.id ?? null)
    refresh()
  }

  const addLeadCrit = async (leadCategoryId: string) => {
    if (!newLeadCritName.trim()) return
    await fetch('/api/lead-criteria', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newLeadCritName, description: newLeadCritDesc || undefined, leadCategoryId }) })
    setNewLeadCritName(''); setNewLeadCritDesc(''); refresh()
  }

  const deleteLeadCrit = async (id: string) => {
    await fetch(`/api/lead-criteria?id=${id}`, { method: 'DELETE' }); refresh()
  }

  const addManager = async () => {
    if (!newMgrName.trim()) return
    setMgrSaving(true)
    try {
      await fetch('/api/managers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newMgrName, email: newMgrEmail || undefined, phone: newMgrPhone || undefined, position: newMgrPos || undefined }) })
      setNewMgrName(''); setNewMgrEmail(''); setNewMgrPhone(''); setNewMgrPos('')
      setShowAddMgr(false); refresh()
    } finally { setMgrSaving(false) }
  }

  const deleteManager = async (id: string) => {
    if (!confirm("Managerni o'chirish? Uning barcha qo'ng'iroqlari ham o'chadi.")) return
    await fetch(`/api/managers?id=${id}`, { method: 'DELETE' }); refresh()
  }

  const visibleTabs = TABS.filter(t => !t.adminOnly || isAdmin)
  const filteredManagers = managers.filter(m =>
    m.name.toLowerCase().includes(managerSearch.toLowerCase()) ||
    (m.email || '').toLowerCase().includes(managerSearch.toLowerCase())
  )

  const DragIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-dim flex-shrink-0">
      <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
      <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
    </svg>
  )
  const TrashIcon = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  )
  const PlusIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
  )

  return (
    <div className="animate-fade-up">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-text-primary">Profil sozlamalari</h1>
      </div>

      {/* Tabs — underline style */}
      <div className="border-b border-bg-border mb-6">
        <div className="flex overflow-x-auto">
          {visibleTabs.map(tab => (
            <button key={tab.id} onClick={() => setTab(tab.id)}
              className={`px-4 pb-3 pt-1 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors flex-shrink-0 ${
                activeTab === tab.id ? 'border-brand-orange text-text-primary' : 'border-transparent text-text-muted hover:text-text-primary'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ===== PROFIL ===== */}
      {activeTab === 'profile' && (
        <div className="max-w-2xl space-y-5">
          <div className="card p-5">
            <div className="section-title mb-4">Profil ma&apos;lumotlari</div>
            <div className="flex items-center gap-4 mb-5 pb-5 border-b border-bg-border">
              <div className="w-14 h-14 rounded-full bg-brand-orange-dim border-2 border-brand-orange-muted flex items-center justify-center text-xl font-bold text-brand-orange flex-shrink-0">
                {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="font-bold text-text-primary">{user?.name || 'Foydalanuvchi'}</div>
                <div className="text-xs text-text-muted mt-0.5">{user?.email}</div>
                <div className="mt-1.5">
                  <span className={`badge ${user?.role === 'admin' || user?.role === 'superadmin' ? 'badge-warning' : 'badge-neutral'}`}>
                    {user?.role === 'superadmin' ? 'CEO / Superadmin' : user?.role === 'admin' ? 'Administrator' : 'Foydalanuvchi'}
                  </span>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-text-muted mb-1.5 block">Ism</label>
                <input value={name} onChange={e => setName(e.target.value)} className="input-field" placeholder="Ismingiz" />
              </div>
              <div>
                <label className="text-xs text-text-muted mb-1.5 block">Email</label>
                <input value={user?.email || ''} disabled className="input-field opacity-50 cursor-not-allowed" />
              </div>
            </div>
            <button onClick={saveProfile} disabled={saving} className="mt-4 px-4 py-2 text-sm font-semibold text-white bg-brand-orange hover:bg-brand-orange-hover rounded-md transition-colors disabled:opacity-50">
              {saving ? 'Saqlanmoqda...' : saved ? '✓ Saqlandi' : 'Saqlash'}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Rolim', value: user?.role === 'superadmin' ? 'CEO' : user?.role === 'admin' ? 'Admin' : 'User' },
              { label: 'Managerlar', value: isAdmin ? String(managerCount) : '—' },
              { label: "Ro'yxatdan o'tgan", value: user?.createdAt ? new Date(user.createdAt).toLocaleDateString('uz-UZ') : '—' },
            ].map(s => (
              <div key={s.label} className="metric-card">
                <div className="metric-value text-xl">{s.value}</div>
                <div className="metric-label">{s.label}</div>
              </div>
            ))}
          </div>

          {isAdmin && (
            <div className="card p-5">
              <div className="section-title mb-1">Kompaniya sozlamalari</div>
              <p className="text-xs text-text-muted mb-4">AI tahlil ushbu ma&apos;lumotlarga asoslanib suhbatlarni baholaydi</p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-text-muted mb-1.5 block">Kompaniya nomi</label>
                  <input value={companyName} onChange={e => setCompanyName(e.target.value)} className="input-field" placeholder="Mening kompaniyam" />
                </div>
                <div>
                  <label className="text-xs text-text-muted mb-1.5 block">Soha</label>
                  <input value={companyIndustry} onChange={e => setCompanyIndustry(e.target.value)} className="input-field" placeholder="Masalan: Qurilish materiallari" />
                </div>
                <div>
                  <label className="text-xs text-text-muted mb-1.5 block">Tavsif</label>
                  <textarea value={companyDesc} onChange={e => setCompanyDesc(e.target.value)} className="input-field" rows={2} placeholder="Kompaniya haqida qisqacha" />
                </div>
                <div>
                  <label className="text-xs text-text-muted mb-1.5 block">AI konteksti <span className="text-text-dim">(suhbat baholash uchun asosiy qoidalar)</span></label>
                  <textarea value={aiContext} onChange={e => setAiContext(e.target.value)} className="input-field" rows={5} placeholder="Masalan: Biz qurilish materiali sotamiz..." />
                </div>
              </div>
              <button onClick={saveCompany} disabled={compSaving} className="mt-4 px-4 py-2 text-sm font-semibold text-white bg-brand-orange hover:bg-brand-orange-hover rounded-md transition-colors disabled:opacity-50">
                {compSaving ? 'Saqlanmoqda...' : compSaved ? '✓ Saqlandi' : 'Saqlash'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ===== SUHBAT MEZONLARI ===== */}
      {activeTab === 'criteria' && isAdmin && (
        <div className="flex gap-4" style={{ height: 'calc(100vh - 220px)' }}>
          <div className="w-72 flex-shrink-0 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-text-primary">Kategoriyalar</span>
              <button onClick={() => setShowAddCat(v => !v)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-brand-orange hover:bg-brand-orange-hover rounded-md transition-colors">
                <PlusIcon /> Yangi kategoriya
              </button>
            </div>
            {showAddCat && (
              <div className="card p-3 space-y-2">
                <input value={newCatName} onChange={e => setNewCatName(e.target.value)} className="input-field" placeholder="Kategoriya nomi" />
                <input value={newCatDesc} onChange={e => setNewCatDesc(e.target.value)} className="input-field" placeholder="Tavsif (ixtiyoriy)" />
                <div><div className="text-xs text-text-muted mb-1.5">Rang</div><ColorPicker value={newCatColor} onChange={setNewCatColor} /></div>
                <div className="flex gap-2">
                  <button onClick={addCallCat} disabled={!newCatName.trim()} className="flex-1 py-1.5 text-xs font-semibold text-white bg-brand-orange rounded-md disabled:opacity-50">Qo&apos;shish</button>
                  <button onClick={() => setShowAddCat(false)} className="flex-1 py-1.5 text-xs text-text-muted border border-bg-border rounded-md hover:bg-bg-elevated">Bekor</button>
                </div>
              </div>
            )}
            <div className="flex-1 overflow-y-auto space-y-1">
              {callCategories.length === 0 && <p className="text-xs text-text-muted text-center py-6">Hali kategoriyalar qo&apos;shilmagan</p>}
              {callCategories.map(cat => (
                <div key={cat.id} onClick={() => setSelectedCatId(cat.id)}
                  className={`group flex items-center gap-2 p-3 rounded-lg cursor-pointer border transition-colors ${selectedCatId === cat.id ? 'border-brand-orange bg-brand-orange-dim' : 'border-bg-border hover:bg-bg-elevated'}`}>
                  <DragIcon />
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cat.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-text-primary truncate">{cat.name}</div>
                    {cat.description && <div className="text-xs text-text-muted truncate">{cat.description}</div>}
                  </div>
                  <span className="text-xs text-text-dim font-mono bg-bg-card px-1.5 py-0.5 rounded">({cat.criteria.length})</span>
                  <button onClick={e => { e.stopPropagation(); deleteCallCat(cat.id) }} className="p-1 text-text-muted hover:text-status-danger opacity-0 group-hover:opacity-100 transition-opacity">
                    <TrashIcon />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1 flex flex-col min-w-0 gap-2">
            {selectedCat ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-text-primary">&quot;{selectedCat.name}&quot; mezonlari</span>
                  <span className="text-xs text-text-muted">{selectedCat.criteria.length} ta mezon</span>
                </div>
                <div className="card p-3 flex gap-2">
                  <div className="flex-1 space-y-2">
                    <input value={newCritName} onChange={e => setNewCritName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCriteria(selectedCat.id)} className="input-field" placeholder="Mezon nomi..." />
                    <input value={newCritDesc} onChange={e => setNewCritDesc(e.target.value)} className="input-field" placeholder="Tavsif (ixtiyoriy)..." />
                  </div>
                  <button onClick={() => addCriteria(selectedCat.id)} disabled={!newCritName.trim()} className="px-3 text-sm font-bold text-white bg-brand-orange rounded-md disabled:opacity-50 self-stretch">+</button>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2">
                  {selectedCat.criteria.length === 0 && <p className="text-xs text-text-muted text-center py-8">Hali mezon qo&apos;shilmagan</p>}
                  {selectedCat.criteria.map((c, i) => (
                    <div key={c.id} className="group card p-3 flex items-start gap-3">
                      <DragIcon />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-text-primary">{i + 1}. {c.name}</div>
                        {c.description && <div className="text-xs text-text-muted mt-0.5 leading-relaxed">{c.description}</div>}
                      </div>
                      <button onClick={() => deleteCriteria(c.id)} className="p-1 text-text-muted hover:text-status-danger opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <TrashIcon />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-text-muted text-sm">Chap paneldan kategoriya tanlang</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== SUHBAT METRIKALARI ===== */}
      {activeTab === 'metrics' && isAdmin && (
        <div className="card p-10 text-center text-text-muted text-sm">Suhbat metrikalari tez orada qo&apos;shiladi</div>
      )}

      {/* ===== LID SIFATI ===== */}
      {activeTab === 'lead-quality' && isAdmin && (
        <div>
          <div className="card p-4 border-l-2 border-brand-orange mb-5 flex items-start gap-3">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand-orange mt-0.5 flex-shrink-0">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <div>
              <div className="text-sm font-bold text-text-primary">Lid sifati shu tartibda baholanadi</div>
              <p className="text-xs text-text-muted mt-1 leading-relaxed">Har bir kategoriya mezonlariga ball beriladi: mos kelsa 1, mos kelmasa 0, noaniq bo&apos;lsa 0.5. Eng yuqori o&apos;rtacha ball bo&apos;lgan kategoriya tanlanadi.</p>
            </div>
          </div>

          <div className="flex gap-4" style={{ height: 'calc(100vh - 320px)' }}>
            <div className="w-72 flex-shrink-0 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-text-primary">Kategoriyalar</span>
                <button onClick={() => setShowAddLeadCat(v => !v)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-brand-orange hover:bg-brand-orange-hover rounded-md transition-colors">
                  <PlusIcon /> Yangi kategoriya
                </button>
              </div>
              {showAddLeadCat && (
                <div className="card p-3 space-y-2">
                  <input value={newLeadCatLabel} onChange={e => setNewLeadCatLabel(e.target.value)} className="input-field" placeholder="Ko'rsatiladigan nom (Issiq lead)" />
                  <input value={newLeadCatName} onChange={e => setNewLeadCatName(e.target.value)} className="input-field" placeholder="Identifikator (issiq)" />
                  <div><div className="text-xs text-text-muted mb-1.5">Rang</div><ColorPicker value={newLeadCatColor} onChange={setNewLeadCatColor} /></div>
                  <div className="flex gap-2">
                    <button onClick={addLeadCat} disabled={!newLeadCatName.trim() || !newLeadCatLabel.trim()} className="flex-1 py-1.5 text-xs font-semibold text-white bg-brand-orange rounded-md disabled:opacity-50">Qo&apos;shish</button>
                    <button onClick={() => setShowAddLeadCat(false)} className="flex-1 py-1.5 text-xs text-text-muted border border-bg-border rounded-md hover:bg-bg-elevated">Bekor</button>
                  </div>
                </div>
              )}
              <div className="flex-1 overflow-y-auto space-y-1">
                {leadCategories.length === 0 && <p className="text-xs text-text-muted text-center py-6">Hali kategoriyalar qo&apos;shilmagan</p>}
                {leadCategories.map((cat, idx) => (
                  <div key={cat.id} onClick={() => setSelectedLeadId(cat.id)}
                    className={`group flex items-center gap-2 p-3 rounded-lg cursor-pointer border transition-colors ${selectedLeadId === cat.id ? 'border-brand-orange bg-brand-orange-dim' : 'border-bg-border hover:bg-bg-elevated'}`}>
                    <DragIcon />
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cat.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-text-primary">{idx + 1}. {cat.label}</div>
                    </div>
                    <span className="text-xs text-text-dim font-mono bg-bg-card px-1.5 py-0.5 rounded">({cat.criteria.length})</span>
                    <button onClick={e => { e.stopPropagation(); deleteLeadCat(cat.id) }} className="p-1 text-text-muted hover:text-status-danger opacity-0 group-hover:opacity-100 transition-opacity">
                      <TrashIcon />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-1 flex flex-col min-w-0 gap-2">
              {selectedLeadCat ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-text-primary">&laquo;{selectedLeadCat.label}&raquo; mezonlari</span>
                    <span className="text-xs text-text-muted">{selectedLeadCat.criteria.length} ta mezon</span>
                  </div>
                  <div className="card p-3 flex gap-2">
                    <div className="flex-1 space-y-2">
                      <input value={newLeadCritName} onChange={e => setNewLeadCritName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addLeadCrit(selectedLeadCat.id)} className="input-field" placeholder="Mezon nomi..." />
                      <input value={newLeadCritDesc} onChange={e => setNewLeadCritDesc(e.target.value)} className="input-field" placeholder="Tavsif..." />
                    </div>
                    <button onClick={() => addLeadCrit(selectedLeadCat.id)} disabled={!newLeadCritName.trim()} className="px-3 text-sm font-bold text-white bg-brand-orange rounded-md disabled:opacity-50 self-stretch">+</button>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-2">
                    {selectedLeadCat.criteria.length === 0 && <p className="text-xs text-text-muted text-center py-8">Hali mezon qo&apos;shilmagan</p>}
                    {selectedLeadCat.criteria.map((c, i) => (
                      <div key={c.id} className="group card p-3 flex items-start gap-3">
                        <DragIcon />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-text-primary">{i + 1}.</div>
                          <div className="text-xs text-text-muted mt-0.5 leading-relaxed">{c.name}</div>
                          {c.description && <div className="text-xs text-text-dim mt-0.5">{c.description}</div>}
                        </div>
                        <button onClick={() => deleteLeadCrit(c.id)} className="p-1 text-text-muted hover:text-status-danger opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          <TrashIcon />
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-text-muted text-sm">Chap paneldan kategoriya tanlang</p>
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
            <button onClick={() => setShowAddMgr(v => !v)} className="flex items-center gap-1 px-4 py-2 text-sm font-semibold text-white bg-brand-orange hover:bg-brand-orange-hover rounded-md transition-colors">
              <PlusIcon /> Yangi menejer
            </button>
          </div>

          {showAddMgr && (
            <div className="card p-4 mb-4">
              <div className="section-title mb-3">Yangi menejer qo&apos;shish</div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div><label className="text-xs text-text-muted mb-1 block">Ism *</label><input value={newMgrName} onChange={e => setNewMgrName(e.target.value)} className="input-field" placeholder="To'liq ism" /></div>
                <div><label className="text-xs text-text-muted mb-1 block">Lavozim</label><input value={newMgrPos} onChange={e => setNewMgrPos(e.target.value)} className="input-field" placeholder="Sales Manager" /></div>
                <div><label className="text-xs text-text-muted mb-1 block">Email</label><input value={newMgrEmail} onChange={e => setNewMgrEmail(e.target.value)} className="input-field" placeholder="email@example.com" type="email" /></div>
                <div><label className="text-xs text-text-muted mb-1 block">Telefon</label><input value={newMgrPhone} onChange={e => setNewMgrPhone(e.target.value)} className="input-field" placeholder="+998 90 123 45 67" /></div>
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
            <div className="p-3 border-b border-bg-border flex items-center gap-3">
              <div className="relative flex-1 max-w-xs">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input value={managerSearch} onChange={e => setManagerSearch(e.target.value)} className="input-field pl-8 text-sm" placeholder="Qidirish..." />
              </div>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th><th>Ism</th><th>Email</th><th>Telefon</th><th>Lavozim</th><th>Qo&apos;shilgan</th><th></th>
                </tr>
              </thead>
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
                    <td>
                      <button onClick={() => deleteManager(m.id)} className="text-xs text-status-danger hover:text-red-400 transition-colors px-2 py-1 font-semibold">O&apos;chirish</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="p-3 border-t border-bg-border">
              <span className="text-xs text-text-muted">{filteredManagers.length} natija ko&apos;rsatilmoqda</span>
            </div>
          </div>
        </div>
      )}

      {/* ===== BILDIRISHNOMALAR ===== */}
      {activeTab === 'notifications' && isAdmin && (
        <div className="max-w-2xl space-y-3">
          <div className="card p-5 text-center">
            <div className="w-12 h-12 rounded-full bg-bg-elevated flex items-center justify-center mx-auto mb-3">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted">
                <path d="M21.2 8.4c.5.38.8.97.8 1.6v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V10a2 2 0 0 1 .8-1.6l8-6a2 2 0 0 1 2.4 0l8 6Z"/>
                <path d="m22 10-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 10"/>
              </svg>
            </div>
            <div className="text-sm font-bold text-text-primary mb-1">Telegram bildirishnomalar</div>
            <p className="text-xs text-text-muted mb-4">Qo&apos;ng&apos;iroq tahlillari va kunlik hisobotlarni Telegram orqali oling</p>
            <button className="px-4 py-2 text-sm font-semibold text-white bg-brand-orange hover:bg-brand-orange-hover rounded-md transition-colors">Telegram ulash</button>
          </div>
          {[
            { label: 'Har bir tahlil natijasini yuborish', on: true },
            { label: 'Faqat muhim holatlarda xabar berish', on: false },
            { label: 'Kunlik xulosa', on: true },
            { label: 'Haftalik xulosa', on: true },
            { label: 'Oylik xulosa', on: true },
          ].map(item => (
            <div key={item.label} className="card p-4 flex items-center justify-between">
              <span className="text-sm font-semibold text-text-primary">{item.label}</span>
              <div className={`w-10 h-5 rounded-full relative cursor-pointer ${item.on ? 'bg-brand-orange' : 'bg-bg-elevated'}`}>
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
          <div className="card p-4 border-dashed border-bg-elevated text-center cursor-pointer hover:bg-bg-elevated transition-colors">
            <div className="text-sm text-text-muted font-semibold">+ Yangi integratsiya</div>
            <p className="text-xs text-text-dim mt-1">Bitrix24, AmoCRM, Yclients va boshqalar</p>
          </div>
        </div>
      )}
    </div>
  )
}
