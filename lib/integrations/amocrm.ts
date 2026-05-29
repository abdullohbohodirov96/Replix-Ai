// AmoCRM REST API integration for construction store

import { prisma } from '@/lib/prisma'

interface AmoTokens {
  access_token: string
  refresh_token: string
  expires_at?: number
}

interface AmoContact {
  id: number
  name: string
}

interface AmoLead {
  id: number
  name: string
}

async function getBaseUrl(): Promise<string> {
  try {
    const integration = await prisma.integration.findUnique({ where: { name: 'amocrm' } })
    const cfg = integration?.config as Record<string, string> | null
    return cfg?.base_url || process.env.AMOCRM_BASE_URL || ''
  } catch {
    return process.env.AMOCRM_BASE_URL || ''
  }
}

async function getStoredTokens(): Promise<AmoTokens | null> {
  try {
    const integration = await prisma.integration.findUnique({ where: { name: 'amocrm' } })
    if (!integration?.config) return null
    const cfg = integration.config as Record<string, unknown>
    return {
      access_token: (cfg.access_token as string) || process.env.AMOCRM_ACCESS_TOKEN || '',
      refresh_token: (cfg.refresh_token as string) || process.env.AMOCRM_REFRESH_TOKEN || '',
      expires_at: cfg.expires_at as number | undefined,
    }
  } catch (err) {
    console.error('getStoredTokens error:', err)
    return null
  }
}

async function saveTokens(tokens: AmoTokens): Promise<void> {
  try {
    const cfg = tokens as unknown as Parameters<typeof prisma.integration.create>[0]['data']['config']
    await prisma.integration.upsert({
      where: { name: 'amocrm' },
      update: { config: cfg },
      create: { name: 'amocrm', enabled: true, config: cfg },
    })
  } catch (err) {
    console.error('saveTokens error:', err)
  }
}

