// AI Self-Learning system for construction store (qurilish dukoni)
// Extracts and accumulates knowledge from call transcriptions

import { openai, CHAT_MODEL } from '@/lib/openai'
import { prisma } from '@/lib/prisma'

// Uzbek construction terms recognized by this system
const CONSTRUCTION_TERMS = [
  'temir', 'tsement', "g'isht", 'qum', 'shifer', 'profil', 'laminat',
  'gips', 'karton', 'bo\'yoq', 'quvur', 'sim', 'armatura', 'bloklarok',
  'keramzit', 'plitkalar', 'mozaika', 'shifer', 'ruberoid', 'suvoq',
  'polimer', 'bitum', 'izolatsiya', 'penoplast', 'penobeton', 'metall',
  'alyuminiy', 'plastik', 'yog\'och', 'parket', 'linoleum', 'krovel',
]

interface ExtractedKnowledge {
  products: string[]
  objections: string[]
  techniques: string[]
  customer_types: string[]
}

async function extractWithGPT(
  transcription: string,
  analysis: string
): Promise<ExtractedKnowledge> {
  const prompt = `Siz qurilish dukoni uchun AI trener assistentsiz.
Quyidagi savdo qo'ng'iroqi transkripsiyasi va tahlilidan bilimlarni ajratib oling.

Qurilish sohasiga tegishli terminlar: ${CONSTRUCTION_TERMS.join(', ')}

Quyidagi JSON formatida qaytaring:
{
  "products": ["tilga olingan mahsulot yoki xizmat nomlari (o'zbekcha)"],
  "objections": ["mijoz e'tirozlari yoki muammolari (qisqa iboralar)"],
  "techniques": ["manager foydalaangan savdo texnikasi yoki yondashuvi"],
  "customer_types": ["mijoz turi: narx-sezgir, tezkor, professional, o'ylanadigan va h.k."]
}

Faqat aniq, takrorlanmaydigan narsalarni yozing. Har bir kategoriyada 1-5 ta element bo'lsin.
Agar hech narsa topilmasa, bo'sh massiv qoldiring.

Transkripsiya:
${transcription.substring(0, 2000)}

Tahlil:
${analysis.substring(0, 1000)}

Faqat JSON qaytaring.`

  try {
    const res = await openai.chat.completions.create({
      model: CHAT_MODEL,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 600,
    })

    const data = JSON.parse(res.choices[0].message.content || '{}')
    return {
      products: Array.isArray(data.products) ? data.products.map(String) : [],
      objections: Array.isArray(data.objections) ? data.objections.map(String) : [],
      techniques: Array.isArray(data.techniques) ? data.techniques.map(String) : [],
      customer_types: Array.isArray(data.customer_types) ? data.customer_types.map(String) : [],
    }
  } catch (err) {
    console.error('GPT knowledge extraction error:', err)
    return { products: [], objections: [], techniques: [], customer_types: [] }
  }
}

async function upsertKnowledge(
  category: string,
  pattern: string,
  callId: string,
  context?: string
): Promise<void> {
  try {
    const existing = await prisma.aIKnowledge.findFirst({
      where: { category, pattern: { equals: pattern, mode: 'insensitive' } },
    })

    if (existing) {
      await prisma.aIKnowledge.update({
        where: { id: existing.id },
        data: {
          frequency: { increment: 1 },
          context: context || existing.context,
          updatedAt: new Date(),
        },
      })
    } else {
      await prisma.aIKnowledge.create({
        data: { category, pattern, callId, context, frequency: 1 },
      })
    }
  } catch (err) {
    console.error('upsertKnowledge error:', err)
  }
}

export async function extractKnowledgeFromCall(
  callId: string,
  transcription: string,
  analysis: string
): Promise<void> {
  try {
    if (!transcription || transcription.length < 50) return

    const knowledge = await extractWithGPT(transcription, analysis)

    const saveAll = async (category: string, items: string[], context?: string) => {
      for (const item of items) {
        if (item && item.trim().length > 2) {
          await upsertKnowledge(category, item.trim(), callId, context)
        }
      }
    }

    await saveAll('product', knowledge.products, transcription.substring(0, 200))
    await saveAll('objection', knowledge.objections, transcription.substring(0, 200))
    await saveAll('technique', knowledge.techniques, analysis.substring(0, 200))
    await saveAll('customer_type', knowledge.customer_types)
  } catch (err) {
    console.error('extractKnowledgeFromCall error:', err)
  }
}

