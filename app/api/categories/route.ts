import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const cats = await prisma.callCategory.findMany({
    include: { criteria: { orderBy: { order: 'asc' } } },
    orderBy: { order: 'asc' },
  })
  return NextResponse.json(cats)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if ((session?.user as { role?: string })?.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await req.json()
  const cat = await prisma.callCategory.create({
    data: { name: body.name, description: body.description, color: body.color || '#3b82f6', order: body.order || 0 },
  })
  return NextResponse.json(cat)
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if ((session?.user as { role?: string })?.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await req.json()
  const { id, ...data } = body
  const cat = await prisma.callCategory.update({ where: { id }, data })
  return NextResponse.json(cat)
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if ((session?.user as { role?: string })?.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')!
  await prisma.callCategory.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
