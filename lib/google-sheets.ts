import { google } from 'googleapis'

export const SHEET_COLUMNS = {
  NAME: 0,        // A
  PHONE: 1,       // B
  SOURCE: 2,      // C
  DATE_ADDED: 3,  // D
  STATUS: 4,      // E
  MANAGER: 5,     // F
  COMMENT: 6,     // G
  AI_ANALYSIS: 7, // H
  AI_RATING: 8,   // I
  LEAD_SCORE: 9,  // J
  CALL_TYPE: 10,  // K
  LAST_CALL: 11,  // L
}

export const COLUMN_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']

function getAuth(credentials: GoogleSheetsConfig) {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: credentials.clientEmail,
      private_key: credentials.privateKey.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
  return auth
}

export interface GoogleSheetsConfig {
  spreadsheetId: string
  sheetName: string
  clientEmail: string
  privateKey: string
}

export async function findLeadByPhone(
  config: GoogleSheetsConfig,
  phone: string
): Promise<{ rowIndex: number; data: string[] } | null> {
  const auth = getAuth(config)
  const sheets = google.sheets({ version: 'v4', auth })

  const normalizedPhone = normalizePhone(phone)

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: config.spreadsheetId,
    range: `${config.sheetName}!A:L`,
  })

  const rows = response.data.values || []
  for (let i = 1; i < rows.length; i++) {
    const rowPhone = normalizePhone(rows[i][SHEET_COLUMNS.PHONE] || '')
    if (rowPhone === normalizedPhone) {
      return { rowIndex: i + 1, data: rows[i] }
    }
  }
  return null
}

export async function updateLeadAnalysis(
  config: GoogleSheetsConfig,
  rowIndex: number,
  data: {
    status?: string
    aiAnalysis?: string
    aiRating?: number
    leadScore?: string
    callType?: string
    lastCallDate?: string
    manager?: string
  }
) {
  const auth = getAuth(config)
  const sheets = google.sheets({ version: 'v4', auth })

  const updates: { range: string; values: string[][] }[] = []

  if (data.status !== undefined) {
    updates.push({
      range: `${config.sheetName}!E${rowIndex}`,
      values: [[data.status]],
    })
  }
  if (data.manager !== undefined) {
    updates.push({
      range: `${config.sheetName}!F${rowIndex}`,
      values: [[data.manager]],
    })
  }
  if (data.aiAnalysis !== undefined) {
    updates.push({
      range: `${config.sheetName}!H${rowIndex}`,
      values: [[data.aiAnalysis]],
    })
  }
  if (data.aiRating !== undefined) {
    updates.push({
      range: `${config.sheetName}!I${rowIndex}`,
      values: [[String(data.aiRating)]],
    })
  }
  if (data.leadScore !== undefined) {
    updates.push({
      range: `${config.sheetName}!J${rowIndex}`,
      values: [[data.leadScore]],
    })
  }
  if (data.callType !== undefined) {
    updates.push({
      range: `${config.sheetName}!K${rowIndex}`,
      values: [[data.callType]],
    })
  }
  if (data.lastCallDate !== undefined) {
    updates.push({
      range: `${config.sheetName}!L${rowIndex}`,
      values: [[data.lastCallDate]],
    })
  }

  if (updates.length === 0) return

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: config.spreadsheetId,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data: updates,
    },
  })
}

export async function getAllLeads(config: GoogleSheetsConfig): Promise<
  { rowIndex: number; data: string[] }[]
> {
  const auth = getAuth(config)
  const sheets = google.sheets({ version: 'v4', auth })

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: config.spreadsheetId,
    range: `${config.sheetName}!A:L`,
  })

  const rows = response.data.values || []
  return rows.slice(1).map((row, i) => ({
    rowIndex: i + 2,
    data: row,
  }))
}

export async function getSheetsStats(config: GoogleSheetsConfig) {
  const leads = await getAllLeads(config)
  const total = leads.length
  const contacted = leads.filter(
    (l) => l.data[SHEET_COLUMNS.STATUS] && l.data[SHEET_COLUMNS.STATUS] !== 'yangi'
  ).length
  const hot = leads.filter((l) => l.data[SHEET_COLUMNS.LEAD_SCORE] === 'hot').length
  const warm = leads.filter((l) => l.data[SHEET_COLUMNS.LEAD_SCORE] === 'warm').length
  const cold = leads.filter((l) => l.data[SHEET_COLUMNS.LEAD_SCORE] === 'cold').length
  const sold = leads.filter((l) => l.data[SHEET_COLUMNS.STATUS] === 'sotildi').length

  return { total, contacted, hot, warm, cold, sold }
}

export function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-\(\)\+]/g, '')
}
