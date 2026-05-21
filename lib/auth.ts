import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function getSession() {
  return getServerSession(authOptions)
}

export async function requireAdmin() {
  const session = await getSession()
  if (!session || session.user?.role !== 'admin') {
    return null
  }
  return session
}
