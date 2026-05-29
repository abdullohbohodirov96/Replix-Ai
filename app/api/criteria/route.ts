import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const categoryId = searchParams.get('categoryId')
  const criteria = await prisma.conversationCriteria.findMany({
    where: categoryId ? { categoryId } : undefined,
    orderBy: { order: 'asc' },
  })
  return NextResponse.json(criteria)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if ((session?.user as { role?: string })?.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await req.json()
  const c = await prisma.conversationCriteria.create({
    data: { name: body.name, description: body.description, categoryId: body.categoryId, weight: body.weight || 1.0, order: body.order || 0 },
  })
  return NextResponse.json(c)
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if ((session?.user as { role?: string })?.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await req.json()
  const { id, ...data } = body
  const c = await prisma.conversationCriteria.update({ where: { id }, data })
  return NextResponse.json(c)
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if ((session?.user as { role?: string })?.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')!
  await prisma.conversationCriteria.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
