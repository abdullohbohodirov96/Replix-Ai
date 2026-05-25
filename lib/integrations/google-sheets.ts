// Google Sheets API integration using Service Account JWT auth

import { prisma } from '@/lib/prisma'

const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'

async function createJWT(): Promise<string> {
  const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL || ''
  const privateKey = (process.env.GOOGLE_SHEETS_PRIVATE_KEY || '').replace(/\\n/g, '\n')

  if (!clientEmail || !privateKey) throw new Error('Google Sheets credentials sozlanmagan')

  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const payload = {
    iss: clientEmail,
    scope: SHEETS_SCOPE,
    aud: TOKEN_URL,
    exp: now + 3600,
    iat: now,
  }

  const encode = (obj: unknown) =>
    Buffer.from(JSON.stringify(obj)).toString('base64url')

  const signingInput = `${encode(header)}.${encode(payload)}`

  // Import the RSA private key for signing
  const keyData = privateKey
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '')

  const binaryKey = Buffer.from(keyData, 'base64')

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    Buffer.from(signingInput)
  )

  const sig = Buffer.from(signature).toString('base64url')
  return `${signingInput}.${sig}`
}

async function getAccessToken(): Promise<string> {
  const jwt = await createJWT()

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Google token xatoligi: ${err}`)
  }

  const data = await res.json()
  return data.access_token
}

async function sheetsRequest(
  path: string,
  method: string = 'GET',
  body?: unknown
): Promise<unknown> {
  const token = await getAccessToken()
  const baseUrl = 'https://sheets.googleapis.com/v4/spreadsheets'

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
    throw new Error(`Google Sheets xato [${res.status}]: ${err}`)
  }

  if (res.status === 204) return null
  return res.json()
}

export async function appendRow(
  spreadsheetId: string,
  sheetName: string,
  values: (string | number | null)[]
): Promise<boolean> {
  try {
    await sheetsRequest(
      `/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A1:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      'POST',
      { values: [values] }
    )
    return true
  } catch (err) {
    console.error('appendRow error:', err)
    return false
  }
}

export async function createHeadersIfNeeded(
  spreadsheetId: string,
  sheetName: string,
  headers: string[]
): Promise<void> {
  try {
    const data = await sheetsRequest(
      `/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A1:Z1`
    ) as Record<string, unknown>

    const existing = (data?.values as string[][])?.[0]
    if (!existing || existing.length === 0) {
      await sheetsRequest(
        `/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A1:update?valueInputOption=USER_ENTERED`,
        'PUT',
        { values: [headers] }
      )
    }
  } catch (err) {
    console.error('createHeadersIfNeeded error:', err)
  }
}

export async function exportCallToSheets(
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
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || ''
    if (!spreadsheetId) return false

    const sheetName = "Qo'ng'iroqlar"
    const headers = [
      'ID', 'Manager', 'Fayl', 'Baho', 'Natija', 'Kayfiyat',
      'Xulosa', 'Muammolar', 'Yaxshi tomonlar', 'Sana'
    ]
    await createHeadersIfNeeded(spreadsheetId, sheetName, headers)

    let problems: string[] = []
    let positives: string[] = []
    try { problems = call.problems ? JSON.parse(call.problems) : [] } catch { /* ignore */ }
    try { positives = call.positives ? JSON.parse(call.positives) : [] } catch { /* ignore */ }

    const row = [
      call.id,
      managerName,
      call.audioFileName,
      call.rating?.toFixed(1) || '0',
      call.callOutcome || 'noma\'lum',
      call.clientSentiment || 'neutral',
      call.summary || '',
      problems.join('; '),
      positives.join('; '),
      new Date(call.createdAt).toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' }),
    ]

    const ok = await appendRow(spreadsheetId, sheetName, row)

    if (ok) {
      await prisma.integration.updateMany({
        where: { name: 'google_sheets' },
        data: { lastSync: new Date() },
      })
    }

    return ok
  } catch (err) {
    console.error('exportCallToSheets error:', err)
    return false
  }
}

export async function exportDailyReport(
  report: {
    date: Date
    totalCalls: number
    avgRating: number
    topProblems: string | null
    summary: string | null
    improvement: string | null
  },
  managerName: string
): Promise<boolean> {
  try {
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || ''
    if (!spreadsheetId) return false

    const sheetName = 'Kunlik Hisobotlar'
    const headers = [
      'Sana', 'Manager', 'Jami Qo\'ng\'iroqlar',
      "O'rtacha Baho", 'Asosiy Muammolar', 'Xulosa', 'Tavsiya'
    ]
    await createHeadersIfNeeded(spreadsheetId, sheetName, headers)

    let problems: string[] = []
    try { problems = report.topProblems ? JSON.parse(report.topProblems) : [] } catch { /* ignore */ }

    const row = [
      new Date(report.date).toLocaleDateString('uz-UZ'),
      managerName,
      report.totalCalls,
      report.avgRating.toFixed(2),
      problems.join('; '),
      report.summary || '',
      report.improvement || '',
    ]

    return await appendRow(spreadsheetId, sheetName, row)
  } catch (err) {
    console.error('exportDailyReport error:', err)
    return false
  }
}

export async function readFirstRow(
  spreadsheetId?: string,
  sheetName: string = 'Sheet1'
): Promise<{ success: boolean; message: string }> {
  try {
    const sid = spreadsheetId || process.env.GOOGLE_SHEETS_SPREADSHEET_ID || ''
    if (!sid) return { success: false, message: 'GOOGLE_SHEETS_SPREADSHEET_ID sozlanmagan' }

    const data = await sheetsRequest(
      `/${sid}/values/${encodeURIComponent(sheetName)}!A1:Z1`
    ) as Record<string, unknown>

    const rows = data?.values as string[][]
    if (rows && rows.length > 0) {
      return { success: true, message: `Ulandi. Birinchi satr: ${rows[0].slice(0, 3).join(', ')}...` }
    }
    return { success: true, message: 'Ulandi. Jadval bo\'sh.' }
  } catch (err) {
    return {
      success: false,
      message: `Xato: ${err instanceof Error ? err.message : 'Noma\'lum xato'}`,
    }
  }
}
