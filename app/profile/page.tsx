import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import ProfileClient from './ProfileClient'

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const sessionUser = session.user as { role?: string; managerId?: string | null }
  const isAdmin = sessionUser.role === 'admin'

  const [user, company, managerCount] = await Promise.all([
    prisma.user.findFirst({
      where: { email: session.user?.email || '' },
      select: { id: true, name: true, email: true, role: true, managerId: true, createdAt: true },
    }),
    isAdmin ? prisma.company.findFirst() : Promise.resolve(null),
    isAdmin ? prisma.manager.count() : Promise.resolve(0),
  ])

  return (
    <ProfileClient
      user={user}
      company={company}
      isAdmin={isAdmin}
      managerCount={managerCount || 0}
    />
  )
}
