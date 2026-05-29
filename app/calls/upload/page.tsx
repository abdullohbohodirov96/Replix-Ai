import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import UploadPageClient from './UploadPageClient'

export const dynamic = 'force-dynamic'

export default async function UploadPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const sessionUser = session.user as { role?: string; projectId?: string | null }
  const isAdmin = sessionUser?.role === 'admin' || sessionUser?.role === 'superadmin'
  if (!isAdmin) redirect('/calls')

  const projectId = sessionUser?.projectId ?? null

  const managers = await prisma.manager.findMany({
    where: projectId ? { projectId } : undefined,
    select: { id: true, name: true, position: true },
    orderBy: { name: 'asc' },
  })

  return <UploadPageClient managers={managers} />
}
