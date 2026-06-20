'use client'

import { useState, useEffect } from 'react'
import AppShell from '@/components/AppShell'
import { format } from 'date-fns'

interface Lead {
  id: string
  name?: string
  phone: string
  source?: string
  status: string
  leadScore?: string
  aiRating?: number
  aiAnalysis?: string
  callCount: number
  lastCallDate?: string
  manager?: { name: string }
  calls?: { rating?: number; callDate: string; callType?: string; summary?: string }[]
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  yangi: { label: 'Yangi', color: 'bg-blue-500/10 text-blue-400' },
  "bog'lanildi": { label: 'Bog\'lanildi', color: 'bg-yellow-500/10 text-yellow-400' },
  sotildi: { label: 'Sotildi', color: 'bg-green-500/10 text-green-400' },
  rad_etildi: { label: 'Rad etildi', color: 'bg-red-500/10 text-red-400' },
}

const LEAD_SCORE_LABELS: Record<string, { emoji: string; color: string }> = {
  hot: { emoji: '🔥', color: 'text-red-400' },
  warm: { emoji: '🌤️', color: 'text-yellow-400' },
  cold: { emoji: '❄️', color: 'text-blue-400' },
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({ status: '', leadScore: '' })
  const [selected, setSelected] = useState<Lead | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')

  const load = (params = filter) => {
    setLoading(true)
    const q = new URLSearchParams()
    if (params.status) q.set('status', params.status)
    if (params.leadScore) q.set('leadScore', params.leadScore)

    fetch(`/api/leads?${q}`)
      .then((r) => r.json())
      .then((data) => {
        setLeads(data.leads || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const syncFromSheets = async () => {
    setSyncing(true)
    setSyncMsg('')
    try {
      const res = await fetch('/api/leads?fromSheets=true')
      const data = await res.json()
      if (data.leads) {
        setSyncMsg(`✅ Sheets dan ${data.leads.length} ta lead topildi`)
      } else {
        setSyncMsg('❌ ' + (data.error || 'Xatolik'))
      }
    } catch {
      setSyncMsg('❌ Sheets bilan bog\'lanib bo\'lmadi')
    } finally {
      setSyncing(false)
      setTimeout(() => setSyncMsg(''), 4000)
    }
  }

  const stats = {
    total: leads.length,
    yangi: leads.filter((l) => l.status === 'yangi').length,
    hot: leads.filter((l) => l.leadScore === 'hot').length,
    warm: leads.filter((l) => l.leadScore === 'warm').length,
    cold: leads.filter((l) => l.leadScore === 'cold').length,
    sotildi: leads.filter((l) => l.status === 'sotildi').length,
  }

  return (
    <AppShell>
      <div>
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-syne)' }}>
              Leadlar
            </h1>
            <p className="text-gray-400 mt-1">Google Sheets va Moi Zvonki dan kelgan leadlar</p>
          </div>
          <button
            onClick={syncFromSheets}
            disabled={syncing}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium flex items-center gap-2"
          >
            {syncing ? '⟳ Yuklanmoqda...' : '📊 Sheets ko\'rish'}
          </button>
        </div>

        {syncMsg && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${syncMsg.startsWith('✅') ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
            {syncMsg}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {[
            { label: 'Jami', value: stats.total, color: 'text-white' },
            { label: 'Yangi', value: stats.yangi, color: 'text-blue-400' },
            { label: '🔥 Hot', value: stats.hot, color: 'text-red-400' },
            { label: '🌤️ Warm', value: stats.warm, color: 'text-yellow-400' },
            { label: '❄️ Cold', value: stats.cold, color: 'text-blue-300' },
            { label: '💰 Sotildi', value: stats.sotildi, color: 'text-green-400' },
          ].map((s) => (
            <div key={s.label} className="bg-[#1E1E35] rounded-xl p-4 border border-[#2A2A45] text-center">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <select
            value={filter.status}
            onChange={(e) => {
              const f = { ...filter, status: e.target.value }
              setFilter(f)
              load(f)
            }}
            className="bg-[#1E1E35] border border-[#2A2A45] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500"
          >
            <option value="">Barcha statuslar</option>
            <option value="yangi">Yangi</option>
            <option value="bog'lanildi">Bog'lanildi</option>
            <option value="sotildi">Sotildi</option>
            <option value="rad_etildi">Rad etildi</option>
          </select>

          <select
            value={filter.leadScore}
            onChange={(e) => {
              const f = { ...filter, leadScore: e.target.value }
              setFilter(f)
              load(f)
            }}
            className="bg-[#1E1E35] border border-[#2A2A45] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500"
          >
            <option value="">Barcha leadlar</option>
            <option value="hot">🔥 Hot</option>
            <option value="warm">🌤️ Warm</option>
            <option value="cold">❄️ Cold</option>
          </select>
        </div>

        {/* Table */}
        <div className="bg-[#1E1E35] rounded-xl border border-[#2A2A45] overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-400 text-sm">Yuklanmoqda...</div>
          ) : leads.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-400 text-sm">Leadlar yo'q</p>
              <p className="text-gray-500 text-xs mt-1">
                Moi Zvonki webhookni ulab, Google Sheets ni sozlang
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-[#2A2A45]">
                  <tr>
                    {['Ism', 'Telefon', 'Status', 'Lead turi', 'AI Baho', 'Qo\'ng\'iroqlar', 'Manager', 'Oxirgi'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs text-gray-500 font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => {
                    const scoreInfo = lead.leadScore ? LEAD_SCORE_LABELS[lead.leadScore] : null
                    const statusInfo = STATUS_LABELS[lead.status] || STATUS_LABELS.yangi
                    return (
                      <tr
                        key={lead.id}
                        onClick={() => setSelected(lead)}
                        className="border-b border-[#2A2A45]/50 hover:bg-[#2A2A45]/30 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3 text-sm text-white">
                          {lead.name || <span className="text-gray-500">—</span>}
                        </td>
                        <td className="px-4 py-3 text-sm font-mono text-gray-300">{lead.phone}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {scoreInfo ? (
                            <span className={`text-sm font-medium ${scoreInfo.color}`}>
                              {scoreInfo.emoji} {lead.leadScore?.toUpperCase()}
                            </span>
                          ) : (
                            <span className="text-gray-600 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {lead.aiRating ? (
                            <span className={lead.aiRating >= 7 ? 'text-green-400' : lead.aiRating >= 4 ? 'text-yellow-400' : 'text-red-400'}>
                              {lead.aiRating.toFixed(1)}/10
                            </span>
                          ) : (
                            <span className="text-gray-600">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-400">{lead.callCount}</td>
                        <td className="px-4 py-3 text-sm text-gray-400">
                          {lead.manager?.name || <span className="text-gray-600">—</span>}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {lead.lastCallDate
                            ? format(new Date(lead.lastCallDate), 'dd.MM HH:mm')
                            : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Lead Detail Modal */}
        {selected && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelected(null)}
          >
            <div
              className="bg-[#1E1E35] rounded-2xl border border-[#2A2A45] max-w-lg w-full p-6 max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-white font-semibold">{selected.name || selected.phone}</h2>
                  <p className="text-gray-400 text-sm font-mono">{selected.phone}</p>
                </div>
                <button onClick={() => setSelected(null)} className="text-gray-500 hover:text-white text-xl">
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-[#0D0D1A] rounded-lg p-3">
                  <p className="text-xs text-gray-500">Status</p>
                  <p className="text-sm text-white mt-1">
                    {STATUS_LABELS[selected.status]?.label || selected.status}
                  </p>
                </div>
                <div className="bg-[#0D0D1A] rounded-lg p-3">
                  <p className="text-xs text-gray-500">Lead turi</p>
                  <p className="text-sm mt-1">
                    {selected.leadScore
                      ? `${LEAD_SCORE_LABELS[selected.leadScore]?.emoji} ${selected.leadScore.toUpperCase()}`
                      : '—'}
                  </p>
                </div>
                <div className="bg-[#0D0D1A] rounded-lg p-3">
                  <p className="text-xs text-gray-500">AI Baho</p>
                  <p className={`text-sm font-bold mt-1 ${selected.aiRating && selected.aiRating >= 7 ? 'text-green-400' : selected.aiRating && selected.aiRating >= 4 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {selected.aiRating ? `${selected.aiRating.toFixed(1)}/10` : '—'}
                  </p>
                </div>
                <div className="bg-[#0D0D1A] rounded-lg p-3">
                  <p className="text-xs text-gray-500">Qo'ng'iroqlar</p>
                  <p className="text-sm text-white mt-1">{selected.callCount}</p>
                </div>
              </div>

              {selected.aiAnalysis && (
                <div className="bg-[#0D0D1A] rounded-lg p-4 mb-4">
                  <p className="text-xs text-gray-500 mb-2">AI Tahlili</p>
                  <p className="text-sm text-gray-300">{selected.aiAnalysis}</p>
                </div>
              )}

              {selected.calls && selected.calls.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-2">So'nggi qo'ng'iroqlar</p>
                  <div className="space-y-2">
                    {selected.calls.map((c, i) => (
                      <div key={i} className="bg-[#0D0D1A] rounded-lg p-3 flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-400">{c.callType || 'qo\'ng\'iroq'}</p>
                          <p className="text-xs text-gray-500">{format(new Date(c.callDate), 'dd.MM.yyyy HH:mm')}</p>
                        </div>
                        {c.rating && (
                          <span className={`text-sm font-bold ${c.rating >= 3.5 ? 'text-green-400' : c.rating >= 2.5 ? 'text-yellow-400' : 'text-red-400'}`}>
                            {(c.rating * 2).toFixed(1)}/10
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
