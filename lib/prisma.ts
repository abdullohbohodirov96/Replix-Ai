import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL || ''
  // Supabase transaction pooler (port 6543) requires pgbouncer=true to disable prepared statements
  if (url.includes(':6543') && !url.includes('pgbouncer=true')) {
    return url.includes('?') ? `${url}&pgbouncer=true` : `${url}?pgbouncer=true`
  }
  return url
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: getDatabaseUrl(),
      },
    },
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
