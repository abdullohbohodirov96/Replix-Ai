import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 403 })
  }
  const users = await prisma.user.findMany({
    select: {
      id: true, name: true, email: true, role: true, createdAt: true,
      managerId: true,
      manager: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(users)
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 403 })
  }

  const { name, email, password, role, managerId } = await request.json()
  if (!name || !email || !password) {
    return NextResponse.json({ error: 'Barcha maydonlar to\'ldirilishi shart' }, { status: 400 })
  }

  const exists = await prisma.user.findUnique({ where: { email } })
  if (exists) {
    return NextResponse.json({ error: 'Bu email allaqachon ro\'yxatdan o\'tgan' }, { status: 400 })
  }

  const hashed = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: {
      name, email, password: hashed,
      role: role || 'user',
      managerId: managerId || null,
    },
    select: { id: true, name: true, email: true, role: true, createdAt: true, managerId: true },
  })
  return NextResponse.json(user)
}
