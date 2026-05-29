import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import ProjectsClient from './ProjectsClient'

export const dynamic = 'force-dynamic'

export default async function ProjectsPage() {
  const session = await getServerSession(authOptions)
  const role = (session?.user as { role?: string })?.role
  if (role !== 'superadmin') redirect('/dashboard')

  const projects = await prisma.project.findMany({
    include: {
      _count: { select: { users: true, managers: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return <ProjectsClient projects={projects as any} />
}
