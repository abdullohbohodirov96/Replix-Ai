import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateDailyReport } from '@/lib/openai'
import { startOfDay, endOfDay } from 'date-fns'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const reports = await prisma.dailyReport.findMany({
      include: { manager: true },
      orderBy: { date: 'desc' },
      take: 50,
    })
    return NextResponse.json(reports)
  } catch (error) {
    return NextResponse.json({ error: 'Hisobotlarni olishda xatolik' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { managerId, date } = body
    
    const reportDate = date ? new Date(date) : new Date()
    const dayStart = startOfDay(reportDate)
    const dayEnd = endOfDay(reportDate)

    const manager = await prisma.manager.findUnique({
      where: { id: managerId },
    })

    if (!manager) {
      return NextResponse.json({ error: 'Manager topilmadi' }, { status: 404 })
    }

    // Get all calls for this manager on this date
    const calls = await prisma.call.findMany({
      where: {
        managerId,
        createdAt: { gte: dayStart, lte: dayEnd },
      },
    })

    const avgRating = calls.length > 0
      ? calls.reduce((s, c) => s + (c.rating || 0), 0) / calls.length
      : 0

    // Generate AI summary
    const callsForReport = calls.map(c => ({
      summary: c.summary || '',
      rating: c.rating || 0,
      problems: (() => { try { return JSON.parse(c.problems || '[]') } catch { return [] } })(),
      callOutcome: c.callOutcome || 'unknown',
    }))

    const aiReport = await generateDailyReport(manager.name, callsForReport)

    // Upsert daily report
    const report = await prisma.dailyReport.upsert({
      where: {
        managerId_date: {
          managerId,
          date: dayStart,
        },
      },
      update: {
        totalCalls: calls.length,
        avgRating,
        topProblems: JSON.stringify(aiReport.topProblems),
        summary: aiReport.summary,
        improvement: aiReport.improvement,
      },
      create: {
        managerId,
        date: dayStart,
        totalCalls: calls.length,
        avgRating,
        topProblems: JSON.stringify(aiReport.topProblems),
        summary: aiReport.summary,
        improvement: aiReport.improvement,
      },
    })

    return NextResponse.json(report)
  } catch (error: unknown) {
    console.error('Report generation error:', error)
    const message = error instanceof Error ? error.message : 'Hisobot yaratishda xatolik'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
