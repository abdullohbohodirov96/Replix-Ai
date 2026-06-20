import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getAllLeads, SHEET_COLUMNS } from '@/lib/google-sheets'
import { getGoogleSheetsConfig } from '@/lib/integration-config'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Kirish kerak' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const source = searchParams.get('source')
  const status = searchParams.get('status')
  const leadScore = searchParams.get('leadScore')
  const fromSheets = searchParams.get('fromSheets') === 'true'

  if (fromSheets) {
    const sheetsConfig = await getGoogleSheetsConfig()
    if (!sheetsConfig) {
      return NextResponse.json({ error: 'Google Sheets sozlanmagan' }, { status: 400 })
    }
    const rows = await getAllLeads(sheetsConfig)
    const leads = rows.map((r) => ({
      rowIndex: r.rowIndex,
      name: r.data[SHEET_COLUMNS.NAME] || '',
      phone: r.data[SHEET_COLUMNS.PHONE] || '',
      source: r.data[SHEET_COLUMNS.SOURCE] || '',
      dateAdded: r.data[SHEET_COLUMNS.DATE_ADDED] || '',
      status: r.data[SHEET_COLUMNS.STATUS] || 'yangi',
      manager: r.data[SHEET_COLUMNS.MANAGER] || '',
      comment: r.data[SHEET_COLUMNS.COMMENT] || '',
      aiAnalysis: r.data[SHEET_COLUMNS.AI_ANALYSIS] || '',
      aiRating: r.data[SHEET_COLUMNS.AI_RATING] || '',
      leadScore: r.data[SHEET_COLUMNS.LEAD_SCORE] || '',
      callType: r.data[SHEET_COLUMNS.CALL_TYPE] || '',
      lastCall: r.data[SHEET_COLUMNS.LAST_CALL] || '',
    }))
    return NextResponse.json({ leads })
  }

  const where: Record<string, unknown> = {}
  if (source) where.source = source
  if (status) where.status = status
  if (leadScore) where.leadScore = leadScore

  const session_user = session.user as { role?: string; managerId?: string }
  if (session_user.role !== 'admin' && session_user.managerId) {
    where.managerId = session_user.managerId
  }

  const leads = await prisma.lead.findMany({
    where,
    include: {
      manager: { select: { id: true, name: true } },
      calls: {
        select: { id: true, rating: true, callDate: true, callType: true, summary: true },
        orderBy: { callDate: 'desc' },
        take: 3,
      },
    },
    orderBy: { updatedAt: 'desc' },
    take: 200,
  })

  return NextResponse.json({ leads })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Kirish kerak' }, { status: 401 })

  const body = await req.json()
  const { phone, name, source, managerId, comment, sheetRowIndex, sheetId } = body

  if (!phone) return NextResponse.json({ error: 'Telefon raqam kerak' }, { status: 400 })

  const lead = await prisma.lead.create({
    data: {
      phone,
      name,
      source: source || 'manual',
      managerId,
      comment,
      sheetRowIndex,
      sheetId,
    },
  })

  return NextResponse.json({ ok: true, lead })
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Kirish kerak' }, { status: 401 })

  const body = await req.json()
  const { id, ...data } = body

  if (!id) return NextResponse.json({ error: 'id kerak' }, { status: 400 })

  const lead = await prisma.lead.update({
    where: { id },
    data,
  })

  return NextResponse.json({ ok: true, lead })
}
