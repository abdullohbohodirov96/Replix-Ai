'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Criteria = { id: string; name: string; description: string | null; order: number }
type CallCategory = { id: string; name: string; description: string | null; color: string; order: number; criteria: Criteria[] }
type LeadCategory = { id: string; name: string; label: string; description: string | null; color: string; order: number; criteria: Criteria[] }

interface Props {
  callCategories: CallCategory[]
  leadCategories: LeadCategory[]
}

const COLORS = ['#3b82f6', '#f97316', '#22c55e', '#ef4444', '#8b5cf6', '#06b6d4', '#f59e0b', '#ec4899']

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {COLORS.map(c => (
        <button
          key={c}
          onClick={() => onChange(c)}
          className="w-5 h-5 rounded-full border-2 transition-all flex-shrink-0"
          style={{ background: c, borderColor: value === c ? '#ffffff' : 'transparent', outline: value === c ? `2px solid ${c}40` : 'none' }}
        />
      ))}
    </div>
  )
}

export default function SettingsClient({ callCategories: initCallCats, leadCategories: initLeadCats }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<'call' | 'lead'>('call')
  const [expandedCat, setExpandedCat] = useState<string | null>(null)
  const [expandedLead, setExpandedLead] = useState<string | null>(null)
  const [showInfo, setShowInfo] = useState(false)

  // New category form
  const [newCatName, setNewCatName] = useState('')
  const [newCatDesc, setNewCatDesc] = useState('')
  const [newCatColor, setNewCatColor] = useState('#3b82f6')
  const [addingCat, setAddingCat] = useState(false)

  // New lead category form
  const [newLeadName, setNewLeadName] = useState('')
  const [newLeadLabel, setNewLeadLabel] = useState('')
  const [newLeadDesc, setNewLeadDesc] = useState('')
  const [newLeadColor, setNewLeadColor] = useState('#f97316')
  const [addingLead, setAddingLead] = useState(false)

  // Criteria forms per category
  const [criteriaForms, setCriteriaForms] = useState<Record<string, { name: string; desc: string }>>({})
  const [leadCriteriaForms, setLeadCriteriaForms] = useState<Record<string, { name: string; desc: string }>>({})

  const refresh = () => router.refresh()

  const addCallCat = async () => {
    if (!newCatName.trim()) return
    setAddingCat(true)
    await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newCatName, description: newCatDesc || undefined, color: newCatColor }),
    })
    setNewCatName(''); setNewCatDesc('')
    setAddingCat(false)
    refresh()
  }

  const deleteCallCat = async (id: string) => {
    if (!confirm("Kategoriyani o'chirish? Barcha mezunlar ham o'chadi.")) return
    await fetch(`/api/categories?id=${id}`, { method: 'DELETE' })
    refresh()
  }

  const addLeadCat = async () => {
    if (!newLeadName.trim() || !newLeadLabel.trim()) return
    setAddingLead(true)
    await fetch('/api/lead-categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newLeadName, label: newLeadLabel, description: newLeadDesc || undefined, color: newLeadColor }),
    })
    setNewLeadName(''); setNewLeadLabel(''); setNewLeadDesc('')
    setAddingLead(false)
    refresh()
  }

  const deleteLeadCat = async (id: string) => {
    if (!confirm("Lead kategoriyasini o'chirish?")) return
    await fetch(`/api/lead-categories?id=${id}`, { method: 'DELETE' })
    refresh()
  }

  const addCriteria = async (categoryId: string) => {
    const form = criteriaForms[categoryId]
    if (!form?.name.trim()) return
    await fetch('/api/criteria', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.name, description: form.desc || undefined, categoryId }),
    })
    setCriteriaForms(prev => ({ ...prev, [categoryId]: { name: '', desc: '' } }))
    refresh()
  }

  const deleteCriteria = async (id: string) => {
    await fetch(`/api/criteria?id=${id}`, { method: 'DELETE' })
    refresh()
  }

  const addLeadCriteria = async (leadCategoryId: string) => {
    const form = leadCriteriaForms[leadCategoryId]
    if (!form?.name.trim()) return
    await fetch('/api/lead-criteria', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.name, description: form.desc || undefined, leadCategoryId }),
    })
    setLeadCriteriaForms(prev => ({ ...prev, [leadCategoryId]: { name: '', desc: '' } }))
    refresh()
  }

  const deleteLeadCriteria = async (id: string) => {
    await fetch(`/api/lead-criteria?id=${id}`, { method: 'DELETE' })
    refresh()
  }

  const setCritForm = (catId: string, field: 'name' | 'desc', val: string) =>
    setCriteriaForms(prev => ({ ...prev, [catId]: { name: prev[catId]?.name || '', desc: prev[catId]?.desc || '', [field]: val } }))

  const setLeadCritForm = (catId: string, field: 'name' | 'desc', val: string) =>
    setLeadCriteriaForms(prev => ({ ...prev, [catId]: { name: prev[catId]?.name || '', desc: prev[catId]?.desc || '', [field]: val } }))

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-fade-up">
      <div>
        <h1 className="text-xl font-bold text-text-primary">Sozlamalar</h1>
        <p className="text-xs text-text-muted mt-0.5">Kategoriyalar va mezonlarni boshqarish (faqat admin)</p>
      </div>

      {/* Tabs */}
      <div className="tab-list">
        <button className={`tab-item ${tab === 'call' ? 'active' : ''}`} onClick={() => setTab('call')}>
          Suhbat kategoriyalari
        </button>
        <button className={`tab-item ${tab === 'lead' ? 'active' : ''}`} onClick={() => setTab('lead')}>
          Lead kategoriyalari
        </button>
      </div>

      {/* Call categories */}
      {tab === 'call' && (
        <div className="space-y-3">
          <p className="text-xs text-text-muted">
            AI har bir suhbatni ushbu kategoriyalardan biriga tasnif qiladi va tegishli mezonlar bo&apos;yicha baholaydi.
          </p>

          {initCallCats.length === 0 && (
            <p className="text-sm text-text-muted text-center py-8">Hali kategoriyalar qo&apos;shilmagan</p>
          )}

          {initCallCats.map(cat => (
            <div key={cat.id} className="card overflow-hidden">
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-bg-elevated transition-colors"
                onClick={() => setExpandedCat(expandedCat === cat.id ? null : cat.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: cat.color }} />
                  <div>
                    <div className="text-sm font-semibold text-text-primary">{cat.name}</div>
                    {cat.description && <div className="text-xs text-text-muted mt-0.5">{cat.description}</div>}
                  </div>
                  <span className="font-mono text-xs text-text-dim bg-bg-elevated px-1.5 py-0.5 rounded">
                    {cat.criteria.length} mezon
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={e => { e.stopPropagation(); deleteCallCat(cat.id) }}
                    className="text-xs text-text-muted hover:text-status-danger transition-colors px-2 py-1"
                  >
                    O&apos;chirish
                  </button>
                  <svg
                    className={`text-text-muted transition-transform duration-200 ${expandedCat === cat.id ? 'rotate-180' : ''}`}
                    width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  >
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </div>
              </div>

              {expandedCat === cat.id && (
                <div className="border-t border-bg-border p-4 bg-bg-elevated/50 space-y-3">
                  {cat.criteria.length === 0 ? (
                    <p className="text-xs text-text-muted">Hali mezon qo&apos;shilmagan</p>
                  ) : (
                    <div className="space-y-1.5">
                      {cat.criteria.map(c => (
                        <div key={c.id} className="flex items-start justify-between gap-2 px-3 py-2 bg-bg-card rounded-md border border-bg-border group">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-text-primary">{c.name}</div>
                            {c.description && <div className="text-xs text-text-muted mt-0.5">{c.description}</div>}
                          </div>
                          <button
                            onClick={() => deleteCriteria(c.id)}
                            className="text-text-muted hover:text-status-danger transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6"/>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2 mt-2">
                    <input
                      value={criteriaForms[cat.id]?.name || ''}
                      onChange={e => setCritForm(cat.id, 'name', e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addCriteria(cat.id)}
                      className="input-field flex-1"
                      placeholder="Mezon nomi..."
                    />
                    <button
                      onClick={() => addCriteria(cat.id)}
                      className="px-3 py-1.5 text-xs font-medium text-white bg-brand-orange hover:bg-brand-orange-hover rounded-md transition-colors whitespace-nowrap"
                    >
                      + Qo&apos;shish
                    </button>
                  </div>
                  <input
                    value={criteriaForms[cat.id]?.desc || ''}
                    onChange={e => setCritForm(cat.id, 'desc', e.target.value)}
                    className="input-field"
                    placeholder="Mezon tavsifi (ixtiyoriy)..."
                  />
                </div>
              )}
            </div>
          ))}

          {/* Add category form */}
          <div className="card p-4">
            <div className="section-title mb-3">Yangi kategoriya qo&apos;shish</div>
            <div className="space-y-3">
              <input
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                className="input-field"
                placeholder="Kategoriya nomi (masalan: Sotuv)"
              />
              <input
                value={newCatDesc}
                onChange={e => setNewCatDesc(e.target.value)}
                className="input-field"
                placeholder="Tavsif (ixtiyoriy)"
              />
              <div>
                <div className="text-xs text-text-muted mb-2">Rang</div>
                <ColorPicker value={newCatColor} onChange={setNewCatColor} />
              </div>
              <button
                onClick={addCallCat}
                disabled={addingCat || !newCatName.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-brand-orange hover:bg-brand-orange-hover rounded-md transition-colors disabled:opacity-50"
              >
                {addingCat ? "Qo'shilmoqda..." : '+ Kategoriya qo\'shish'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lead categories */}
      {tab === 'lead' && (
        <div className="space-y-3">
          {/* Info banner */}
          <div className="card p-4 border-l-2 border-brand-orange">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-sm font-semibold text-text-primary mb-1">Lead sifati qanday baholanadi?</div>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Har bir kategoriya mezonlariga ball beriladi: mos kelsa 1, mos kelmasa 0, noaniq bo&apos;lsa 0.5.
                  Eng yuqori o&apos;rtacha ball bo&apos;lgan kategoriya tanlanadi.
                </p>
              </div>
              <button
                onClick={() => setShowInfo(!showInfo)}
                className="text-xs text-brand-orange hover:text-brand-orange-hover transition-colors flex-shrink-0"
              >
                {showInfo ? 'Yopish' : 'Batafsil'}
              </button>
            </div>
            {showInfo && (
              <div className="mt-3 pt-3 border-t border-bg-border text-xs text-text-muted leading-relaxed space-y-1">
                <p>• <strong className="text-text-secondary">1 ball</strong> — mijozning holati mezon talabiga to&apos;liq mos kelsa</p>
                <p>• <strong className="text-text-secondary">0.5 ball</strong> — noaniq: manager so&apos;ramagan yoki javob noma&apos;lum</p>
                <p>• <strong className="text-text-secondary">0 ball</strong> — mezon talabiga mos kelmasa</p>
                <p className="mt-2 text-text-secondary">
                  Agar ballar teng bo&apos;lsa — kategoriya tartibi bo&apos;yicha eng yuqori olinadi.
                </p>
              </div>
            )}
          </div>

          {initLeadCats.length === 0 && (
            <p className="text-sm text-text-muted text-center py-8">Hali lead kategoriyalari qo&apos;shilmagan</p>
          )}

          {initLeadCats.map(cat => (
            <div key={cat.id} className="card overflow-hidden">
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-bg-elevated transition-colors"
                onClick={() => setExpandedLead(expandedLead === cat.id ? null : cat.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: cat.color }} />
                  <div>
                    <div className="text-sm font-semibold text-text-primary">{cat.label}</div>
                    {cat.description && <div className="text-xs text-text-muted mt-0.5">{cat.description}</div>}
                  </div>
                  <span className="font-mono text-xs text-text-dim bg-bg-elevated px-1.5 py-0.5 rounded">
                    {cat.criteria.length} mezon
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={e => { e.stopPropagation(); deleteLeadCat(cat.id) }}
                    className="text-xs text-text-muted hover:text-status-danger transition-colors px-2 py-1"
                  >
                    O&apos;chirish
                  </button>
                  <svg
                    className={`text-text-muted transition-transform duration-200 ${expandedLead === cat.id ? 'rotate-180' : ''}`}
                    width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  >
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </div>
              </div>

              {expandedLead === cat.id && (
                <div className="border-t border-bg-border p-4 bg-bg-elevated/50 space-y-3">
                  {cat.criteria.length === 0 ? (
                    <p className="text-xs text-text-muted">Hali mezon qo&apos;shilmagan</p>
                  ) : (
                    <div className="space-y-1.5">
                      {cat.criteria.map(c => (
                        <div key={c.id} className="flex items-start justify-between gap-2 px-3 py-2 bg-bg-card rounded-md border border-bg-border group">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-text-primary">{c.name}</div>
                            {c.description && <div className="text-xs text-text-muted mt-0.5">{c.description}</div>}
                          </div>
                          <button
                            onClick={() => deleteLeadCriteria(c.id)}
                            className="text-text-muted hover:text-status-danger transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6"/>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2 mt-2">
                    <input
                      value={leadCriteriaForms[cat.id]?.name || ''}
                      onChange={e => setLeadCritForm(cat.id, 'name', e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addLeadCriteria(cat.id)}
                      className="input-field flex-1"
                      placeholder="Mezon nomi..."
                    />
                    <button
                      onClick={() => addLeadCriteria(cat.id)}
                      className="px-3 py-1.5 text-xs font-medium text-white bg-brand-orange hover:bg-brand-orange-hover rounded-md transition-colors whitespace-nowrap"
                    >
                      + Qo&apos;shish
                    </button>
                  </div>
                  <input
                    value={leadCriteriaForms[cat.id]?.desc || ''}
                    onChange={e => setLeadCritForm(cat.id, 'desc', e.target.value)}
                    className="input-field"
                    placeholder="Mezon tavsifi (ixtiyoriy)..."
                  />
                </div>
              )}
            </div>
          ))}

          {/* Add lead category form */}
          <div className="card p-4">
            <div className="section-title mb-3">Yangi lead kategoriyasi</div>
            <div className="space-y-3">
              <input
                value={newLeadName}
                onChange={e => setNewLeadName(e.target.value)}
                className="input-field"
                placeholder="Nom (masalan: issiq)"
              />
              <input
                value={newLeadLabel}
                onChange={e => setNewLeadLabel(e.target.value)}
                className="input-field"
                placeholder="Ko'rsatiladigan nom (masalan: Issiq lead)"
              />
              <input
                value={newLeadDesc}
                onChange={e => setNewLeadDesc(e.target.value)}
                className="input-field"
                placeholder="Tavsif (ixtiyoriy)"
              />
              <div>
                <div className="text-xs text-text-muted mb-2">Rang</div>
                <ColorPicker value={newLeadColor} onChange={setNewLeadColor} />
              </div>
              <button
                onClick={addLeadCat}
                disabled={addingLead || !newLeadName.trim() || !newLeadLabel.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-brand-orange hover:bg-brand-orange-hover rounded-md transition-colors disabled:opacity-50"
              >
                {addingLead ? "Qo'shilmoqda..." : '+ Kategoriya qo\'shish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
