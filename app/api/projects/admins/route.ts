import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if ((session?.user as { role?: string })?.role !== 'superadmin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 })
  const admins = await prisma.user.findMany({
    where: { projectId, role: 'admin' },
    select: { id: true, name: true, email: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(admins)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if ((session?.user as { role?: string })?.role !== 'superadmin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await req.json()
  const { projectId, name, email, password } = body
  if (!projectId || !email || !password)
    return NextResponse.json({ error: 'projectId, email va parol majburiy' }, { status: 400 })
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { maxAdmins: true } })
  if (project) {
    const adminCount = await prisma.user.count({ where: { projectId, role: 'admin' } })
    if (adminCount >= project.maxAdmins)
      return NextResponse.json({ error: `Admin limiti to'ldi. Maksimal: ${project.maxAdmins}` }, { status: 400 })
  }
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return NextResponse.json({ error: 'Bu email allaqachon mavjud' }, { status: 400 })
  const hashed = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: { name: name || email, email, password: hashed, role: 'admin', projectId },
    select: { id: true, name: true, email: true, createdAt: true },
  })
  return NextResponse.json(user, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if ((session?.user as { role?: string })?.role !== 'superadmin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  await prisma.user.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
