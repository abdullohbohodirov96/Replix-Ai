import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as { role?: string })?.role !== 'admin') {
    return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 403 })
  }

  const integrations = await prisma.integration.findMany()

  // API kalitlarini yashirish
  const safe = integrations.map((i) => {
    try {
      const config = JSON.parse(i.config)
      const masked: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(config)) {
        if (typeof v === 'string' && v.length > 10) {
          masked[k] = v.slice(0, 6) + '...' + v.slice(-4)
        } else {
          masked[k] = v
        }
      }
      return { ...i, config: masked, rawConfig: config }
    } catch {
      return { ...i, config: {}, rawConfig: {} }
    }
  })

  return NextResponse.json({ integrations: safe })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as { role?: string })?.role !== 'admin') {
    return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 403 })
  }

  const body = await req.json()
  const { type, config } = body

  if (!type || !config) {
    return NextResponse.json({ error: 'type va config kerak' }, { status: 400 })
  }

  const allowed = ['moizvonki', 'google_sheets', 'telegram']
  if (!allowed.includes(type)) {
    return NextResponse.json({ error: 'Noto\'g\'ri integration turi' }, { status: 400 })
  }

  const integration = await prisma.integration.upsert({
    where: { type },
    create: { type, config: JSON.stringify(config), isActive: true },
    update: { config: JSON.stringify(config), isActive: true },
  })

  return NextResponse.json({ ok: true, integration })
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as { role?: string })?.role !== 'admin') {
    return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 403 })
  }

  const body = await req.json()
  const { type, isActive } = body

  await prisma.integration.update({
    where: { type },
    data: { isActive },
  })

  return NextResponse.json({ ok: true })
}
