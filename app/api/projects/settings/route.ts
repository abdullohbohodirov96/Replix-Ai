import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if ((session?.user as { role?: string })?.role !== 'superadmin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await req.json()
  const { id, maxManagers, maxAdmins, dailyLimitMinutes, features } = body
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const project = await prisma.project.update({
    where: { id },
    data: {
      ...(maxManagers !== undefined && { maxManagers: Number(maxManagers) }),
      ...(maxAdmins !== undefined && { maxAdmins: Number(maxAdmins) }),
      ...(dailyLimitMinutes !== undefined && { dailyLimitMinutes: Number(dailyLimitMinutes) }),
      ...(features !== undefined && { features }),
    },
  })
  return NextResponse.json({ ...project, adminPass: undefined })
}