export async function getRelevantKnowledge(limit: number = 10): Promise<string> {
  try {
    const items = await prisma.aIKnowledge.findMany({
      orderBy: { frequency: 'desc' },
      take: limit * 4,
    })

    if (items.length === 0) return ''

    const byCategory: Record<string, string[]> = {}
    for (const item of items) {
      if (!byCategory[item.category]) byCategory[item.category] = []
      if (byCategory[item.category].length < limit) {
        byCategory[item.category].push(`${item.pattern} (${item.frequency}x)`)
      }
    }

    const parts: string[] = []

    if (byCategory.product?.length) {
      parts.push(`Ko'p tilga olingan mahsulotlar: ${byCategory.product.join(', ')}`)
    }
    if (byCategory.objection?.length) {
      parts.push(`Keng tarqalgan e'tirozlar: ${byCategory.objection.join(', ')}`)
    }
    if (byCategory.technique?.length) {
      parts.push(`Samarali savdo texnikalari: ${byCategory.technique.join(', ')}`)
    }
    if (byCategory.customer_type?.length) {
      parts.push(`Mijoz turlari: ${byCategory.customer_type.join(', ')}`)
    }

    return parts.length > 0
      ? `\n\n[O'rganilgan bilimlar - qurilish dukoni konteksti]\n${parts.join('\n')}`
      : ''
  } catch (err) {
    console.error('getRelevantKnowledge error:', err)
    return ''
  }
}

export async function getConstructionInsights(): Promise<{
  products: { pattern: string; frequency: number }[]
  objections: { pattern: string; frequency: number }[]
  techniques: { pattern: string; frequency: number }[]
  customer_types: { pattern: string; frequency: number }[]
  totalPatterns: number
}> {
  try {
    const all = await prisma.aIKnowledge.findMany({
      orderBy: { frequency: 'desc' },
    })

    type KnowledgeItem = { category: string; pattern: string; frequency: number }
    const byCategory = (cat: string) =>
      (all as KnowledgeItem[])
        .filter(i => i.category === cat)
        .slice(0, 20)
        .map(i => ({ pattern: i.pattern, frequency: i.frequency }))

    return {
      products: byCategory('product'),
      objections: byCategory('objection'),
      techniques: byCategory('technique'),
      customer_types: byCategory('customer_type'),
      totalPatterns: all.length,
    }
  } catch (err) {
    console.error('getConstructionInsights error:', err)
    return { products: [], objections: [], techniques: [], customer_types: [], totalPatterns: 0 }
  }
}

export async function getEnhancedSystemPrompt(): Promise<string> {
  const basePrompt = `Sen Replix AI — professional savdo trenerisan. Dunyabunya savdo platformasi uchun ishlaysan.
Sening vazifang — savdo qo'ng'iroqlarini chuqur tahlil qilib, managerga ANIQ va AMALIY maslahatlar berish.

MUHIM QOIDALAR:
1. Hech qachon umumiy gap aytma. "Manager professional harakat qilmagan" deyish — YOMON javob.
   Buning o'rniga aniq ayt: NIMANI noto'g'ri qildi, va o'rniga ANIQ NIMA deyishi kerak edi.
2. Har bir muammo uchun managerga aniq jumla / skript ber. Misol uchun:
   "Manager narxni darrov aytib yubordi. To'g'risi: avval qiymatni tushuntirib, keyin
   'Bu xizmat oyiga shuncha turadi, lekin u sizga quyidagilarni beradi...' deyish kerak edi."
3. ChatGPT kabi tushunarli, samimiy va foydali bo'l. Manager o'qib, darrov nima qilishni bilsin.

Quyidagi formatda JSON qaytaras:
{
  "summary": "Suhbat qisqacha mazmuni (2-3 jumla, o'zbekcha)",
  "rating": 1.0-5.0 oralig'ida float baho,
  "problems": ["aniq muammo 1", "aniq muammo 2"],
  "positives": ["manager yaxshi qilgan narsa 1"],
  "recommendations": [
    {
      "problem": "Aniq nima xato bo'ldi",
      "betterApproach": "Manager ANIQ nima deyishi kerak edi — to'liq jumla yoki skript bilan."
    }
  ],
  "clientSentiment": "positive" | "negative" | "neutral",
  "callOutcome": "sale" | "followup" | "rejected" | "unknown",
  "analysis": "Batafsil tahlil (o'zbekcha, 4-6 jumla)",
  "improvement": "Umumiy yakuniy maslahat (o'zbekcha, 2-3 jumla)"
}

Baholash mezonlari:
1 - Juda yomon: qo'pol, savol bermaydi, mahsulotni bilmaydi
2 - Yomon: jiddiy xatolar, mijozni tinglamaydi, ehtiyojni aniqlamaydi
3 - O'rtacha: asosiy ma'lumot berildi lekin sotuv texnikasi zaif
4 - Yaxshi: professional, ehtiyojni aniqladi, kichik kamchiliklar
5 - A'lo: mijozni tingladi, ehtiyojni aniqladi, e'tirozlar bilan ishladi, natijaga olib keldi

Faqat to'g'ri JSON qaytaras, boshqa matn yo'q.`

  const learned = await getRelevantKnowledge(8)
  return basePrompt + learned
}
