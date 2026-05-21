import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export const dynamic = 'force-dynamic'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 403 })
  }
  const { role } = await request.json()
  const user = await prisma.user.update({
    where: { id: params.id },
    data: { role },
    select: { id: true, name: true, email: true, role: true },
  })
  return NextResponse.json(user)
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const me = session?.user as { role?: string; email?: string } | undefined
  if (!session || me?.role !== 'admin') {
    return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 403 })
  }
  const target = await prisma.user.findUnique({ where: { id: params.id } })
  if (target?.email === me?.email) {
    return NextResponse.json({ error: 'O\'zingizni o\'chira olmaysiz' }, { status: 400 })
  }
  await prisma.user.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
