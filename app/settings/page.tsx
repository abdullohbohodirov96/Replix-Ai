import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import SettingsClient from './SettingsClient'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)
  const sessionUser = session?.user as { role?: string } | undefined
  if (sessionUser?.role !== 'admin') redirect('/dashboard')

  const [callCategories, leadCategories] = await Promise.all([
    prisma.callCategory.findMany({
      include: { criteria: { orderBy: { order: 'asc' } } },
      orderBy: { order: 'asc' },
    }),
    prisma.leadCategory.findMany({
      include: { criteria: { orderBy: { order: 'asc' } } },
      orderBy: { order: 'asc' },
    }),
  ])

  return <SettingsClient callCategories={callCategories} leadCategories={leadCategories} />
}
