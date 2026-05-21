import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { adminReply, isRead } = body as { adminReply?: string; isRead?: boolean }

    const existing = await prisma.supportMessage.findUnique({ where: { id: params.id } })
    if (!existing) {
      return NextResponse.json({ error: 'Xabar topilmadi' }, { status: 404 })
    }

    const updated = await prisma.supportMessage.update({
      where: { id: params.id },
      data: {
        ...(adminReply !== undefined && { adminReply: adminReply.trim() }),
        ...(isRead !== undefined && { isRead }),
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('PATCH /api/support/[id] error:', error)
    return NextResponse.json({ error: 'Yangilashda xatolik' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.supportMessage.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/support/[id] error:', error)
    return NextResponse.json({ error: "O'chirishda xatolik" }, { status: 500 })
  }
}
