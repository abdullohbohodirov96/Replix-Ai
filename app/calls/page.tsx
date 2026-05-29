import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import UploadCallModal from '@/components/UploadCallModal'
import CallsListClient from './CallsListClient'
import Link from 'next/link'

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
        uploadModal={isAdmin ? (
          <Link
            href="/calls/upload"
            className="flex items-center gap-2 px-4 py-2.5 bg-[#FF6B35] hover:bg-[#FF5520] text-white text-sm font-display font-600 rounded-lg transition-colors shadow-lg shadow-orange-500/20"
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Audio Yuklash
          </Link>
        ) : null}
      />
    </div>
  )
}
