import { getServerSession } from 'next-auth'
import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email:    { label: 'Email',    type: 'email' },
        password: { label: 'Parol',   type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        const user = await prisma.user.findUnique({ where: { email: credentials.email } })
        if (!user) return null
        const valid = await bcrypt.compare(credentials.password, user.password)
        if (!valid) return null
        return { id: user.id, name: user.name, email: user.email, role: user.role, managerId: user.managerId ?? null }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        const u = user as unknown as { role: string; managerId?: string | null }
        token.role = u.role
        token.managerId = u.managerId ?? null
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        const u = session.user as { role?: string; managerId?: string | null; id?: string }
        u.role = token.role as string
        u.managerId = token.managerId as string | null
        u.id = token.sub  // user id from JWT sub
      }
      return session
    },
  },
  pages: { signIn: '/' },
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET,
}

export async function getSession() {
  return getServerSession(authOptions)
}

export async function requireAdmin() {
  const session = await getSession()
  if (!session || (session.user as { role?: string })?.role !== 'admin') {
    return null
  }
  return session
}
