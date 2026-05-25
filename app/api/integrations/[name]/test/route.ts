import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { testConnection as testTelegram } from '@/lib/integrations/telegram'
import { getAccountInfo as testAmo } from '@/lib/integrations/amocrm'
import { getProfileInfo as testBitrix } from '@/lib/integrations/bitrix24'
import { readFirstRow as testSheets } from '@/lib/integrations/google-sheets'
import { testConnection as testInstagram } from '@/lib/integrations/instagram'

export const dynamic = 'force-dynamic'

export async function POST(
  _request: NextRequest,
  { params }: { params: { name: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Tizimga kiring' }, { status: 401 })
    const sessionUser = session.user as { role?: string }
    if (sessionUser.role !== 'admin') {
      return NextResponse.json({ error: 'Admin huquqi kerak' }, { status: 403 })
    }

    const { name } = params
    let result: { success: boolean; message: string } = { success: false, message: 'Noto\'g\'ri integratsiya' }

    if (name === 'telegram') result = await testTelegram()
    else if (name === 'amocrm') result = await testAmo()
    else if (name === 'bitrix24') result = await testBitrix()
    else if (name === 'google_sheets') result = await testSheets()
    else if (name === 'instagram') result = await testInstagram()

    return NextResponse.json(result)
  } catch (error) {
    console.error(`Test ${params?.name} error:`, error)
    return NextResponse.json({ success: false, message: 'Test xatoligi' }, { status: 500 })
  }
}
