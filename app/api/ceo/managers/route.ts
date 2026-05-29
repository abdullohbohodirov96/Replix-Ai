import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if ((session?.user as { role?: string })?.role !== 'superadmin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { projectId, name, email, phone, position } = body

  if (!projectId) return NextResponse.json({ error: 'projectId majburiy' }, { status: 400 })
  if (!name?.trim()) return NextResponse.json({ error: 'Ism majburiy' }, { status: 400 })

  // Check maxManagers limit
  const project = await prisma.project
    .findUnique({
      where: { id: projectId },
      select: { maxManagers: true },
    })
    .catch(() => null)

  if (project) {
    const count = await prisma.manager.count({ where: { projectId } })
    if (count >= project.maxManagers)
      return NextResponse.json(
        { error: `Manager limiti to'ldi. Maksimal: ${project.maxManagers}` },
        { status: 400 }
      )
  }

  const manager = await prisma.manager.create({
    data: {
      name: name.trim(),
      email: email?.trim() || null,
      phone: phone?.trim() || null,
      position: position?.trim() || 'Sales Manager',
      projectId,
    },
  })

  return NextResponse.json(manager, { status: 201 })
}
