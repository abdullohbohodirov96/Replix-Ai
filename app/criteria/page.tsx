'use client'

import { useState, useEffect } from 'react'
import AppShell from '@/components/AppShell'

interface Criterion {
  id: string
  name: string
  callType: string
  description: string
  maxScore: number
  weight: number
  sortOrder: number
  isActive: boolean
}

interface LeadCriterion {
  id: string
  leadType: string
  criteria: string
  description?: string
  isActive: boolean
}

const CALL_TYPES = [
  { value: 'sotuv', label: 'Sotuv qo\'ng\'irog\'i' },
  { value: 'qayta_qongiroq', label: 'Qayta qo\'ng\'iroq' },
  { value: 'kiruvchi', label: 'Kiruvchi qo\'ng\'iroq' },
  { value: 'chiquvchi', label: 'Chiquvchi qo\'ng\'iroq' },
]

const LEAD_TYPES = [
  { value: 'hot', label: '🔥 Hot Lead', color: 'text-red-400' },
  { value: 'warm', label: '🌤️ Warm Lead', color: 'text-yellow-400' },
  { value: 'cold', label: '❄️ Cold Lead', color: 'text-blue-400' },
]

export default function CriteriaPage() {
  const [criteria, setCriteria] = useState<Criterion[]>([])
  const [leadCriteria, setLeadCriteria] = useState<LeadCriterion[]>([])
  const [activeTab, setActiveTab] = useState<'call' | 'lead'>('call')
  const [selectedCallType, setSelectedCallType] = useState('sotuv')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showLeadForm, setShowLeadForm] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  // Call criteria form
  const [form, setForm] = useState({
    name: '',
    callType: 'sotuv',
    description: '',
    maxScore: 10,
    weight: 1.0,
  })

  // Lead scoring form
  const [leadForm, setLeadForm] = useState({
    leadType: 'hot',
    criteriaText: '',
    description: '',
  })

  const load = () => {
    fetch('/api/criteria')
      .then((r) => r.json())
      .then((data) => {
        setCriteria(data.criteria || [])
        setLeadCriteria(data.leadCriteria || [])
        setLoading(false)
      })
  }

  useEffect(() => { load() }, [])

  const saveCriterion = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/criteria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (data.ok) {
        setMsg('✅ Saqlandi!')
        setShowForm(false)
        setForm({ name: '', callType: 'sotuv', description: '', maxScore: 10, weight: 1.0 })
        load()
      } else {
        setMsg('❌ ' + data.error)
      }
    } catch {
      setMsg('❌ Xatolik')
    } finally {
      setSaving(false)
      setTimeout(() => setMsg(''), 3000)
    }
  }

  const saveLeadCriterion = async () => {
    setSaving(true)
    const criteriaArr = leadForm.criteriaText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)

    try {
      const existing = leadCriteria.find((lc) => lc.leadType === leadForm.leadType)
      const res = await fetch('/api/criteria', {
        method: existing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'lead_scoring',
          id: existing?.id,
          leadType: leadForm.leadType,
          criteria: criteriaArr,
          description: leadForm.description,
        }),
      })
      const data = await res.json()
      if (data.ok) {
        setMsg('✅ Saqlandi!')
        setShowLeadForm(null)
        load()
      } else {
        setMsg('❌ ' + data.error)
      }
    } catch {
      setMsg('❌ Xatolik')
    } finally {
      setSaving(false)
      setTimeout(() => setMsg(''), 3000)
    }
  }

  const deleteCriterion = async (id: string) => {
    if (!confirm('O\'chirilsinmi?')) return
    await fetch(`/api/criteria?id=${id}`, { method: 'DELETE' })
    load()
  }

  const toggleActive = async (id: string, isActive: boolean) => {
    await fetch('/api/criteria', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, isActive: !isActive }),
    })
    load()
  }

  const filteredCriteria = criteria.filter((c) => c.callType === selectedCallType)

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-64 text-gray-400">Yuklanmoqda...</div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-syne)' }}>
              Tahlil Mezonlari
            </h1>
            <p className="text-gray-400 mt-1">
              Qo'ng'iroq tahlili va lead baholash mezonlarini sozlang
            </p>
          </div>
        </div>

        {msg && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${msg.startsWith('✅') ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
            {msg}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('call')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'call' ? 'bg-orange-500 text-white' : 'bg-[#1E1E35] text-gray-400 hover:text-white'}`}
          >
            🎙️ Qo'ng'iroq mezonlari
          </button>
          <button
            onClick={() => setActiveTab('lead')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'lead' ? 'bg-orange-500 text-white' : 'bg-[#1E1E35] text-gray-400 hover:text-white'}`}
          >
            🎯 Lead baholash
          </button>
        </div>

        {/* Call Analysis Criteria */}
        {activeTab === 'call' && (
          <div>
            <div className="flex gap-2 mb-4 flex-wrap">
              {CALL_TYPES.map((ct) => (
                <button
                  key={ct.value}
                  onClick={() => setSelectedCallType(ct.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${selectedCallType === ct.value ? 'bg-blue-600 text-white' : 'bg-[#1E1E35] text-gray-400 hover:text-white'}`}
                >
                  {ct.label}
                </button>
              ))}
              <button
                onClick={() => { setForm({ ...form, callType: selectedCallType }); setShowForm(true) }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 border border-orange-500/20 ml-auto"
              >
                + Mezon qo'shish
              </button>
            </div>

            {showForm && (
              <div className="bg-[#1E1E35] rounded-xl p-5 border border-orange-500/20 mb-4">
                <h3 className="text-white font-medium mb-4">Yangi mezon</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Mezon nomi</label>
                    <input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Masalan: Kirish qismi, Ehtiyojni aniqlash..."
                      className="w-full bg-[#0D0D1A] border border-[#2A2A45] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Qo'ng'iroq turi</label>
                    <select
                      value={form.callType}
                      onChange={(e) => setForm({ ...form, callType: e.target.value })}
                      className="w-full bg-[#0D0D1A] border border-[#2A2A45] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500"
                    >
                      {CALL_TYPES.map((ct) => (
                        <option key={ct.value} value={ct.value}>{ct.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Tavsif (AI nima baholashini biladi)</label>
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="Masalan: Manager o'zini tanitib, qo'ng'iroq sababini aniq tushuntirganmi? Mijozni hurmat bilan salomlashganmi?"
                      rows={3}
                      className="w-full bg-[#0D0D1A] border border-[#2A2A45] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500 resize-none"
                    />
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-xs text-gray-400 block mb-1">Maksimal ball</label>
                      <input
                        type="number"
                        value={form.maxScore}
                        onChange={(e) => setForm({ ...form, maxScore: Number(e.target.value) })}
                        min={1} max={10}
                        className="w-full bg-[#0D0D1A] border border-[#2A2A45] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-gray-400 block mb-1">Og'irlik (1.0 = normal)</label>
                      <input
                        type="number"
                        value={form.weight}
                        onChange={(e) => setForm({ ...form, weight: Number(e.target.value) })}
                        step={0.5} min={0.5} max={3}
                        className="w-full bg-[#0D0D1A] border border-[#2A2A45] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={saveCriterion}
                      disabled={saving || !form.name || !form.description}
                      className="flex-1 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium"
                    >
                      {saving ? 'Saqlanmoqda...' : 'Saqlash'}
                    </button>
                    <button
                      onClick={() => setShowForm(false)}
                      className="px-4 py-2 bg-[#0D0D1A] text-gray-400 hover:text-white rounded-lg text-sm"
                    >
                      Bekor
                    </button>
                  </div>
                </div>
              </div>
            )}

            {filteredCriteria.length === 0 ? (
              <div className="bg-[#1E1E35] rounded-xl p-8 border border-[#2A2A45] text-center">
                <p className="text-gray-400 text-sm">Bu qo'ng'iroq turi uchun mezonlar yo'q</p>
                <p className="text-gray-500 text-xs mt-1">AI standart tahlil qiladi</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredCriteria.map((c, i) => (
                  <div
                    key={c.id}
                    className={`bg-[#1E1E35] rounded-xl p-4 border ${c.isActive ? 'border-[#2A2A45]' : 'border-[#2A2A45] opacity-50'}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 w-5">{i + 1}.</span>
                          <span className="text-white font-medium text-sm">{c.name}</span>
                          <span className="text-xs bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded-full">
                            {c.maxScore} ball
                          </span>
                          {c.weight !== 1 && (
                            <span className="text-xs bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full">
                              ×{c.weight}
                            </span>
                          )}
                        </div>
                        <p className="text-gray-400 text-xs mt-1 ml-7">{c.description}</p>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => toggleActive(c.id, c.isActive)}
                          className={`text-xs px-2 py-1 rounded ${c.isActive ? 'text-green-400 bg-green-500/10' : 'text-gray-500 bg-gray-500/10'}`}
                        >
                          {c.isActive ? 'Faol' : 'Nofaol'}
                        </button>
                        <button
                          onClick={() => deleteCriterion(c.id)}
                          className="text-xs text-red-400 hover:text-red-300 px-2 py-1"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Lead Scoring Criteria */}
        {activeTab === 'lead' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-400">
              AI qo'ng'iroqni tahlil qilayotganda bu mezonlar bo'yicha lead turini aniqlaydi
            </p>
            {LEAD_TYPES.map((lt) => {
              const existing = leadCriteria.find((lc) => lc.leadType === lt.value)
              const isEditing = showLeadForm === lt.value
              let criteriaList: string[] = []
              try {
                if (existing) criteriaList = JSON.parse(existing.criteria)
              } catch {}

              return (
                <div key={lt.value} className="bg-[#1E1E35] rounded-xl p-5 border border-[#2A2A45]">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className={`font-semibold ${lt.color}`}>{lt.label}</h3>
                    <button
                      onClick={() => {
                        setLeadForm({
                          leadType: lt.value,
                          criteriaText: criteriaList.join('\n'),
                          description: existing?.description || '',
                        })
                        setShowLeadForm(isEditing ? null : lt.value)
                      }}
                      className="text-xs px-3 py-1.5 bg-[#0D0D1A] text-gray-400 hover:text-white rounded-lg border border-[#2A2A45]"
                    >
                      {isEditing ? 'Yopish' : criteriaList.length > 0 ? 'Tahrirlash' : 'Qo\'shish'}
                    </button>
                  </div>

                  {!isEditing && criteriaList.length > 0 && (
                    <ul className="space-y-1">
                      {criteriaList.map((item, i) => (
                        <li key={i} className="text-sm text-gray-300 flex gap-2">
                          <span className="text-gray-600">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {!isEditing && criteriaList.length === 0 && (
                    <p className="text-xs text-gray-500">Mezonlar kiritilmagan — AI o'zi aniqlaydi</p>
                  )}

                  {isEditing && (
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-gray-400 block mb-1">
                          Mezonlar (har bir qator — bitta mezon)
                        </label>
                        <textarea
                          value={leadForm.criteriaText}
                          onChange={(e) => setLeadForm({ ...leadForm, criteriaText: e.target.value })}
                          placeholder={
                            lt.value === 'hot'
                              ? 'Narxni so\'radi\nQachon olish mumkinligini so\'radi\nMahsulot haqida ko\'p savol berdi\nDarrov qaror qilmoqchi'
                              : lt.value === 'warm'
                              ? 'Qiziqdi lekin qaror qilmadi\nKeyinroq qo\'ng\'iroq qilishni so\'radi\nBoshqalar bilan maslahatlashish kerak dedi'
                              : 'Qiziqmadi\nRad etdi\nQimmat dedi va savol bermadi\nGap o\'zgartirdi'
                          }
                          rows={5}
                          className="w-full bg-[#0D0D1A] border border-[#2A2A45] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500 resize-none"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={saveLeadCriterion}
                          disabled={saving}
                          className="flex-1 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium"
                        >
                          {saving ? 'Saqlanmoqda...' : 'Saqlash'}
                        </button>
                        <button
                          onClick={() => setShowLeadForm(null)}
                          className="px-4 py-2 bg-[#0D0D1A] text-gray-400 rounded-lg text-sm"
                        >
                          Bekor
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AppShell>
  )
}
