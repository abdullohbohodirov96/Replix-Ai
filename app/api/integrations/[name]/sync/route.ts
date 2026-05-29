import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendCallAnalysis } from '@/lib/integrations/telegram'
import { syncCallToAmo } from '@/lib/integrations/amocrm'
import { syncCallToBitrix } from '@/lib/integrations/bitrix24'
import { exportCallToSheets } from '@/lib/integrations/google-sheets'

export const dynamic = 'force-dynamic'

type CallRow = {
  id: string
  audioFileName: string
  rating: number | null
  summary: string | null
  analysis: string | null
  callOutcome: string | null
  problems: string | null
  positives: string | null
  clientSentiment: string | null
  createdAt: Date
  manager: { name: string }
}

async function syncTelegram(calls: CallRow[]): Promise<number> {
  let count = 0
  const recent = calls.slice(0, 5)
  for (const call of recent) {
    const ok = await sendCallAnalysis(call, call.manager.name)
    if (ok) count++
  }
  return count
}

async function syncAmoCRM(calls: CallRow[]): Promise<number> {
  let count = 0
  for (const call of calls) {
    const ok = await syncCallToAmo(call, call.manager.name)
    if (ok) count++
  }
  return count
}

async function syncBitrix(calls: CallRow[]): Promise<number> {
  let count = 0
  for (const call of calls) {
    const ok = await syncCallToBitrix(call, call.manager.name)
    if (ok) count++
  }
  return count
}

async function syncSheets(calls: CallRow[]): Promise<number> {
  let count = 0
  const recent = calls.slice(0, 10)
  for (const call of recent) {
    const ok = await exportCallToSheets(call, call.manager.name)
    if (ok) count++
  }
  return count
}

export async function POST(
  _request: NextRequest,
  { params }: { params: { name: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Tizimga kiring' }, { status: 401 })

    const sessionUser = session.user as { role?: string }
    if (sessionUser.role !== 'admin') {
      return NextResponse.json({ error: 'Admin huquqi kerak' }, { status: 403 })
    }

    const { name } = params
    const validNames = ['telegram', 'amocrm', 'bitrix24', 'google_sheets']
    if (!validNames.includes(name)) {
      return NextResponse.json({ error: 'Noto\'g\'ri integratsiya' }, { status: 400 })
    }

    const integration = await prisma.integration.findUnique({ where: { name } })
    if (!integration?.enabled) {
      return NextResponse.json({ error: `${name} integratsiyasi yoqilmagan` }, { status: 400 })
    }

    // Get last 24h calls for CRM syncs, last 10 for sheets
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const calls = await prisma.call.findMany({
      where: name === 'google_sheets' ? {} : { createdAt: { gte: since } },
      include: { manager: true },
      orderBy: { createdAt: 'desc' },
      take: name === 'google_sheets' ? 10 : 50,
    })

    const typedCalls: CallRow[] = calls.map(c => ({
      id: c.id,
      audioFileName: c.audioFileName,
      rating: c.rating,
      summary: c.summary,
      analysis: c.analysis,
      callOutcome: c.callOutcome,
      problems: c.problems,
      positives: c.positives,
      clientSentiment: c.clientSentiment,
      createdAt: c.createdAt,
      manager: { name: c.manager.name },
    }))

    let syncCount = 0

    if (name === 'telegram') syncCount = await syncTelegram(typedCalls)
    else if (name === 'amocrm') syncCount = await syncAmoCRM(typedCalls)
    else if (name === 'bitrix24') syncCount = await syncBitrix(typedCalls)
    else if (name === 'google_sheets') syncCount = await syncSheets(typedCalls)

    await prisma.integration.update({
      where: { name },
      data: { lastSync: new Date() },
    })

    return NextResponse.json({
      success: true,
      syncCount,
      message: `${syncCount} ta qo'ng'iroq sinxronlashtirildi`,
    })
  } catch (error) {
    console.error(`POST /api/integrations/${params?.name}/sync error:`, error)
    return NextResponse.json({ error: 'Sinxronizatsiya xatoligi' }, { status: 500 })
  }
}
