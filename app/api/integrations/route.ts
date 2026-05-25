import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const SENSITIVE_KEYS = [
  'access_token', 'refresh_token', 'client_secret', 'private_key',
  'password', 'secret', 'token', 'api_key',
]

function maskConfig(config: unknown): unknown {
  if (!config || typeof config !== 'object') return config
  const masked: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(config as Record<string, unknown>)) {
    const isSensitive = SENSITIVE_KEYS.some(k => key.toLowerCase().includes(k))
    if (isSensitive && typeof val === 'string' && val.length > 4) {
      masked[key] = `${val.slice(0, 4)}${'*'.repeat(Math.min(val.length - 4, 20))}`
    } else {
      masked[key] = val
    }
  }
  return masked
}

const INTEGRATION_NAMES = ['telegram', 'amocrm', 'bitrix24', 'google_sheets', 'instagram']

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Tizimga kiring' }, { status: 401 })

    const sessionUser = session.user as { role?: string }
    if (sessionUser.role !== 'admin') {
      return NextResponse.json({ error: 'Admin huquqi kerak' }, { status: 403 })
    }

    const stored = await prisma.integration.findMany()
    const storedMap: Record<string, typeof stored[0]> = {}
    for (const item of stored) storedMap[item.name] = item

    const integrations = INTEGRATION_NAMES.map(name => {
      const item = storedMap[name]
      return {
        name,
        enabled: item?.enabled ?? false,
        lastSync: item?.lastSync ?? null,
        config: item?.config ? maskConfig(item.config) : null,
        createdAt: item?.createdAt ?? null,
      }
    })

    return NextResponse.json({ integrations })
  } catch (error) {
    console.error('GET /api/integrations error:', error)
    return NextResponse.json({ error: 'Server xatoligi' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Tizimga kiring' }, { status: 401 })

    const sessionUser = session.user as { role?: string }
    if (sessionUser.role !== 'admin') {
      return NextResponse.json({ error: 'Admin huquqi kerak' }, { status: 403 })
    }

    const body = await request.json()
    const { name, enabled, config } = body as {
      name: string
      enabled?: boolean
      config?: Record<string, unknown>
    }

    if (!name || !INTEGRATION_NAMES.includes(name)) {
      return NextResponse.json({ error: 'Noto\'g\'ri integratsiya nomi' }, { status: 400 })
    }

    const existing = await prisma.integration.findUnique({ where: { name } })
    const existingConfig = (existing?.config as Record<string, unknown>) || {}

    const mergedConfig = config
      ? { ...existingConfig, ...config }
      : existingConfig

    const updated = await prisma.integration.upsert({
      where: { name },
      update: {
        ...(enabled !== undefined ? { enabled } : {}),
        ...(config ? { config: mergedConfig as Parameters<typeof prisma.integration.create>[0]['data']['config'] } : {}),
      },
      create: {
        name,
        enabled: enabled ?? false,
        config: mergedConfig as Parameters<typeof prisma.integration.create>[0]['data']['config'],
      },
    })

    return NextResponse.json({
      success: true,
      integration: {
        name: updated.name,
        enabled: updated.enabled,
        lastSync: updated.lastSync,
        config: maskConfig(updated.config),
      },
    })
  } catch (error) {
    console.error('PATCH /api/integrations error:', error)
    return NextResponse.json({ error: 'Server xatoligi' }, { status: 500 })
  }
}
