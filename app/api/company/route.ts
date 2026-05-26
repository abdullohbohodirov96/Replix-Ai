import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const company = await prisma.company.findFirst()
  return NextResponse.json(company || {})
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if ((session?.user as { role?: string })?.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await req.json()
  const existing = await prisma.company.findFirst()
  if (existing) {
    const updated = await prisma.company.update({
      where: { id: existing.id },
      data: { name: body.name, description: body.description, industry: body.industry, aiContext: body.aiContext },
    })
    return NextResponse.json(updated)
  } else {
    const created = await prisma.company.create({
      data: { name: body.name || 'Mening kompaniyam', description: body.description, industry: body.industry, aiContext: body.aiContext },
    })
    return NextResponse.json(created)
  }
}
