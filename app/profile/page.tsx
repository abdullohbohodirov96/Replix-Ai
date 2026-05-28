import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import ProfileClient from './ProfileClient'

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const userEmail = session.user?.email!
  const sessionUser = session.user as { role?: string; projectId?: string | null }
  const isAdmin = sessionUser?.role === 'admin' || sessionUser?.role === 'superadmin'
  const projectId = sessionUser?.projectId ?? null
  const projectFilter = projectId ? { projectId } : {}

  const [user, company, callCategories, leadCategories, managers, integrations, managerCount] = await Promise.all([
    prisma.user.findUnique({
      where: { email: userEmail },
      select: { id: true, name: true, email: true, role: true, managerId: true, createdAt: true },
    }),
    isAdmin ? prisma.company.findFirst({ where: { projectId: projectId ?? undefined } }) : Promise.resolve(null),
    isAdmin
      ? prisma.callCategory.findMany({
          where: { projectId: projectId ?? undefined },
          include: { criteria: { orderBy: { order: 'asc' } } },
          orderBy: { order: 'asc' },
        })
      : Promise.resolve([]),
    isAdmin
      ? prisma.leadCategory.findMany({
          where: { projectId: projectId ?? undefined },
          include: { criteria: { orderBy: { order: 'asc' } } },
          orderBy: { order: 'asc' },
        })
      : Promise.resolve([]),
    isAdmin
      ? prisma.manager.findMany({
          where: projectFilter,
          select: { id: true, name: true, email: true, phone: true, position: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        })
      : Promise.resolve([]),
    isAdmin ? prisma.integration.findMany({ orderBy: { name: 'asc' } }) : Promise.resolve([]),
    isAdmin ? prisma.manager.count({ where: projectFilter }) : Promise.resolve(0),
  ])

  return (
    <ProfileClient
      user={user}
      company={company}
      callCategories={callCategories as any}
      leadCategories={leadCategories as any}
      managers={managers as any}
      integrations={integrations as any}
      isAdmin={isAdmin}
      managerCount={managerCount}
    />
  )
}
