import OpenAI from 'openai'
import fs from 'fs'

const useGroq = !!process.env.GROQ_API_KEY

export const openai = new OpenAI(
  useGroq
    ? { apiKey: process.env.GROQ_API_KEY || 'missing-key', baseURL: 'https://api.groq.com/openai/v1' }
    : { apiKey: process.env.OPENAI_API_KEY || 'missing-key' }
)

export const CHAT_MODEL = useGroq ? 'llama-3.3-70b-versatile' : 'gpt-4o'
const WHISPER_MODEL = useGroq ? 'whisper-large-v3' : 'whisper-1'

export async function transcribeAudio(filePath: string): Promise<string> {
  const audioFile = fs.createReadStream(filePath)
  const transcription = await openai.audio.transcriptions.create({
    file: audioFile,
    model: WHISPER_MODEL,
    response_format: 'text',
  })
  return transcription as unknown as string
}

export interface Recommendation {
  problem: string         // nima xato bo'ldi
  betterApproach: string  // manager nima deyishi/qilishi kerak edi (aniq misol bilan)
}

export interface CallAnalysisResult {
  summary: string
  rating: number
  problems: string[]
  positives: string[]
  recommendations: Recommendation[]
  clientSentiment: 'positive' | 'negative' | 'neutral'
  callOutcome: 'sale' | 'followup' | 'rejected' | 'unknown'
  analysis: string
  improvement: string
}

export async function analyzeCallTranscription(
  transcription: string,
  managerName: string
): Promise<CallAnalysisResult> {
  const systemPrompt = `Sen Replix AI — professional savdo trenerisan. Dunyabunya savdo platformasi uchun ishlaysan.
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
  "problems": ["aniq muammo 1", "aniq muammo 2", ...] (o'zbekcha, aniq),
  "positives": ["manager yaxshi qilgan narsa 1", ...] (o'zbekcha),
  "recommendations": [
    {
      "problem": "Aniq nima xato bo'ldi",
      "betterApproach": "Manager o'rniga ANIQ nima deyishi kerak edi — to'liq jumla yoki skript bilan. Nega bu yaxshiroq ekanligini ham tushuntir."
    }
  ] (kamida 2-4 ta, eng muhim muammolar uchun),
  "clientSentiment": "positive" | "negative" | "neutral",
  "callOutcome": "sale" | "followup" | "rejected" | "unknown",
  "analysis": "Batafsil tahlil — suhbat qanday ketdi, manager va mijoz qanday gaplashdi, qayerda yutdi/yutqazdi (o'zbekcha, 4-6 jumla)",
  "improvement": "Umumiy yakuniy maslahat — keyingi qo'ng'iroqlarda manager nimaga e'tibor berishi kerak (o'zbekcha, 2-3 jumla)"
}

Baholash mezonlari:
1 - Juda yomon: qo'pol, savol bermaydi, mahsulotni bilmaydi
2 - Yomon: jiddiy xatolar, mijozni tinglamaydi, ehtiyojni aniqlamaydi
3 - O'rtacha: asosiy ma'lumot berildi lekin sotuv texnikasi zaif
4 - Yaxshi: professional, ehtiyojni aniqladi, kichik kamchiliklar
5 - A'lo: mijozni tingladi, ehtiyojni aniqladi, e'tirozlar bilan ishladi, natijaga olib keldi

Faqat to'g'ri JSON qaytaras, boshqa matn yo'q.`

  const response = await openai.chat.completions.create({
    model: CHAT_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Manager ismi: ${managerName}\n\nQo'ng'iroq transkripsiyasi:\n${transcription}\n\nYuqoridagi JSON formatida chuqur tahlil ber. Recommendations da har bir muammo uchun manager ANIQ nima deyishi kerakligini yoz.` },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.4,
    max_tokens: 2048,
  })

  const content = response.choices[0].message.content || '{}'
  try {
    const r = JSON.parse(content)
    const recs: Recommendation[] = Array.isArray(r.recommendations)
      ? r.recommendations
          .filter((x: unknown) => x && typeof x === 'object')
          .map((x: { problem?: string; betterApproach?: string }) => ({
            problem: String(x.problem || ''),
            betterApproach: String(x.betterApproach || ''),
          }))
          .filter((x: Recommendation) => x.problem && x.betterApproach)
      : []
    return {
      summary: r.summary || 'Tahlil mavjud emas',
      rating: Math.min(5, Math.max(1, parseFloat(String(r.rating || '3')))),
      problems: Array.isArray(r.problems) ? r.problems.map(String) : [],
      positives: Array.isArray(r.positives) ? r.positives.map(String) : [],
      recommendations: recs,
      clientSentiment: r.clientSentiment || 'neutral',
      callOutcome: r.callOutcome || 'unknown',
      analysis: r.analysis || '',
      improvement: r.improvement || '',
    }
  } catch {
    return {
      summary: 'Tahlil xatolik',
      rating: 3,
      problems: [],
      positives: [],
      recommendations: [],
      clientSentiment: 'neutral',
      callOutcome: 'unknown',
      analysis: content,
      improvement: '',
    }
  }
}

export async function generateDailyReport(
  managerName: string,
  calls: Array<{ summary: string; rating: number; problems: string[]; callOutcome: string }>
): Promise<{ summary: string; topProblems: string[]; improvement: string }> {
  if (calls.length === 0) return { summary: 'Bugun qo\'ng\'iroqlar mavjud emas', topProblems: [], improvement: '' }

  const response = await openai.chat.completions.create({
    model: CHAT_MODEL,
    messages: [{
      role: 'user',
      content: `Sen savdo trenerisan. ${managerName} managerning bugungi qo'ng'iroqlari:\n${calls.map((c, i) => `${i+1}. Baho: ${c.rating}/5 | ${c.callOutcome} | ${c.summary}`).join('\n')}\n\nManagerga aniq, amaliy maslahat ber. JSON: { "summary": "kunlik umumiy xulosa", "topProblems": ["eng muhim muammo 1", "muammo 2"], "improvement": "ertaga nimaga e'tibor berish kerak — aniq maslahat" }`,
    }],
    response_format: { type: 'json_object' },
    temperature: 0.4,
    max_tokens: 700,
  })

  try {
    const r = JSON.parse(response.choices[0].message.content || '{}')
    return { summary: r.summary || '', topProblems: Array.isArray(r.topProblems) ? r.topProblems : [], improvement: r.improvement || '' }
  } catch {
    return { summary: 'Hisobot xatolik', topProblems: [], improvement: '' }
  }
}
