'use client'

import { useState, useEffect } from 'react'
import AppShell from '@/components/AppShell'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface IntegrationData {
  type: string
  isActive: boolean
  rawConfig: Record<string, string>
}

const CALL_TYPES = [
  { value: 'sotuv', label: 'Sotuv qo\'ng\'irog\'i' },
  { value: 'qayta_qongiroq', label: 'Qayta qo\'ng\'iroq' },
  { value: 'kiruvchi', label: 'Kiruvchi qo\'ng\'iroq' },
  { value: 'chiquvchi', label: 'Chiquvchi qo\'ng\'iroq' },
]

export default function IntegrationsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [integrations, setIntegrations] = useState<IntegrationData[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'moizvonki' | 'sheets' | 'telegram'>('moizvonki')
  const [msg, setMsg] = useState('')

  // Moi Zvonki
  const [mzApiKey, setMzApiKey] = useState('')

  // Google Sheets
  const [sheetsId, setSheetsId] = useState('')
  const [sheetsName, setSheetsName] = useState('Sheet1')
  const [sheetsEmail, setSheetsEmail] = useState('')
  const [sheetsKey, setSheetsKey] = useState('')

  // Telegram
  const [tgToken, setTgToken] = useState('')
  const [tgChatId, setTgChatId] = useState('')

  useEffect(() => {
    if (status === 'loading') return
    if (!session || (session.user as { role?: string })?.role !== 'admin') {
      router.push('/dashboard')
    }
  }, [session, status, router])

  useEffect(() => {
    fetch('/api/integrations')
      .then((r) => r.json())
      .then((data) => {
        setIntegrations(data.integrations || [])
        const mz = data.integrations?.find((i: IntegrationData) => i.type === 'moizvonki')
        const gs = data.integrations?.find((i: IntegrationData) => i.type === 'google_sheets')
        const tg = data.integrations?.find((i: IntegrationData) => i.type === 'telegram')
        if (mz?.rawConfig) setMzApiKey(mz.rawConfig.apiKey || '')
        if (gs?.rawConfig) {
          setSheetsId(gs.rawConfig.spreadsheetId || '')
          setSheetsName(gs.rawConfig.sheetName || 'Sheet1')
          setSheetsEmail(gs.rawConfig.clientEmail || '')
        }
        if (tg?.rawConfig) {
          setTgToken(tg.rawConfig.botToken || '')
          setTgChatId(tg.rawConfig.adminChatId || '')
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const save = async (type: string, config: Record<string, string>) => {
    setSaving(true)
    setMsg('')
    try {
      const res = await fetch('/api/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, config }),
      })
      const data = await res.json()
      if (data.ok) setMsg('✅ Saqlandi!')
      else setMsg('❌ Xatolik: ' + data.error)
    } catch {
      setMsg('❌ Server bilan bog\'lanib bo\'lmadi')
    } finally {
      setSaving(false)
      setTimeout(() => setMsg(''), 3000)
    }
  }

  const sendDailyReport = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/telegram/daily-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      setMsg(data.ok ? '✅ Hisobot yuborildi!' : '❌ ' + data.error)
    } catch {
      setMsg('❌ Xatolik')
    } finally {
      setSaving(false)
      setTimeout(() => setMsg(''), 4000)
    }
  }

  const webhookUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/webhooks/moizvonki`
      : '/api/webhooks/moizvonki'

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-400">Yuklanmoqda...</div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-syne)' }}>
            Integratsiyalar
          </h1>
          <p className="text-gray-400 mt-1">Moi Zvonki, Google Sheets va Telegram ulanish sozlamalari</p>
        </div>

        {msg && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${msg.startsWith('✅') ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
            {msg}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {([
            { key: 'moizvonki', label: '📞 Moi Zvonki' },
            { key: 'sheets', label: '📊 Google Sheets' },
            { key: 'telegram', label: '✈️ Telegram' },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-orange-500 text-white'
                  : 'bg-[#1E1E35] text-gray-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Moi Zvonki */}
        {activeTab === 'moizvonki' && (
          <div className="bg-[#1E1E35] rounded-xl p-6 border border-[#2A2A45]">
            <h2 className="text-lg font-semibold text-white mb-1">Moi Zvonki</h2>
            <p className="text-sm text-gray-400 mb-6">
              Qo'ng'iroqlar avtomatik tahlil qilinadi
            </p>

            <div className="mb-4">
              <label className="text-sm text-gray-400 block mb-1">API Kalit</label>
              <input
                type="password"
                value={mzApiKey}
                onChange={(e) => setMzApiKey(e.target.value)}
                placeholder="Moi Zvonki API kalitingiz"
                className="w-full bg-[#0D0D1A] border border-[#2A2A45] rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                moizvonki.ru → Nastroyki → API → API kalit
              </p>
            </div>

            <div className="mb-6 p-4 bg-[#0D0D1A] rounded-lg border border-[#2A2A45]">
              <p className="text-xs text-gray-400 mb-2 font-medium">📌 Webhook URL (Moi Zvonki ga qo'ying):</p>
              <code className="text-orange-400 text-xs break-all">{webhookUrl}</code>
              <p className="text-xs text-gray-500 mt-2">
                moizvonki.ru → Nastroyki → Integracii → Webhook → bu URLni kiriting
              </p>
            </div>

            <button
              onClick={() => save('moizvonki', { apiKey: mzApiKey })}
              disabled={saving || !mzApiKey}
              className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {saving ? 'Saqlanmoqda...' : 'Saqlash'}
            </button>
          </div>
        )}

        {/* Google Sheets */}
        {activeTab === 'sheets' && (
          <div className="bg-[#1E1E35] rounded-xl p-6 border border-[#2A2A45]">
            <h2 className="text-lg font-semibold text-white mb-1">Google Sheets</h2>
            <p className="text-sm text-gray-400 mb-6">
              Leadlar shu Sheets bilan sinxronlanadi
            </p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="text-sm text-gray-400 block mb-1">Spreadsheet ID</label>
                <input
                  value={sheetsId}
                  onChange={(e) => setSheetsId(e.target.value)}
                  placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
                  className="w-full bg-[#0D0D1A] border border-[#2A2A45] rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  URL dan: sheets.google.com/spreadsheets/d/<span className="text-orange-400">ID</span>/edit
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">Sheet nomi (varaq)</label>
                <input
                  value={sheetsName}
                  onChange={(e) => setSheetsName(e.target.value)}
                  placeholder="Sheet1"
                  className="w-full bg-[#0D0D1A] border border-[#2A2A45] rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">Service Account Email</label>
                <input
                  value={sheetsEmail}
                  onChange={(e) => setSheetsEmail(e.target.value)}
                  placeholder="replix@project.iam.gserviceaccount.com"
                  className="w-full bg-[#0D0D1A] border border-[#2A2A45] rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">Private Key (JSON dan)</label>
                <textarea
                  value={sheetsKey}
                  onChange={(e) => setSheetsKey(e.target.value)}
                  placeholder="-----BEGIN PRIVATE KEY-----\n..."
                  rows={4}
                  className="w-full bg-[#0D0D1A] border border-[#2A2A45] rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500 font-mono resize-none"
                />
              </div>
            </div>

            <div className="mb-6 p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <p className="text-xs text-blue-400 font-medium mb-2">📋 Sheets ustunlari tartibi:</p>
              <div className="grid grid-cols-3 gap-1 text-xs text-gray-400">
                {['A: Ism', 'B: Telefon', 'C: Manba', 'D: Sana', 'E: Status', 'F: Manager', 'G: Izoh', 'H: AI Tahlil', 'I: AI Baho', 'J: Lead turi', 'K: Qo\'ng\'iroq turi', 'L: Oxirgi qo\'ng\'iroq'].map((col) => (
                  <span key={col} className="bg-[#0D0D1A] px-2 py-1 rounded">{col}</span>
                ))}
              </div>
            </div>

            <button
              onClick={() =>
                save('google_sheets', {
                  spreadsheetId: sheetsId,
                  sheetName: sheetsName,
                  clientEmail: sheetsEmail,
                  privateKey: sheetsKey,
                })
              }
              disabled={saving || !sheetsId || !sheetsEmail}
              className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {saving ? 'Saqlanmoqda...' : 'Saqlash'}
            </button>
          </div>
        )}

        {/* Telegram */}
        {activeTab === 'telegram' && (
          <div className="bg-[#1E1E35] rounded-xl p-6 border border-[#2A2A45]">
            <h2 className="text-lg font-semibold text-white mb-1">Telegram Bot</h2>
            <p className="text-sm text-gray-400 mb-6">
              Har bir tahlil va kunlik hisobot Telegramga yuboriladi
            </p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="text-sm text-gray-400 block mb-1">Bot Token</label>
                <input
                  type="password"
                  value={tgToken}
                  onChange={(e) => setTgToken(e.target.value)}
                  placeholder="1234567890:AAF..."
                  className="w-full bg-[#0D0D1A] border border-[#2A2A45] rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500"
                />
                <p className="text-xs text-gray-500 mt-1">@BotFather dan olingan token</p>
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">Admin Chat ID</label>
                <input
                  value={tgChatId}
                  onChange={(e) => setTgChatId(e.target.value)}
                  placeholder="-1001234567890 yoki 123456789"
                  className="w-full bg-[#0D0D1A] border border-[#2A2A45] rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  @userinfobot ga /start yuboring yoki guruh ID ni kiriting
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() =>
                  save('telegram', { botToken: tgToken, adminChatId: tgChatId })
                }
                disabled={saving || !tgToken || !tgChatId}
                className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {saving ? 'Saqlanmoqda...' : 'Saqlash'}
              </button>
              <button
                onClick={sendDailyReport}
                disabled={saving}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
              >
                📊 Hisobot yuborish
              </button>
            </div>
          </div>
        )}

        {/* Integratsiya holati */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          {[
            { type: 'moizvonki', label: 'Moi Zvonki', icon: '📞' },
            { type: 'google_sheets', label: 'Google Sheets', icon: '📊' },
            { type: 'telegram', label: 'Telegram', icon: '✈️' },
          ].map((item) => {
            const integration = integrations.find((i) => i.type === item.type)
            return (
              <div
                key={item.type}
                className="bg-[#1E1E35] rounded-lg p-4 border border-[#2A2A45] text-center"
              >
                <div className="text-2xl mb-1">{item.icon}</div>
                <p className="text-sm text-white font-medium">{item.label}</p>
                <div
                  className={`mt-2 text-xs px-2 py-0.5 rounded-full inline-block ${
                    integration?.isActive
                      ? 'bg-green-500/10 text-green-400'
                      : 'bg-gray-500/10 text-gray-500'
                  }`}
                >
                  {integration?.isActive ? 'Ulangan' : 'Sozlanmagan'}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </AppShell>
  )
}
