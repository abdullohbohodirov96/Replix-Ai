import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import CeoClient from './CeoClient'

export const dynamic = 'force-dynamic'

export default async function CeoPage() {
  const session = await getServerSession(authOptions)
  const role = (session?.user as { role?: string })?.role
  if (role !== 'superadmin') redirect('/dashboard')

  const today = new Date().toISOString().split('T')[0]

  const [projects, callStats, usageToday] = await Promise.all([
    prisma.project.findMany({
      include: {
        company: { select: { id: true, name: true, description: true } },
        users: {
          where: { role: 'admin' },
          select: { id: true, name: true, email: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        },
        managers: {
          select: { id: true, name: true, email: true, phone: true, position: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        },
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
    prisma.$queryRaw<{ projectId: string; minutes: number }[]>`
      SELECT "projectId", minutes FROM "AudioUsage" WHERE date = ${today}
    `.catch(() => [] as { projectId: string; minutes: number }[]),
  ])

  const allProjects = projects.map(p => {
    const stats = callStats.find((s: { projectId: string }) => s.projectId === p.id)
    const usage = usageToday.find((u: { projectId: string }) => u.projectId === p.id)
    return {
      id: p.id,
      name: p.name,
      adminEmail: p.adminEmail,
      createdAt: p.createdAt.toISOString(),
      company: p.company,
      admins: p.users.map((u: { id: string; name: string; email: string; createdAt: Date }) => ({
        ...u,
        createdAt: u.createdAt.toISOString(),
      })),
      managers: p.managers.map((m: { id: string; name: string; email: string | null; phone: string | null; position: string | null; createdAt: Date }) => ({
        ...m,
        createdAt: m.createdAt.toISOString(),
      })),
      totalCalls: Number(stats?.total ?? 0),
      sales: Number(stats?.sales ?? 0),
      maxManagers: p.maxManagers,
      maxAdmins: p.maxAdmins,
      dailyLimitMinutes: p.dailyLimitMinutes,
      features: (p.features ?? {}) as Record<string, boolean>,
      todayUsageMinutes: usage?.minutes ?? 0,
    }
  })

  return <CeoClient allProjects={allProjects} />
}
