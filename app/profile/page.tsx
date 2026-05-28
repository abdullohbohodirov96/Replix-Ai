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
  const isSuperAdmin = sessionUser?.role === 'superadmin'
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

  // For superadmin: fetch all projects with per-project analytics
  let allProjects: any[] = []
  if (isSuperAdmin) {
    const [projects, callStats] = await Promise.all([
      prisma.project.findMany({
        include: {
          company: { select: { id: true, name: true, description: true } },
          _count: { select: { managers: true } },
          users: { where: { role: { in: ['admin'] } }, select: { id: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.$queryRaw<{ projectId: string; total: bigint; sales: bigint }[]>`
        SELECT m."projectId",
          COUNT(c.id) as total,
          SUM(CASE WHEN c."callOutcome" = 'sale' THEN 1 ELSE 0 END) as sales
        FROM "Call" c
        JOIN "Manager" m ON c."managerId" = m.id
        WHERE m."projectId" IS NOT NULL
        GROUP BY m."projectId"
      `,
    ])

    allProjects = projects.map(p => ({
      id: p.id,
      name: p.name,
      adminEmail: p.adminEmail,
      adminPass: p.adminPass,
      createdAt: p.createdAt.toISOString(),
      company: p.company,
      managerCount: p._count.managers,
      adminCount: p.users.length,
      totalCalls: Number(callStats.find((s: any) => s.projectId === p.id)?.total ?? 0),
      sales: Number(callStats.find((s: any) => s.projectId === p.id)?.sales ?? 0),
    }))
  }

  return (
    <ProfileClient
      user={user}
      company={company}
      callCategories={callCategories as any}
      leadCategories={leadCategories as any}
      managers={managers as any}
      integrations={integrations as any}
      isAdmin={isAdmin}
      isSuperAdmin={isSuperAdmin}
      managerCount={managerCount}
      allProjects={allProjects}
    />
  )
}
