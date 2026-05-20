import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const managers = await prisma.manager.findMany({
      include: {
        calls: {
          select: { rating: true, callOutcome: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(managers)
  } catch (error) {
    console.error('GET managers error:', error)
    return NextResponse.json({ error: 'Managerlarni olishda xatolik' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, phone, email, position } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Ism majburiy' }, { status: 400 })
    }

    const manager = await prisma.manager.create({
      data: {
        name: name.trim(),
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        position: position?.trim() || 'Sales Manager',
      },
    })

    return NextResponse.json(manager, { status: 201 })
  } catch (error) {
    console.error('POST manager error:', error)
    return NextResponse.json({ error: 'Manager qo\'shishda xatolik' }, { status: 500 })
  }
}
