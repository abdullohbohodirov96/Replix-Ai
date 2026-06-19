import { Telegraf } from 'telegraf'

export interface TelegramConfig {
  botToken: string
  adminChatId: string
}

let botInstance: Telegraf | null = null

export function getBot(token: string): Telegraf {
  if (!botInstance) {
    botInstance = new Telegraf(token)
  }
  return botInstance
}

export async function sendTelegramMessage(config: TelegramConfig, message: string) {
  const bot = getBot(config.botToken)
  await bot.telegram.sendMessage(config.adminChatId, message, {
    parse_mode: 'HTML',
  })
}

export function formatCallAnalysisMessage(data: {
  managerName: string
  clientPhone: string
  callType: string
  duration: number
  rating: number
  leadScore?: string
  summary: string
  problems: string[]
  positives: string[]
  aiAnalysis: string
  sheetUpdated: boolean
}): string {
  const ratingEmoji = data.rating >= 8 ? '🟢' : data.rating >= 5 ? '🟡' : '🔴'
  const leadEmoji =
    data.leadScore === 'hot' ? '🔥' : data.leadScore === 'warm' ? '🌤️' : '❄️'
  const callTypeLabel: Record<string, string> = {
    sotuv: 'Sotuv qo\'ng\'irog\'i',
    qayta_qongiroq: 'Qayta qo\'ng\'iroq',
    kiruvchi: 'Kiruvchi',
    chiquvchi: 'Chiquvchi',
  }

  const minutes = Math.floor(data.duration / 60)
  const seconds = data.duration % 60

  let msg = `📞 <b>Yangi qo'ng'iroq tahlili</b>\n\n`
  msg += `👤 Manager: <b>${data.managerName}</b>\n`
  msg += `📱 Mijoz: <code>${data.clientPhone}</code>\n`
  msg += `🎯 Tur: ${callTypeLabel[data.callType] || data.callType}\n`
  msg += `⏱️ Davomiyligi: ${minutes}:${String(seconds).padStart(2, '0')}\n`
  msg += `${ratingEmoji} Baho: <b>${data.rating}/10</b>\n`
  if (data.leadScore) {
    msg += `${leadEmoji} Lead turi: <b>${data.leadScore.toUpperCase()}</b>\n`
  }
  msg += `\n📝 <b>Qisqacha:</b>\n${data.summary}\n`

  if (data.problems.length > 0) {
    msg += `\n❌ <b>Muammolar:</b>\n`
    data.problems.slice(0, 3).forEach((p) => {
      msg += `• ${p}\n`
    })
  }

  if (data.positives.length > 0) {
    msg += `\n✅ <b>Yaxshi tomonlar:</b>\n`
    data.positives.slice(0, 2).forEach((p) => {
      msg += `• ${p}\n`
    })
  }

  if (data.sheetUpdated) {
    msg += `\n✅ <i>Google Sheets yangilandi</i>`
  }

  return msg
}

export function formatDailyReportMessage(data: {
  date: string
  totalLeads: number
  contactedLeads: number
  analyzedCalls: number
  avgRating: number
  hotLeads: number
  warmLeads: number
  coldLeads: number
  soldCount: number
  managerStats: {
    name: string
    callCount: number
    avgRating: number
    contactedLeads: number
  }[]
  aiRecommendation: string
}): string {
  let msg = `📊 <b>Kunlik Hisobot — ${data.date}</b>\n\n`
  msg += `━━━━━━━━━━━━━━━━━━━━\n`
  msg += `📋 Sheets ga tushgan leadlar: <b>${data.totalLeads}</b>\n`
  msg += `📞 Bog'lanilgan leadlar: <b>${data.contactedLeads}</b>\n`
  msg += `🎙️ Tahlil qilingan qo'ng'iroqlar: <b>${data.analyzedCalls}</b>\n`
  msg += `⭐ O'rtacha baho: <b>${data.avgRating.toFixed(1)}/10</b>\n`
  msg += `━━━━━━━━━━━━━━━━━━━━\n`
  msg += `🔥 Hot leadlar: <b>${data.hotLeads}</b>\n`
  msg += `🌤️ Warm leadlar: <b>${data.warmLeads}</b>\n`
  msg += `❄️ Cold leadlar: <b>${data.coldLeads}</b>\n`
  msg += `💰 Sotuvlar: <b>${data.soldCount}</b>\n`
  msg += `━━━━━━━━━━━━━━━━━━━━\n`

  if (data.managerStats.length > 0) {
    msg += `\n👥 <b>Managerlar:</b>\n`
    data.managerStats.forEach((m) => {
      const emoji = m.avgRating >= 7 ? '🟢' : m.avgRating >= 5 ? '🟡' : '🔴'
      msg += `${emoji} ${m.name}: ${m.callCount} qo'ng'iroq, baho: ${m.avgRating.toFixed(1)}\n`
    })
    msg += `━━━━━━━━━━━━━━━━━━━━\n`
  }

  msg += `\n🤖 <b>AI Tavsiya:</b>\n${data.aiRecommendation}`

  return msg
}
