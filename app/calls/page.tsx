import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import UploadCallModal from '@/components/UploadCallModal'
import CallsListClient from './CallsListClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function CallsPage() {
  const session = await getServerSession(authOptions)
  const sessionUser = session?.user as { role?: string; managerId?: string | null } | undefined
  const isAdmin = sessionUser?.role === 'admin' || sessionUser?.role === 'superadmin'
  const filterManagerId = isAdmin ? null : sessionUser?.managerId

  const [calls, managers] = await Promise.all([
    prisma.call.findMany({
      where: {
        ...(filterManagerId ? { managerId: filterManagerId } : {}),
        archivedAt: null,
      },
      select: {
        id: true, audioFileName: true, duration: true, clientPhone: true,
        rating: true, score: true, callOutcome: true, status: true,
        leadQuality: true, createdAt: true, analyzedAt: true,
        manager: { select: { id: true, name: true } },
        category: { select: { id: true, name: true, color: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.manager.findMany({
      where: filterManagerId ? { id: filterManagerId } : undefined,
      orderBy: { name: 'asc' },
    }),
  ])

  return (
    <div className="max-w-7xl mx-auto space-y-5 animate-fade-up">
      <CallsListClient
        calls={calls as any}
        managers={managers as any}
        isAdmin={isAdmin}
        uploadModal={isAdmin ? <UploadCallModal managers={managers} /> : null}
      />
    </div>
  )
}
