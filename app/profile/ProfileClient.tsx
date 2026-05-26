'use client'
import { useState } from 'react'

interface User {
  id: string
  name: string | null
  email: string
  role: string
  managerId: string | null
  createdAt: Date
}
interface Company {
  id: string
  name: string
  description: string | null
  industry: string | null
  aiContext: string | null
}
interface Props {
  user: User | null
  company: Company | null
  isAdmin: boolean
  managerCount: number
}

export default function ProfileClient({ user, company, isAdmin, managerCount }: Props) {
  const [name, setName] = useState(user?.name || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [companyName, setCompanyName] = useState(company?.name || '')
  const [companyDesc, setCompanyDesc] = useState(company?.description || '')
  const [companyIndustry, setCompanyIndustry] = useState(company?.industry || '')
  const [aiContext, setAiContext] = useState(company?.aiContext || '')
  const [compSaving, setCompSaving] = useState(false)
  const [compSaved, setCompSaved] = useState(false)

  const saveProfile = async () => {
    setSaving(true)
    try {
      await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  const saveCompany = async () => {
    setCompSaving(true)
    try {
      await fetch('/api/company', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: companyName, description: companyDesc, industry: companyIndustry, aiContext }),
      })
      setCompSaved(true)
      setTimeout(() => setCompSaved(false), 2000)
    } finally {
      setCompSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-fade-up">
      <div>
        <h1 className="text-xl font-bold text-text-primary">Profil</h1>
        <p className="text-xs text-text-muted mt-0.5">Shaxsiy ma&apos;lumotlar va kompaniya sozlamalari</p>
      </div>

      {/* Profile card */}
      <div className="card p-5">
        <div className="section-title mb-4">Profil ma&apos;lumotlari</div>
        <div className="flex items-center gap-4 mb-5 pb-5 border-b border-bg-border">
          <div className="w-14 h-14 rounded-full bg-brand-orange-dim border-2 border-brand-orange-muted flex items-center justify-center text-xl font-bold text-brand-orange flex-shrink-0">
            {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-semibold text-text-primary">{user?.name || 'Foydalanuvchi'}</div>
            <div className="text-xs text-text-muted mt-0.5">{user?.email}</div>
            <div className="mt-1.5">
              <span className={`badge ${user?.role === 'admin' ? 'badge-warning' : 'badge-neutral'}`}>
                {user?.role === 'admin' ? 'Administrator' : 'Foydalanuvchi'}
              </span>
            </div>
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-text-muted mb-1.5 block">Ism</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="input-field"
              placeholder="Ismingiz"
            />
          </div>
          <div>
            <label className="text-xs text-text-muted mb-1.5 block">Email</label>
            <input
              value={user?.email || ''}
              disabled
              className="input-field opacity-50 cursor-not-allowed"
            />
          </div>
        </div>
        <button
          onClick={saveProfile}
          disabled={saving}
          className="mt-4 px-4 py-2 text-sm font-medium text-white bg-brand-orange hover:bg-brand-orange-hover rounded-md transition-colors disabled:opacity-50"
        >
          {saving ? 'Saqlanmoqda...' : saved ? '✓ Saqlandi' : 'Saqlash'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Rolim', value: user?.role === 'admin' ? 'Admin' : 'User' },
          { label: 'Managerlar', value: isAdmin ? String(managerCount) : '—' },
          {
            label: "Ro'yxatdan o'tgan",
            value: user?.createdAt ? new Date(user.createdAt).toLocaleDateString('uz-UZ') : '—',
          },
        ].map(s => (
          <div key={s.label} className="metric-card">
            <div className="metric-value text-xl">{s.value}</div>
            <div className="metric-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Company settings (admin only) */}
      {isAdmin && (
        <div className="card p-5">
          <div className="section-title mb-1">Kompaniya sozlamalari</div>
          <p className="text-xs text-text-muted mb-4">
            AI tahlil ushbu ma&apos;lumotlarga asoslanib suhbatlarni baholaydi
          </p>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-text-muted mb-1.5 block">Kompaniya nomi</label>
              <input
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                className="input-field"
                placeholder="Mening kompaniyam"
              />
            </div>
            <div>
              <label className="text-xs text-text-muted mb-1.5 block">Soha</label>
              <input
                value={companyIndustry}
                onChange={e => setCompanyIndustry(e.target.value)}
                className="input-field"
                placeholder="Masalan: Qurilish materiallari"
              />
            </div>
            <div>
              <label className="text-xs text-text-muted mb-1.5 block">Tavsif</label>
              <textarea
                value={companyDesc}
                onChange={e => setCompanyDesc(e.target.value)}
                className="input-field"
                rows={2}
                placeholder="Kompaniya haqida qisqacha"
              />
            </div>
            <div>
              <label className="text-xs text-text-muted mb-1.5 block">
                AI konteksti{' '}
                <span className="text-text-dim">(suhbat baholash uchun asosiy qoidalar)</span>
              </label>
              <textarea
                value={aiContext}
                onChange={e => setAiContext(e.target.value)}
                className="input-field"
                rows={5}
                placeholder={`Masalan: Biz qurilish materiali sotamiz. Asosiy mahsulotlar: tsement, g'isht, armatura, laminat. Manager mijozga narx aytishdan oldin ehtiyojni aniqlashi shart. Har doim keyingi qadam kelishilishi kerak...`}
              />
              <p className="text-xs text-text-dim mt-1">
                Bu matn har bir qo&apos;ng&apos;iroq tahlilida AI&apos;ga qo&apos;shimcha kontekst sifatida beriladi
              </p>
            </div>
          </div>
          <button
            onClick={saveCompany}
            disabled={compSaving}
            className="mt-4 px-4 py-2 text-sm font-medium text-white bg-brand-orange hover:bg-brand-orange-hover rounded-md transition-colors disabled:opacity-50"
          >
            {compSaving ? 'Saqlanmoqda...' : compSaved ? '✓ Saqlandi' : 'Saqlash'}
          </button>
        </div>
      )}
    </div>
  )
}
