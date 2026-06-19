export interface MoiZvonkiConfig {
  apiKey: string
  baseUrl?: string
}

export interface MoiZvonkiCall {
  id: string
  phone: string
  duration: number
  direction: string // in, out
  status: string
  recordUrl?: string
  startTime: string
  endTime?: string
  managerId?: string
  managerName?: string
}

export interface MoiZvonkiWebhookPayload {
  event: string
  call_id: string
  phone: string
  duration?: number
  direction?: string
  status?: string
  record_url?: string
  start_time?: string
  end_time?: string
  manager_id?: string
  manager_name?: string
  [key: string]: unknown
}

const MOIZVONKI_BASE = 'https://app.moizvonki.ru/api/v1'

export async function downloadCallAudio(
  config: MoiZvonkiConfig,
  recordUrl: string
): Promise<Buffer> {
  const url = recordUrl.includes('?')
    ? `${recordUrl}&api_key=${config.apiKey}`
    : `${recordUrl}?api_key=${config.apiKey}`

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Moi Zvonki audio yuklab bo'lmadi: ${response.status}`)
  }
  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

export async function getCallDetails(
  config: MoiZvonkiConfig,
  callId: string
): Promise<MoiZvonkiCall | null> {
  const response = await fetch(`${MOIZVONKI_BASE}/calls/${callId}?api_key=${config.apiKey}`)
  if (!response.ok) return null
  const data = await response.json()
  return parseMoiZvonkiCall(data)
}

export async function getCallsList(
  config: MoiZvonkiConfig,
  params: { dateFrom?: string; dateTo?: string; limit?: number } = {}
): Promise<MoiZvonkiCall[]> {
  const query = new URLSearchParams({
    api_key: config.apiKey,
    limit: String(params.limit || 100),
    ...(params.dateFrom ? { date_from: params.dateFrom } : {}),
    ...(params.dateTo ? { date_to: params.dateTo } : {}),
  })

  const response = await fetch(`${MOIZVONKI_BASE}/calls?${query}`)
  if (!response.ok) return []
  const data = await response.json()
  const calls = Array.isArray(data) ? data : data.calls || data.data || []
  return calls.map(parseMoiZvonkiCall)
}

function parseMoiZvonkiCall(raw: Record<string, unknown>): MoiZvonkiCall {
  return {
    id: String(raw.id || raw.call_id || ''),
    phone: String(raw.phone || raw.client_phone || ''),
    duration: Number(raw.duration || 0),
    direction: String(raw.direction || raw.call_direction || 'out'),
    status: String(raw.status || raw.call_status || ''),
    recordUrl: raw.record_url as string | undefined,
    startTime: String(raw.start_time || raw.created_at || new Date().toISOString()),
    endTime: raw.end_time as string | undefined,
    managerId: raw.manager_id as string | undefined,
    managerName: raw.manager_name as string | undefined,
  }
}

export function parseWebhookPayload(body: Record<string, unknown>): MoiZvonkiWebhookPayload {
  return {
    event: String(body.event || ''),
    call_id: String(body.call_id || body.id || ''),
    phone: String(body.phone || body.client_phone || ''),
    duration: Number(body.duration || 0),
    direction: String(body.direction || 'out'),
    status: String(body.status || ''),
    record_url: body.record_url as string | undefined,
    start_time: body.start_time as string | undefined,
    end_time: body.end_time as string | undefined,
    manager_id: body.manager_id as string | undefined,
    manager_name: body.manager_name as string | undefined,
    ...body,
  }
}
