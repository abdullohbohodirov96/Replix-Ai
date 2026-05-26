import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

// Creates first admin if no users exist. GET /api/setup
export async function GET() {
  const count = await prisma.user.count()
  if (count > 0) {
    const admin = await prisma.user.findFirst({
      where: { role: 'admin' },
      select: { email: true, name: true },
    })
    return NextResponse.json({
      message: 'Admin allaqachon mavjud',
      hint: `Email: ${admin?.email || '?'} | Parolni qayta tiklash: POST /api/setup { "resetKey": "ADMIN_INITIAL_PASSWORD_qiymati" }`,
    })
  }

  const password = process.env.ADMIN_INITIAL_PASSWORD || 'admin123'
  const hashed = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: {
      name: 'Admin',
      email: process.env.ADMIN_INITIAL_EMAIL || 'admin@dunyabunya.uz',
      password: hashed,
      role: 'admin',
    },
    select: { id: true, name: true, email: true, role: true },
  })

  return NextResponse.json({ message: 'Admin yaratildi', user })
}

// Reset admin password: POST /api/setup { "resetKey": "current ADMIN_INITIAL_PASSWORD value" }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { resetKey } = body as { resetKey?: string }

    const expectedKey = process.env.ADMIN_INITIAL_PASSWORD
    if (!expectedKey || !resetKey || resetKey !== expectedKey) {
      return NextResponse.json({ error: 'Noto\'g\'ri kalit' }, { status: 401 })
    }

    const email = process.env.ADMIN_INITIAL_EMAIL || 'admin@dunyabunya.uz'
    const hashed = await bcrypt.hash(expectedKey, 10)

    const user = await prisma.user.upsert({
      where: { email },
      update: { password: hashed, role: 'admin' },
      create: { name: 'Admin', email, password: hashed, role: 'admin' },
      select: { id: true, name: true, email: true, role: true },
    })

    return NextResponse.json({ message: 'Parol yangilandi', user })
  } catch {
    return NextResponse.json({ error: 'Xatolik' }, { status: 500 })
  }
}
