import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  const sessionUser = session?.user as { role?: string; projectId?: string | null } | undefined
  const projectId = sessionUser?.projectId ?? null
  const isAdmin = sessionUser?.role === 'admin' || sessionUser?.role === 'superadmin'
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const managers = await prisma.manager.findMany({
      where: isAdmin && projectId ? { projectId } : undefined,
      include: {
        calls: {
          select: { rating: true, callOutcome: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(managers)
  } catch (error) {
    console.error('GET managers error:', error)
    return NextResponse.json({ error: 'Managerlarni olishda xatolik' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  const sessionUser = session?.user as { role?: string; projectId?: string | null } | undefined
  const role = sessionUser?.role
  const projectId = sessionUser?.projectId ?? null

  if (!session || !['admin', 'superadmin'].includes(role || ''))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (projectId) {
    const project = await prisma.project.findUnique({ where: { id: projectId }, select: { maxManagers: true } }).catch(() => null)
    if (project) {
      const count = await prisma.manager.count({ where: { projectId } })
      if (count >= project.maxManagers)
        return NextResponse.json({ error: `Manager limiti to'ldi. Maksimal: ${project.maxManagers}` }, { status: 400 })
    }
  }

  try {
    const body = await request.json()
    const { name, phone, email, position } = body
    if (!name?.trim()) return NextResponse.json({ error: 'Ism majburiy' }, { status: 400 })
    const manager = await prisma.manager.create({
      data: {
        name: name.trim(),
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        position: position?.trim() || 'Sales Manager',
        ...(projectId ? { projectId } : {}),
      },
    })
    return NextResponse.json(manager, { status: 201 })
  } catch (error) {
    console.error('POST manager error:', error)
    return NextResponse.json({ error: "Manager qo'shishda xatolik" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions)
  const role = (session?.user as { role?: string })?.role
  if (!session || !['admin', 'superadmin'].includes(role || ''))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  try {
    await prisma.manager.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('DELETE manager error:', error)
    return NextResponse.json({ error: "Manager o'chirishda xatolik" }, { status: 500 })
  }
}
