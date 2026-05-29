import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  if ((session?.user as { role?: string })?.role !== 'superadmin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const projects = await prisma.project.findMany({
    include: {
      _count: { select: { users: true, managers: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(projects.map(p => ({ ...p, adminPass: undefined })))
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if ((session?.user as { role?: string })?.role !== 'superadmin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await req.json()
  const hashedPass = body.adminPass ? await bcrypt.hash(body.adminPass, 10) : null
  const project = await prisma.project.create({
    data: { name: body.name, adminEmail: body.adminEmail, adminPass: hashedPass },
  })

  // Auto-create company for this project
  await prisma.company.create({
    data: { name: body.name, projectId: project.id },
  })

  if (body.adminEmail && body.adminPassword) {
    const hashedUserPass = await bcrypt.hash(body.adminPassword, 10)
    await prisma.user.create({
      data: {
        name: body.adminName || body.adminEmail,
        email: body.adminEmail,
        password: hashedUserPass,
        role: 'admin',
        projectId: project.id,
      },
    })
  }

  return NextResponse.json({ ...project, adminPass: undefined })
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if ((session?.user as { role?: string })?.role !== 'superadmin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await req.json()
  const { id, name } = body
  const project = await prisma.project.update({ where: { id }, data: { name } })
  return NextResponse.json({ ...project, adminPass: undefined })
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if ((session?.user as { role?: string })?.role !== 'superadmin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')!
  await prisma.project.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
