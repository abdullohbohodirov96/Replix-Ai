import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const manager = await prisma.manager.findUnique({
      where: { id: params.id },
      include: {
        calls: { orderBy: { createdAt: 'desc' } },
        reports: { orderBy: { date: 'desc' }, take: 30 },
      },
    })

    if (!manager) {
      return NextResponse.json({ error: 'Manager topilmadi' }, { status: 404 })
    }

    return NextResponse.json(manager)
  } catch (error) {
    return NextResponse.json({ error: 'Xatolik yuz berdi' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { name, phone, email, position } = body

    const manager = await prisma.manager.update({
      where: { id: params.id },
      data: {
        ...(name && { name: name.trim() }),
        ...(phone !== undefined && { phone: phone?.trim() || null }),
        ...(email !== undefined && { email: email?.trim() || null }),
        ...(position && { position: position.trim() }),
      },
    })

    return NextResponse.json(manager)
  } catch (error) {
    return NextResponse.json({ error: 'Yangilashda xatolik' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.manager.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "O'chirishda xatolik" }, { status: 500 })
  }
}
