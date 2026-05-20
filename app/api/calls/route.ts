import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const managerId = searchParams.get('managerId')
    const limit = parseInt(searchParams.get('limit') || '50')

    const calls = await prisma.call.findMany({
      where: managerId ? { managerId } : undefined,
      include: { manager: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return NextResponse.json(calls)
  } catch (error) {
    return NextResponse.json({ error: 'Qo\'ng\'iroqlarni olishda xatolik' }, { status: 500 })
  }
}
