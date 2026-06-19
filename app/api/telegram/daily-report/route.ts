import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getTelegramConfig } from '@/lib/integration-config'
import { sendTelegramMessage, formatDailyReportMessage } from '@/lib/telegram'
import { generateManagerWorkloadRecommendation } from '@/lib/openai'
import { getSheetsStats } from '@/lib/google-sheets'
import { getGoogleSheetsConfig } from '@/lib/integration-config'
import { format, startOfDay, endOfDay } from 'date-fns'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as { role?: string })?.role !== 'admin') {
    return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const date = body.date ? new Date(body.date) : new Date()
  const dayStart = startOfDay(date)
  const dayEnd = endOfDay(date)

  const tgConfig = await getTelegramConfig()
  if (!tgConfig) {
    return NextResponse.json({ error: 'Telegram sozlanmagan' }, { status: 400 })
  }

  // Bugungi qo'ng'iroqlar
  const calls = await prisma.call.findMany({
    where: { createdAt: { gte: dayStart, lte: dayEnd } },
    include: { manager: { select: { id: true, name: true } } },
  })

  // Manager statistikasi
  const managerMap = new Map<string, { name: string; callCount: number; totalRating: number; contactedLeads: number }>()
  for (const call of calls) {
    const existing = managerMap.get(call.managerId) || {
      name: call.manager.name,
      callCount: 0,
      totalRating: 0,
      contactedLeads: 0,
    }
    existing.callCount++
    existing.totalRating += call.rating || 0
    managerMap.set(call.managerId, existing)
  }

  const managerStats = Array.from(managerMap.values()).map((m) => ({
    ...m,
    avgRating: m.callCount > 0 ? (m.totalRating / m.callCount) * 2 : 0,
    contactedLeads: m.callCount,
  }))

  const totalCalls = calls.length
  const avgRating = totalCalls > 0
    ? (calls.reduce((s, c) => s + (c.rating || 0), 0) / totalCalls) * 2
    : 0

  // Sheets statistikasi
  let sheetsStats = { total: 0, contacted: 0, hot: 0, warm: 0, cold: 0, sold: 0 }
  const sheetsConfig = await getGoogleSheetsConfig()
  if (sheetsConfig) {
    try {
      sheetsStats = await getSheetsStats(sheetsConfig)
    } catch (e) {
      console.error('Sheets stats error:', e)
    }
  }

  // DB leadlari
  const dbLeads = await prisma.lead.findMany({
    where: { createdAt: { gte: dayStart, lte: dayEnd } },
  })
  const contactedToday = await prisma.lead.count({
    where: { lastCallDate: { gte: dayStart, lte: dayEnd } },
  })
  const uncontacted = await prisma.lead.count({ where: { status: 'yangi' } })

  // AI tavsiya
  const aiRecommendation = await generateManagerWorkloadRecommendation({
    managerCount: managerMap.size || 1,
    totalLeadsToday: sheetsStats.total || dbLeads.length,
    contactedLeadsToday: contactedToday,
    totalCallsToday: totalCalls,
    avgCallsPerManager: totalCalls / Math.max(managerMap.size, 1),
    avgRating,
    uncontactedLeads: uncontacted,
  })

  const msg = formatDailyReportMessage({
    date: format(date, 'dd.MM.yyyy'),
    totalLeads: sheetsStats.total || dbLeads.length,
    contactedLeads: contactedToday,
    analyzedCalls: totalCalls,
    avgRating,
    hotLeads: sheetsStats.hot,
    warmLeads: sheetsStats.warm,
    coldLeads: sheetsStats.cold,
    soldCount: sheetsStats.sold,
    managerStats,
    aiRecommendation,
  })

  await sendTelegramMessage(tgConfig, msg)

  await prisma.telegramReport.create({
    data: {
      type: 'daily',
      chatId: tgConfig.adminChatId,
      message: msg,
      metadata: JSON.stringify({ date: date.toISOString(), totalCalls, totalLeads: dbLeads.length }),
    },
  })

  return NextResponse.json({ ok: true, message: 'Hisobot yuborildi' })
}

// Webhook uchun - cron job yoki tashqi trigger
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const secret = searchParams.get('secret')

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 403 })
  }

  // Avtomatik kunlik hisobot
  const tgConfig = await getTelegramConfig()
  if (!tgConfig) return NextResponse.json({ error: 'Telegram sozlanmagan' })

  const date = new Date()
  const dayStart = startOfDay(date)
  const dayEnd = endOfDay(date)

  const calls = await prisma.call.findMany({
    where: { createdAt: { gte: dayStart, lte: dayEnd } },
    include: { manager: { select: { id: true, name: true } } },
  })

  const totalCalls = calls.length
  const avgRating = totalCalls > 0
    ? (calls.reduce((s, c) => s + (c.rating || 0), 0) / totalCalls) * 2
    : 0
  const uncontacted = await prisma.lead.count({ where: { status: 'yangi' } })
  const contactedToday = await prisma.lead.count({
    where: { lastCallDate: { gte: dayStart, lte: dayEnd } },
  })

  const aiRecommendation = await generateManagerWorkloadRecommendation({
    managerCount: new Set(calls.map((c) => c.managerId)).size || 1,
    totalLeadsToday: 0,
    contactedLeadsToday: contactedToday,
    totalCallsToday: totalCalls,
    avgCallsPerManager: totalCalls,
    avgRating,
    uncontactedLeads: uncontacted,
  })

  const msg = formatDailyReportMessage({
    date: format(date, 'dd.MM.yyyy'),
    totalLeads: 0,
    contactedLeads: contactedToday,
    analyzedCalls: totalCalls,
    avgRating,
    hotLeads: 0,
    warmLeads: 0,
    coldLeads: 0,
    soldCount: 0,
    managerStats: [],
    aiRecommendation,
  })

  await sendTelegramMessage(tgConfig, msg)

  return NextResponse.json({ ok: true })
}
