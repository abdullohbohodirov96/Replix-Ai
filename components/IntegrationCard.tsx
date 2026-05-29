'use client'

import { useState } from 'react'

interface Field {
  key: string
  label: string
  placeholder: string
  secret: boolean
}

interface Props {
  name: string
  label: string
  description: string
  color: string
  fields: Field[]
  enabled: boolean
  lastSync: string | null
}

export default function IntegrationCard({ name, label, description, color, fields, enabled: initialEnabled, lastSync }: Props) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const [expanded, setExpanded] = useState(false)
  const [config, setConfig] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState<'save' | 'test' | 'sync' | null>(null)
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)

  async function toggleEnable() {
    setLoading('save')
    try {
      const res = await fetch('/api/integrations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, enabled: !enabled }),
      })
      if (res.ok) setEnabled(!enabled)
    } finally { setLoading(null) }
  }

  async function saveConfig() {
    setLoading('save')
    setMessage(null)
    try {
      const res = await fetch('/api/integrations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, config }),
      })
      if (res.ok) setMessage({ text: 'Saqlandi', ok: true })
      else setMessage({ text: 'Saqlashda xatolik', ok: false })
    } finally { setLoading(null) }
  }

  async function testConn() {
    setLoading('test')
    setMessage(null)
    try {
      const res = await fetch(`/api/integrations/${name}/test`, { method: 'POST' })
      const data = await res.json()
      setMessage({ text: data.message || (data.success ? 'Muvaffaqiyatli' : 'Xatolik'), ok: data.success })
    } finally { setLoading(null) }
  }

  async function syncNow() {
    setLoading('sync')
    setMessage(null)
    try {
      const res = await fetch(`/api/integrations/${name}/sync`, { method: 'POST' })
      const data = await res.json()
      setMessage({ text: data.message || (data.success ? 'Sinxronlashdi' : 'Xatolik'), ok: !!data.success })
    } finally { setLoading(null) }
  }

  return (
    <div className="rounded-xl border border-[#1E1E35] bg-[#0D0D1A] overflow-hidden">
      <div className="flex items-center gap-4 p-4">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-display font-bold text-sm shrink-0"
          style={{ backgroundColor: `${color}22`, border: `1px solid ${color}44`, color }}>
          {label.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-display font-semibold text-white">{label}</span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full uppercase tracking-wider ${enabled ? 'bg-green-500/10 text-green-400' : 'bg-[#1E1E35] text-[#5555AA]'}`}>
              {enabled ? 'Yoqilgan' : "O'chirilgan"}
            </span>
          </div>
          <p className="text-xs font-mono text-[#9494B8] truncate mt-0.5">{description}</p>
          {lastSync && <p className="text-[10px] font-mono text-[#5555AA] mt-0.5">So'nggi sync: {new Date(lastSync).toLocaleString('uz-UZ')}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={toggleEnable} disabled={!!loading}
            className={`relative w-10 h-5 rounded-full transition-colors ${enabled ? 'bg-[#FF6B35]' : 'bg-[#1E1E35]'}`}>
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${enabled ? 'left-5.5' : 'left-0.5'}`}
              style={{ left: enabled ? '22px' : '2px' }} />
          </button>
          <button onClick={() => setExpanded(!expanded)}
            className="text-[#5555AA] hover:text-[#9494B8] transition-colors">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              style={{ transform: expanded ? 'rotate(180deg)' : 'none' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-[#1E1E35] p-4 space-y-3">
          {fields.map(f => (
            <div key={f.key}>
              <label className="text-xs font-mono text-[#9494B8] block mb-1">{f.label}</label>
              <input
                type={f.secret ? 'password' : 'text'}
                placeholder={f.placeholder}
                value={config[f.key] || ''}
                onChange={e => setConfig(prev => ({ ...prev, [f.key]: e.target.value }))}
                className="w-full bg-[#111122] border border-[#1E1E35] rounded-lg px-3 py-2 text-sm font-mono text-white placeholder-[#333360] focus:outline-none focus:border-[#FF6B35]/50"
              />
            </div>
          ))}
          {message && (
            <p className={`text-xs font-mono ${message.ok ? 'text-green-400' : 'text-red-400'}`}>{message.text}</p>
          )}
          <div className="flex gap-2 pt-1">
            <button onClick={saveConfig} disabled={!!loading}
              className="px-3 py-1.5 bg-[#FF6B35] text-white text-xs font-display rounded-lg hover:bg-[#FF5522] disabled:opacity-50 transition-colors">
              {loading === 'save' ? 'Saqlanmoqda...' : 'Saqlash'}
            </button>
            <button onClick={testConn} disabled={!!loading}
              className="px-3 py-1.5 bg-[#161628] border border-[#1E1E35] text-[#9494B8] text-xs font-display rounded-lg hover:text-white disabled:opacity-50 transition-colors">
              {loading === 'test' ? 'Tekshirilmoqda...' : 'Test'}
            </button>
            {enabled && (
              <button onClick={syncNow} disabled={!!loading}
                className="px-3 py-1.5 bg-[#161628] border border-[#1E1E35] text-[#9494B8] text-xs font-display rounded-lg hover:text-white disabled:opacity-50 transition-colors">
                {loading === 'sync' ? 'Sinxronlanmoqda...' : 'Sync qilish'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
