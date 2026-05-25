import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getConstructionInsights } from '@/lib/ai-learning'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Tizimga kiring' }, { status: 401 })

    const insights = await getConstructionInsights()
    return NextResponse.json({ insights })
  } catch (error) {
    console.error('GET /api/ai-insights error:', error)
    return NextResponse.json({ error: 'Server xatoligi' }, { status: 500 })
  }
}