export async function getAccessToken(): Promise<string> {
  try {
    const stored = await getStoredTokens()
    const now = Date.now() / 1000

    if (stored?.access_token && stored.expires_at && stored.expires_at > now + 60) {
      return stored.access_token
    }

    const refreshToken = stored?.refresh_token || process.env.AMOCRM_REFRESH_TOKEN || ''
    if (!refreshToken) return process.env.AMOCRM_ACCESS_TOKEN || ''

    const baseUrl = await getBaseUrl()
    if (!baseUrl) return stored?.access_token || process.env.AMOCRM_ACCESS_TOKEN || ''

    const res = await fetch(`${baseUrl}/oauth2/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.AMOCRM_CLIENT_ID,
        client_secret: process.env.AMOCRM_CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        redirect_uri: process.env.NEXTAUTH_URL || 'http://localhost:3000',
      }),
    })

    if (!res.ok) {
      console.error('AmoCRM token refresh failed:', await res.text())
      return stored?.access_token || process.env.AMOCRM_ACCESS_TOKEN || ''
    }

    const data = await res.json()
    const newTokens: AmoTokens = {
      access_token: data.access_token,
      refresh_token: data.refresh_token || refreshToken,
      expires_at: Math.floor(Date.now() / 1000) + (data.expires_in || 3600),
    }
    await saveTokens(newTokens)
    return newTokens.access_token
  } catch (err) {
    console.error('getAccessToken error:', err)
    return process.env.AMOCRM_ACCESS_TOKEN || ''
  }
}

async function amoRequest(
  path: string,
  method: string = 'GET',
  body?: unknown
): Promise<unknown> {
  const baseUrl = getBaseUrl()
  if (!baseUrl) throw new Error('AMOCRM_BASE_URL sozlanmagan')

  const token = await getAccessToken()
  if (!token) throw new Error('AmoCRM token mavjud emas')

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`AmoCRM API xato [${res.status}]: ${err}`)
  }

  if (res.status === 204) return null
  return res.json()
}

export async function createContact(
  name: string,
  phone?: string,
  email?: string
): Promise<AmoContact | null> {
  try {
    const customFields: unknown[] = []
    if (phone) {
      customFields.push({ field_code: 'PHONE', values: [{ value: phone, enum_code: 'WORK' }] })
    }
    if (email) {
      customFields.push({ field_code: 'EMAIL', values: [{ value: email, enum_code: 'WORK' }] })
    }

    const body = {
      add: [{ name, custom_fields_values: customFields }],
    }

    const data = await amoRequest('/api/v4/contacts', 'POST', body) as Record<string, unknown>
    const contacts = (data?._embedded as Record<string, unknown>)?.contacts as AmoContact[]
    return contacts?.[0] || null
  } catch (err) {
    console.error('createContact error:', err)
    return null
  }
}

export async function createLead(
  title: string,
  contactId: number,
  managerId?: number,
  rating?: number
): Promise<AmoLead | null> {
  try {
    const customFields: unknown[] = []
    if (rating !== undefined) {
      customFields.push({
        field_name: 'Qo\'ng\'iroq bahosi',
        values: [{ value: String(rating.toFixed(1)) }],
      })
    }

    const body = {
      add: [{
        name: title,
        _embedded: {
          contacts: [{ id: contactId }],
          ...(managerId ? { users: [{ id: managerId }] } : {}),
        },
        custom_fields_values: customFields,
      }],
    }

    const data = await amoRequest('/api/v4/leads', 'POST', body) as Record<string, unknown>
    const leads = (data?._embedded as Record<string, unknown>)?.leads as AmoLead[]
    return leads?.[0] || null
  } catch (err) {
    console.error('createLead error:', err)
    return null
  }
}

export async function addNote(
  entityType: 'leads' | 'contacts',
  entityId: number,
  text: string
): Promise<boolean> {
  try {
    const body = {
      add: [{
        entity_id: entityId,
        note_type: 'common',
        params: { text },
      }],
    }
    await amoRequest(`/api/v4/${entityType}/notes`, 'POST', body)
    return true
  } catch (err) {
    console.error('addNote error:', err)
    return false
  }
}

export async function syncCallToAmo(
  call: {
    id: string
    audioFileName: string
    rating: number | null
    summary: string | null
    analysis: string | null
    callOutcome: string | null
    problems: string | null
    createdAt: Date
  },
  managerName: string
): Promise<boolean> {
  try {
    const baseUrl = await getBaseUrl()
    if (!baseUrl) return false

    const contactName = `Mijoz (${managerName}) — ${new Date(call.createdAt).toLocaleDateString('uz-UZ')}`
    const contact = await createContact(contactName)
    if (!contact) return false

    const rating = call.rating || 0
    const title = `Qo'ng'iroq — ${managerName} — Baho: ${rating.toFixed(1)}/5`
    const lead = await createLead(title, contact.id, undefined, call.rating ?? undefined)
    if (!lead) return false

    let problems: string[] = []
    try { problems = call.problems ? JSON.parse(call.problems) : [] } catch { /* ignore */ }

    const noteText = [
      `📞 Qurilish Dukoni Qo'ng'iroq Tahlili`,
      `Manager: ${managerName}`,
      `Fayl: ${call.audioFileName}`,
      `Baho: ${rating.toFixed(1)}/5.0`,
      `Natija: ${call.callOutcome || 'noma\'lum'}`,
      call.summary ? `\nXulosa: ${call.summary}` : '',
      problems.length > 0 ? `\nMuammolar:\n${problems.map(p => `• ${p}`).join('\n')}` : '',
      call.analysis ? `\nTahlil: ${call.analysis.substring(0, 500)}` : '',
    ].filter(Boolean).join('\n')

    await addNote('leads', lead.id, noteText)

    await prisma.integration.updateMany({
      where: { name: 'amocrm' },
      data: { lastSync: new Date() },
    })

    return true
  } catch (err) {
    console.error('syncCallToAmo error:', err)
    return false
  }
}

export async function getAccountInfo(): Promise<{ success: boolean; message: string }> {
  try {
    const data = await amoRequest('/api/v4/account') as Record<string, unknown>
    if (data?.id) return { success: true, message: `Ulandi: ${data.name || data.id}` }
    return { success: false, message: 'Hisob ma\'lumoti topilmadi' }
  } catch (err) {
    return { success: false, message: `Xato: ${err instanceof Error ? err.message : 'Noma\'lum xato'}` }
  }
}
