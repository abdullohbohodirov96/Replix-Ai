import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

// Creates the first admin account if no users exist yet.
export async function GET() {
  const count = await prisma.user.count()
  if (count > 0) {
    return NextResponse.json({ message: 'Foydalanuvchilar allaqachon mavjud' }, { status: 200 })
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
