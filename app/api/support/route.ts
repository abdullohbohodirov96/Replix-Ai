import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { openai } from '@/lib/openai'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, message } = body as { sessionId: string; message: string }

    if (!sessionId || !message?.trim()) {
      return NextResponse.json({ error: 'sessionId va message majburiy' }, { status: 400 })
    }

    // Fetch previous messages in the session for context (last 10)
    const prevMessages = await prisma.supportMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
      take: 10,
    })

    const historyMessages: Array<{ role: 'user' | 'assistant'; content: string }> = prevMessages.flatMap(
      (msg) => [
        { role: 'user' as const, content: msg.userMsg },
        { role: 'assistant' as const, content: msg.aiMsg },
      ]
    )

    const systemPrompt = `Sen Replix AI yordamchi chatbot san. Replix AI — savdo qo'ng'iroqlarini tahlil qiluvchi platforma.
Dunyabunya savdo platformasi uchun ishlayman. Abdulloh tomonidan yaratilgan.

Qila oladigan ishlarim:
- Manager qo'shish, o'chirish, tahrirlash haqida yordam berish
- Audio qo'ng'iroqlarni yuklash va tahlil qilish haqida tushuntirish
- Platform funksiyalari haqida savollarga javob berish
- Hisobotlar va statistikani tushuntirish

Foydalanuvchilarga o'zbekcha, qisqa va aniq javob beraman.`

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        ...historyMessages,
        { role: 'user', content: message.trim() },
      ],
      temperature: 0.5,
      max_tokens: 500,
    })

    const aiMsg = response.choices[0].message.content || 'Uzr, javob berishda xatolik yuz berdi.'

    const saved = await prisma.supportMessage.create({
      data: {
        sessionId,
        userMsg: message.trim(),
        aiMsg,
      },
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
    const sessionId = searchParams.get('sessionId')

    const where = sessionId ? { sessionId } : {}

    const messages = await prisma.supportMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    return NextResponse.json(messages)
  } catch (error) {
    console.error('GET /api/support error:', error)
    return NextResponse.json({ error: 'Xatolik yuz berdi' }, { status: 500 })
  }
}
