import { NextRequest, NextResponse } from 'next/server'
import { processMoiZvankyEvent, MoiZvankyEvent } from '@/lib/integrations/moizvonki'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

async function getStoredSecret(): Promise<string | null> {
  try {
    const integration = await prisma.integration.findUnique({ where: { name: 'moizvonki' } })
    const cfg = integration?.config as Record<string, unknown> | null
    return (cfg?.secret as string) || null
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify secret if configured
    const envSecret = process.env.MOIZVONKI_SECRET
    const storedSecret = await getStoredSecret()
    const expectedSecret = envSecret || storedSecret

    if (expectedSecret) {
      const headerSecret = request.headers.get('x-secret') || request.headers.get('x-webhook-secret')
      const url = new URL(request.url)
      const paramSecret = url.searchParams.get('secret')
      const provided = headerSecret || paramSecret
      if (provided !== expectedSecret) {
        console.warn('[MoiZvanki] Invalid secret')
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    let event: MoiZvankyEvent = {}

    const contentType = request.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      const body = await request.json().catch(() => ({}))
      event = body as MoiZvankyEvent
    } else if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      const formData = await request.formData().catch(() => new FormData())
      event = {
        call_id: formData.get('call_id') as string || undefined,
        phone: formData.get('phone') as string || undefined,
        direction: formData.get('direction') as string || undefined,
        duration: formData.get('duration') as string || undefined,
        record_url: formData.get('record_url') as string || undefined,
        manager: formData.get('manager') as string || undefined,
        responsible: formData.get('responsible') as string || undefined,
        manager_phone: formData.get('manager_phone') as string || undefined,
      }
    } else {
      // Try JSON anyway
      const text = await request.text().catch(() => '{}')
      try { event = JSON.parse(text) } catch { /* ignore */ }
    }

    // Fire-and-forget: process async
    processMoiZvankyEvent(event).catch(e => console.error('[MoiZvanki] async process error:', e))

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[MoiZvanki] Webhook error:', err)
    return NextResponse.json({ ok: true }) // Always 200 to webhook sender
  }
}

export async function GET() {
  return NextResponse.json({ status: 'Moi Zvanki webhook endpoint faol' })
}
