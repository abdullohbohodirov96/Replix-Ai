// Bitrix24 REST API integration for construction store

import { prisma } from '@/lib/prisma'

function getWebhookUrl(): string {
  return process.env.BITRIX24_WEBHOOK_URL || ''
}

type BitrixParams = Record<string, string | number | boolean | undefined>

export async function callMethod(
  method: string,
  params: BitrixParams = {}
): Promise<unknown> {
  try {
    const webhookUrl = getWebhookUrl()
    if (!webhookUrl) throw new Error('BITRIX24_WEBHOOK_URL sozlanmagan')

    const url = `${webhookUrl.replace(/\/$/, '')}/${method}.json`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Bitrix24 API xato [${res.status}]: ${err}`)
    }

    const data = await res.json()
    if (data.error) {
      throw new Error(`Bitrix24 error: ${data.error_description || data.error}`)
    }
    return data.result
  } catch (err) {
    console.error('Bitrix24 callMethod error:', err)
    throw err
  }
}

export async function createContact(
  name: string,
  phone?: string
): Promise<number | null> {
  try {
    const fields: Record<string, unknown> = {
      NAME: name,
      TYPE_ID: 'CLIENT',
      SOURCE_ID: 'WEB',
    }

    if (phone) {
      fields.PHONE = [{ VALUE: phone, VALUE_TYPE: 'WORK' }]
    }

    const result = await callMethod('crm.contact.add', { fields } as unknown as BitrixParams)
    return result as number
  } catch (err) {
    console.error('Bitrix24 createContact error:', err)
    return null
  }
}

export async function createDeal(
  title: string,
  contactId: number,
  stage: string = 'NEW',
  managerId?: string
): Promise<number | null> {
  try {
    const fields: Record<string, unknown> = {
      TITLE: title,
      CONTACT_ID: contactId,
      STAGE_ID: stage,
      SOURCE_ID: 'CALL',
    }

    if (managerId) {
      fields.ASSIGNED_BY_ID = managerId
    }

    const result = await callMethod('crm.deal.add', { fields } as unknown as BitrixParams)
    return result as number
  } catch (err) {
    console.error('Bitrix24 createDeal error:', err)
    return null
  }
}

export async function createActivity(
  dealId: number,
  subject: string,
  description: string,
  direction: number = 2
): Promise<number | null> {
  try {
    const fields: Record<string, unknown> = {
      OWNER_TYPE_ID: 2, // CRM_DEAL
      OWNER_ID: dealId,
      TYPE_ID: 2, // CALL
      SUBJECT: subject,
      DESCRIPTION: description,
      DESCRIPTION_TYPE: 1,
      DIRECTION: direction, // 1=incoming, 2=outgoing
      COMPLETED: 'Y',
    }

    const result = await callMethod('crm.activity.add', { fields } as unknown as BitrixParams)
    return result as number
  } catch (err) {
    console.error('Bitrix24 createActivity error:', err)
    return null
  }
}

function mapOutcomeToStage(outcome: string | null): string {
  const map: Record<string, string> = {
    sale: 'WON',
    rejected: 'LOSE',
    followup: 'IN_PROCESS',
    unknown: 'NEW',
  }
  return map[outcome || 'unknown'] || 'NEW'
}

export async function syncCallToBitrix(
  call: {
    id: string
    audioFileName: string
    rating: number | null
    summary: string | null
    analysis: string | null
    callOutcome: string | null
    problems: string | null
    positives: string | null
    clientSentiment: string | null
    createdAt: Date
  },
  managerName: string
): Promise<boolean> {
  try {
    const webhookUrl = getWebhookUrl()
    if (!webhookUrl) return false

    const date = new Date(call.createdAt).toLocaleDateString('uz-UZ')
    const contactName = `Mijoz (${managerName}) — ${date}`
    const contactId = await createContact(contactName)
    if (!contactId) return false

    const rating = call.rating || 0
    const stage = mapOutcomeToStage(call.callOutcome)
    const dealTitle = `Qo'ng'iroq — ${managerName} — ${rating.toFixed(1)}/5 — ${date}`
    const dealId = await createDeal(dealTitle, contactId, stage)
    if (!dealId) return false

    let problems: string[] = []
    let positives: string[] = []
    try { problems = call.problems ? JSON.parse(call.problems) : [] } catch { /* ignore */ }
    try { positives = call.positives ? JSON.parse(call.positives) : [] } catch { /* ignore */ }

    const description = [
      `Qurilish Dukoni — Savdo Qo'ng'iroq Tahlili`,
      `Manager: ${managerName}`,
      `Fayl: ${call.audioFileName}`,
      `Baho: ${rating.toFixed(1)}/5.0`,
      `Natija: ${call.callOutcome || 'noma\'lum'}`,
      `Mijoz kayfiyati: ${call.clientSentiment || 'noma\'lum'}`,
      call.summary ? `\nXulosa:\n${call.summary}` : '',
      problems.length > 0 ? `\nMuammolar:\n${problems.map(p => `• ${p}`).join('\n')}` : '',
      positives.length > 0 ? `\nYaxshi tomonlar:\n${positives.map(p => `• ${p}`).join('\n')}` : '',
    ].filter(Boolean).join('\n')

    await createActivity(dealId, `Savdo qo'ng'iroqi — ${managerName}`, description)

    await prisma.integration.updateMany({
      where: { name: 'bitrix24' },
      data: { lastSync: new Date() },
    })

    return true
  } catch (err) {
    console.error('syncCallToBitrix error:', err)
    return false
  }
}

export async function getProfileInfo(): Promise<{ success: boolean; message: string }> {
  try {
    const result = await callMethod('profile') as Record<string, unknown>
    if (result?.ID || result?.NAME) {
      return { success: true, message: `Ulandi: ${result.NAME || result.ID}` }
    }
    return { success: false, message: 'Profil ma\'lumoti topilmadi' }
  } catch (err) {
    return {
      success: false,
      message: `Xato: ${err instanceof Error ? err.message : 'Noma\'lum xato'}`,
    }
  }
}
