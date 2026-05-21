import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { unlink } from 'fs/promises'
import { existsSync } from 'fs'

export const dynamic = 'force-dynamic'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const call = await prisma.call.findUnique({ where: { id: params.id } })
    if (!call) {
      return NextResponse.json({ error: 'Qo\'ng\'iroq topilmadi' }, { status: 404 })
    }

    if (call.audioPath && existsSync(call.audioPath)) {
      await unlink(call.audioPath).catch(() => {})
    }

    await prisma.call.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'O\'chirishda xatolik' }, { status: 500 })
  }
}
