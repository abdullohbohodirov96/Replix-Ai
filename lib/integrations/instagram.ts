// Instagram Graph API integration for construction store

const GRAPH_API = 'https://graph.facebook.com/v19.0'

function getToken(): string {
  return process.env.INSTAGRAM_ACCESS_TOKEN || ''
}

function getPageId(): string {
  return process.env.INSTAGRAM_PAGE_ID || ''
}

function getIgAccountId(): string {
  return process.env.INSTAGRAM_INSTAGRAM_ACCOUNT_ID || ''
}

async function graphRequest(
  path: string,
  method: string = 'GET',
  body?: Record<string, unknown>
): Promise<unknown> {
  try {
    const token = getToken()
    if (!token) throw new Error('INSTAGRAM_ACCESS_TOKEN sozlanmagan')

    const url = new URL(`${GRAPH_API}${path}`)
    if (method === 'GET') url.searchParams.set('access_token', token)

    const options: RequestInit = {
      method,
      headers: { 'Content-Type': 'application/json' },
    }

    if (method !== 'GET') {
      options.body = JSON.stringify({ ...body, access_token: token })
    }

    const res = await fetch(url.toString(), options)
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Instagram API xato [${res.status}]: ${err}`)
    }

    return res.json()
  } catch (err) {
    console.error('Instagram graphRequest error:', err)
    throw err
  }
}

export async function getInsights(
  metricType: string = 'impressions'
): Promise<{ success: boolean; data?: unknown; message?: string }> {
  try {
    const igAccountId = getIgAccountId()
    if (!igAccountId) return { success: false, message: 'INSTAGRAM_INSTAGRAM_ACCOUNT_ID sozlanmagan' }

    const data = await graphRequest(
      `/${igAccountId}/insights?metric=${metricType}&period=day`
    )
    return { success: true, data }
  } catch (err) {
    return {
      success: false,
      message: `Xato: ${err instanceof Error ? err.message : 'Noma\'lum xato'}`,
    }
  }
}

export async function postStory(
  message: string,
  mediaUrl?: string
): Promise<{ success: boolean; id?: string; message?: string }> {
  try {
    const igAccountId = getIgAccountId()
    if (!igAccountId) return { success: false, message: 'Instagram hisob ID sozlanmagan' }

    let mediaObjectId: string | undefined

    // Step 1: Create media container
    if (mediaUrl) {
      const container = await graphRequest(`/${igAccountId}/media`, 'POST', {
        image_url: mediaUrl,
        caption: message,
        media_type: 'IMAGE',
      }) as Record<string, unknown>

      mediaObjectId = container?.id as string
    }

    if (!mediaObjectId) {
      // Text-only stories not supported natively; use feed post as fallback
      const feed = await graphRequest(`/${igAccountId}/media`, 'POST', {
        caption: message,
        media_type: 'REELS',
      }) as Record<string, unknown>
      mediaObjectId = feed?.id as string
    }

    if (!mediaObjectId) return { success: false, message: 'Media container yaratilmadi' }

    // Step 2: Publish container
    const publish = await graphRequest(`/${igAccountId}/media_publish`, 'POST', {
      creation_id: mediaObjectId,
    }) as Record<string, unknown>

    return { success: true, id: publish?.id as string }
  } catch (err) {
    return {
      success: false,
      message: `Xato: ${err instanceof Error ? err.message : 'Noma\'lum xato'}`,
    }
  }
}

export async function sendDirectMessage(
  recipientId: string,
  message: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const pageId = getPageId()
    if (!pageId) return { success: false, message: 'INSTAGRAM_PAGE_ID sozlanmagan' }

    await graphRequest(`/${pageId}/messages`, 'POST', {
      recipient: { id: recipientId },
      message: { text: message },
      messaging_type: 'RESPONSE',
    })

    return { success: true }
  } catch (err) {
    return {
      success: false,
      message: `Xato: ${err instanceof Error ? err.message : 'Noma\'lum xato'}`,
    }
  }
}

export async function getRecentComments(
  mediaId: string
): Promise<{ success: boolean; comments?: unknown[]; message?: string }> {
  try {
    const data = await graphRequest(
      `/${mediaId}/comments?fields=id,text,username,timestamp`
    ) as Record<string, unknown>

    const comments = (data?.data as unknown[]) || []
    return { success: true, comments }
  } catch (err) {
    return {
      success: false,
      message: `Xato: ${err instanceof Error ? err.message : 'Noma\'lum xato'}`,
    }
  }
}

export async function testConnection(): Promise<{ success: boolean; message: string }> {
  try {
    const token = getToken()
    if (!token) return { success: false, message: 'INSTAGRAM_ACCESS_TOKEN sozlanmagan' }

    const igAccountId = getIgAccountId()
    if (!igAccountId) return { success: false, message: 'INSTAGRAM_INSTAGRAM_ACCOUNT_ID sozlanmagan' }

    const data = await graphRequest(`/${igAccountId}?fields=id,name,username`) as Record<string, unknown>

    if (data?.id) {
      return { success: true, message: `Ulandi: @${data.username || data.name || data.id}` }
    }
    return { success: false, message: 'Hisob ma\'lumoti topilmadi' }
  } catch (err) {
    return {
      success: false,
      message: `Xato: ${err instanceof Error ? err.message : 'Noma\'lum xato'}`,
    }
  }
}
