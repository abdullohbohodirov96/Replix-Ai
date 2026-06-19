import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Kirish kerak' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const callType = searchParams.get('callType')

  const where = callType ? { callType } : {}

  const criteria = await prisma.analysisCriteria.findMany({
    where,
    orderBy: [{ callType: 'asc' }, { sortOrder: 'asc' }],
  })

  const leadCriteria = await prisma.leadScoringCriteria.findMany({
    where: { isActive: true },
  })

  return NextResponse.json({ criteria, leadCriteria })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as { role?: string })?.role !== 'admin') {
    return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 403 })
  }

  const body = await req.json()
  const { type, ...data } = body

  if (type === 'lead_scoring') {
    const { leadType, criteria, description } = data
    if (!leadType || !criteria) {
      return NextResponse.json({ error: 'leadType va criteria kerak' }, { status: 400 })
    }
    const record = await prisma.leadScoringCriteria.upsert({
      where: { id: data.id || 'new' },
      create: {
        leadType,
        criteria: JSON.stringify(Array.isArray(criteria) ? criteria : [criteria]),
        description,
      },
      update: {
        criteria: JSON.stringify(Array.isArray(criteria) ? criteria : [criteria]),
        description,
      },
    })
    return NextResponse.json({ ok: true, record })
  }

  const { name, callType, description, maxScore, weight, sortOrder } = data
  if (!name || !callType || !description) {
    return NextResponse.json({ error: 'name, callType, description kerak' }, { status: 400 })
  }

  const criterion = await prisma.analysisCriteria.create({
    data: {
      name,
      callType,
      description,
      maxScore: maxScore || 10,
      weight: weight || 1.0,
      sortOrder: sortOrder || 0,
    },
  })

  return NextResponse.json({ ok: true, criterion })
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as { role?: string })?.role !== 'admin') {
    return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 403 })
  }

  const body = await req.json()
  const { id, type, ...data } = body

  if (type === 'lead_scoring') {
    const record = await prisma.leadScoringCriteria.update({
      where: { id },
      data: {
        criteria: JSON.stringify(Array.isArray(data.criteria) ? data.criteria : [data.criteria]),
        description: data.description,
        isActive: data.isActive,
      },
    })
    return NextResponse.json({ ok: true, record })
  }

  const criterion = await prisma.analysisCriteria.update({
    where: { id },
    data: {
      name: data.name,
      description: data.description,
      maxScore: data.maxScore,
      weight: data.weight,
      sortOrder: data.sortOrder,
      isActive: data.isActive,
    },
  })

  return NextResponse.json({ ok: true, criterion })
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as { role?: string })?.role !== 'admin') {
    return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  const type = searchParams.get('type')

  if (!id) return NextResponse.json({ error: 'id kerak' }, { status: 400 })

  if (type === 'lead_scoring') {
    await prisma.leadScoringCriteria.delete({ where: { id } })
  } else {
    await prisma.analysisCriteria.delete({ where: { id } })
  }

  return NextResponse.json({ ok: true })
}
