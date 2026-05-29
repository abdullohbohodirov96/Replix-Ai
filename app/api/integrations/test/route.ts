import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Tizimga kiring' }, { status: 401 })

    const sessionUser = session.user as { role?: string }
    if (sessionUser.role !== 'admin' && sessionUser.role !== 'superadmin') {
      return NextResponse.json({ error: 'Admin huquqi kerak' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const name = searchParams.get('name')

    if (name === 'amocrm') {
      const { getAccountInfo } = await import('@/lib/integrations/amocrm')
      const result = await getAccountInfo()
      return NextResponse.json(result)
    }

    if (name === 'bitrix24') {
      const { getProfileInfo } = await import('@/lib/integrations/bitrix24')
      const result = await getProfileInfo()
      return NextResponse.json(result)
    }

    if (name === 'telegram') {
      const token = process.env.TELEGRAM_BOT_TOKEN
      if (!token) return NextResponse.json({ success: false, message: 'TELEGRAM_BOT_TOKEN sozlanmagan' })
      try {
        const res = await fetch(`https://api.telegram.org/bot${token}/getMe`)
        const data = await res.json() as { ok: boolean; result?: { username?: string } }
        if (data.ok) return NextResponse.json({ success: true, message: `Bot ulandi: @${data.result?.username || 'unknown'}` })
        return NextResponse.json({ success: false, message: 'Bot token yaroqsiz' })
      } catch {
        return NextResponse.json({ success: false, message: 'Telegram API ga ulanib bo\'lmadi' })
      }
    }

    return NextResponse.json({ error: 'Noto\'g\'ri integratsiya nomi' }, { status: 400 })
  } catch (error) {
    console.error('Integration test error:', error)
    return NextResponse.json({ success: false, message: 'Server xatoligi' }, { status: 500 })
  }
}
