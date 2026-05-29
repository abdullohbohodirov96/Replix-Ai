// Telegram Bot API integration for construction store analytics

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ''
const DEFAULT_CHAT_ID = process.env.TELEGRAM_CHAT_ID || ''
const BASE_URL = `https://api.telegram.org/bot${BOT_TOKEN}`

export interface CallSummary {
  id: string
  audioFileName: string
  rating: number | null
  summary: string | null
  problems: string | null
  positives: string | null
  callOutcome: string | null
  clientSentiment: string | null
  createdAt: Date
}

export interface DailyReportData {
  date: Date
  totalCalls: number
  avgRating: number
  topProblems: string | null
  summary: string | null
  improvement: string | null
}

async function apiRequest(method: string, body: Record<string, unknown>): Promise<boolean> {
  try {
    if (!BOT_TOKEN) return false
    const res = await fetch(`${BASE_URL}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const err = await res.text()
      console.error(`Telegram API error [${method}]:`, err)
      return false
    }
    return true
  } catch (err) {
    console.error('Telegram request failed:', err)
    return false
  }
}

export async function sendMessage(chatId: string, text: string): Promise<boolean> {
  return apiRequest('sendMessage', {
    chat_id: chatId || DEFAULT_CHAT_ID,
    text,
    parse_mode: 'Markdown',
  })
}

export function formatCallMessage(call: CallSummary, managerName: string): string {
  const rating = call.rating ?? 0
  const stars = '⭐'.repeat(Math.round(rating)) + '☆'.repeat(5 - Math.round(rating))
  const outcomeEmoji: Record<string, string> = {
    sale: '✅',
    followup: '🔄',
    rejected: '❌',
    unknown: '❓',
  }
  const sentimentEmoji: Record<string, string> = {
    positive: '😊',
    negative: '😟',
    neutral: '😐',
  }

  let problems: string[] = []
  let positives: string[] = []
  try { problems = call.problems ? JSON.parse(call.problems) : [] } catch { /* ignore */ }
  try { positives = call.positives ? JSON.parse(call.positives) : [] } catch { /* ignore */ }

  const outcome = call.callOutcome || 'unknown'
  const sentiment = call.clientSentiment || 'neutral'
  const date = new Date(call.createdAt).toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' })

  let msg = `🏗 *Qurilish Dukoni — Qo'ng'iroq Tahlili*\n\n`
  msg += `👤 *Manager:* ${managerName}\n`
  msg += `📅 *Sana:* ${date}\n`
  msg += `📁 *Fayl:* \`${call.audioFileName}\`\n\n`
  msg += `${stars} *Baho:* ${rating.toFixed(1)}/5.0\n`
  msg += `${outcomeEmoji[outcome] || '❓'} *Natija:* ${outcome}\n`
  msg += `${sentimentEmoji[sentiment] || '😐'} *Mijoz kayfiyati:* ${sentiment}\n\n`

  if (call.summary) {
    msg += `📝 *Xulosa:*\n${call.summary}\n\n`
  }

  if (problems.length > 0) {
    msg += `⚠️ *Muammolar:*\n`
    problems.slice(0, 3).forEach(p => { msg += `• ${p}\n` })
    msg += '\n'
  }

  if (positives.length > 0) {
    msg += `✨ *Yaxshi tomonlar:*\n`
    positives.slice(0, 2).forEach(p => { msg += `• ${p}\n` })
    msg += '\n'
  }

  msg += `🔗 [To'liq tahlil ko'rish](${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/calls)`
  return msg
}

export async function sendCallAnalysis(call: CallSummary, managerName: string): Promise<boolean> {
  try {
    const text = formatCallMessage(call, managerName)
    return await sendMessage(DEFAULT_CHAT_ID, text)
  } catch (err) {
    console.error('sendCallAnalysis error:', err)
    return false
  }
}

export async function sendDailyReport(report: DailyReportData, managerName: string): Promise<boolean> {
  try {
    const date = new Date(report.date).toLocaleDateString('uz-UZ')
    const stars = '⭐'.repeat(Math.round(report.avgRating))
    let problems: string[] = []
    try { problems = report.topProblems ? JSON.parse(report.topProblems) : [] } catch { /* ignore */ }

    let msg = `📊 *Kunlik Hisobot — Qurilish Dukoni*\n\n`
    msg += `👤 *Manager:* ${managerName}\n`
    msg += `📅 *Sana:* ${date}\n\n`
    msg += `📞 *Jami qo'ng'iroqlar:* ${report.totalCalls}\n`
    msg += `${stars} *O'rtacha baho:* ${report.avgRating.toFixed(1)}/5.0\n\n`

    if (report.summary) {
      msg += `📝 *Xulosa:*\n${report.summary}\n\n`
    }

    if (problems.length > 0) {
      msg += `⚠️ *Asosiy muammolar:*\n`
      problems.forEach(p => { msg += `• ${p}\n` })
      msg += '\n'
    }

    if (report.improvement) {
      msg += `💡 *Tavsiya:*\n${report.improvement}`
    }

    return await sendMessage(DEFAULT_CHAT_ID, msg)
  } catch (err) {
    console.error('sendDailyReport error:', err)
    return false
  }
}

export async function sendAlert(type: string, data: Record<string, unknown>): Promise<boolean> {
  try {
    let msg = `🚨 *Ogohlantirish — Qurilish Dukoni*\n\n`

    if (type === 'low_rating') {
      const rating = data.rating as number
      const manager = data.managerName as string
      msg += `⚠️ Past baho qo'ng'iroq aniqlandi!\n\n`
      msg += `👤 Manager: ${manager}\n`
      msg += `⭐ Baho: ${rating?.toFixed(1)}/5.0\n`
      msg += `📁 Fayl: ${data.audioFileName || 'noma\'lum'}\n\n`
      msg += `Bu manager treningga muhtoj bo'lishi mumkin.`
    } else if (type === 'sync_error') {
      msg += `❌ Sinxronizatsiya xatoligi: ${data.integration}\n`
      msg += `Xato: ${data.error}`
    } else {
      msg += `ℹ️ ${type}: ${JSON.stringify(data)}`
    }

    return await sendMessage(DEFAULT_CHAT_ID, msg)
  } catch (err) {
    console.error('sendAlert error:', err)
    return false
  }
}

export async function testConnection(chatId?: string): Promise<{ success: boolean; message: string }> {
  try {
    const target = chatId || DEFAULT_CHAT_ID
    if (!BOT_TOKEN) return { success: false, message: 'TELEGRAM_BOT_TOKEN sozlanmagan' }
    if (!target) return { success: false, message: 'TELEGRAM_CHAT_ID sozlanmagan' }

    const ok = await sendMessage(target, '✅ Replix AI — Telegram ulanishi muvaffaqiyatli!')
    if (ok) return { success: true, message: 'Telegram ulanishi ishlaydi' }
    return { success: false, message: 'Xabar yuborib bo\'lmadi' }
  } catch (err) {
    return { success: false, message: `Xato: ${err instanceof Error ? err.message : 'Noma\'lum xato'}` }
  }
}
