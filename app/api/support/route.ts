import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { openai, CHAT_MODEL } from '@/lib/openai'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, userId, message, wantsAdmin } = body as {
      sessionId: string; userId?: string; message?: string; wantsAdmin?: boolean
    }

    if (!sessionId) return NextResponse.json({ error: 'sessionId majburiy' }, { status: 400 })

    if (wantsAdmin) {
      const saved = await prisma.supportMessage.create({
        data: {
          sessionId,
          userId: userId || null,
          userMsg: "Admin bilan bog'lanishni so'radim",
          aiMsg: "Sizni admin bilan bog'ladim. Tez orada admin javob beradi 🤝",
          wantsAdmin: true,
        },
      })
      return NextResponse.json({ id: saved.id, aiMsg: saved.aiMsg, createdAt: saved.createdAt })
    }

    if (!message?.trim()) return NextResponse.json({ error: 'message majburiy' }, { status: 400 })

    const prevMessages = await prisma.supportMessage.findMany({
      where: userId ? { userId } : { sessionId },
      orderBy: { createdAt: 'asc' },
      take: 8,
    })

    const historyMessages = prevMessages.flatMap(m => [
      { role: 'user' as const, content: m.userMsg },
      { role: 'assistant' as const, content: m.aiMsg },
    ])

    const systemPrompt = `Sen Replix AI yordamchi chatbot san. Dunyabunya savdo platformasi uchun ishlayman. Abdulloh tomonidan yaratilgan.
Qila oladigan ishlarim: manager, qo'ng'iroq, hisobot, tahlil haqida savollarga javob berish.
Foydalanuvchilarga o'zbekcha, qisqa va aniq javob beraman. 2-3 jumladan oshmasin.`

    const response = await openai.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        ...historyMessages,
        { role: 'user', content: message.trim() },
      ],
      temperature: 0.5,
      max_tokens: 300,
    })

    const aiMsg = response.choices[0].message.content || 'Uzr, javob berishda xatolik yuz berdi.'

    const saved = await prisma.supportMessage.create({
      data: { sessionId, userId: userId || null, userMsg: message.trim(), aiMsg },
    })

    return NextResponse.json({ id: saved.id, aiMsg, createdAt: saved.createdAt })
  } catch (error) {
    console.error('POST /api/support error:', error)
    return NextResponse.json({ error: 'Xatolik yuz berdi' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const sessionId = searchParams.get('sessionId')
    const forAdmin = searchParams.get('admin') === '1'

    if (forAdmin) {
      const messages = await prisma.supportMessage.findMany({
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        take: 200,
      })
      return NextResponse.json(messages)
    }

    const where = userId ? { userId } : sessionId ? { sessionId } : {}
    const messages = await prisma.supportMessage.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    })
    return NextResponse.json(messages)
  } catch (error) {
    console.error('GET /api/support error:', error)
    return NextResponse.json({ error: 'Xatolik yuz berdi' }, { status: 500 })
  }
}
