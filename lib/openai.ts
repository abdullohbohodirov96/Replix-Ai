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

export interface CriteriaItem {
  id: string
  name: string
  description: string
  maxScore: number
  weight: number
}

export interface CriteriaAnalysisResult extends CallAnalysisResult {
  criteriaScores: Record<string, number>
  totalCriteriaScore: number
  leadScore: 'hot' | 'warm' | 'cold'
}

export async function analyzeCallWithCriteria(
  transcription: string,
  managerName: string,
  callType: string,
  criteria: CriteriaItem[],
  leadScoringCriteria: { hot: string[]; warm: string[]; cold: string[] }
): Promise<CriteriaAnalysisResult> {
  const criteriaText = criteria
    .map(
      (c) =>
        `- "${c.name}" (id: ${c.id}, maks ball: ${c.maxScore}): ${c.description}`
    )
    .join('\n')

  const callTypeLabels: Record<string, string> = {
    sotuv: 'Sotuv qo\'ng\'irog\'i',
    qayta_qongiroq: 'Qayta qo\'ng\'iroq',
    kiruvchi: 'Kiruvchi qo\'ng\'iroq',
    chiquvchi: 'Chiquvchi qo\'ng\'iroq',
  }

  const systemPrompt = `Sen Replix AI — professional savdo trenerisan.
Qo'ng'iroq turini e'tiborga olib, FAQAT berilgan mezonlar bo'yicha tahlil qilasan.
Mezonlarni o'zing o'ylab topmaysan — faqat berilgan mezonlar bo'yicha baholaysan.

Qo'ng'iroq turi: ${callTypeLabels[callType] || callType}

BAHOLASH MEZONLARI:
${criteriaText}

LEAD TURLARI:
Hot lead belgilari: ${leadScoringCriteria.hot.join(', ')}
Warm lead belgilari: ${leadScoringCriteria.warm.join(', ')}
Cold lead belgilari: ${leadScoringCriteria.cold.join(', ')}

JSON formatida qaytaras:
{
  "summary": "Suhbat qisqacha mazmuni (2-3 jumla)",
  "rating": 1.0-10.0 oralig'ida umumiy baho,
  "criteriaScores": { "criteria_id": ball, ... },
  "problems": ["aniq muammo 1", ...],
  "positives": ["yaxshi narsa 1", ...],
  "recommendations": [{"problem": "...", "betterApproach": "..."}],
  "clientSentiment": "positive" | "negative" | "neutral",
  "callOutcome": "sale" | "followup" | "rejected" | "unknown",
  "analysis": "Batafsil tahlil (4-6 jumla)",
  "improvement": "Keyingi qo'ng'iroq uchun maslahat",
  "leadScore": "hot" | "warm" | "cold"
}

Faqat JSON, boshqa matn yo'q.`

  const response = await openai.chat.completions.create({
    model: CHAT_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `Manager: ${managerName}\n\nTranskripsiya:\n${transcription}`,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
    max_tokens: 2500,
  })

  const content = response.choices[0].message.content || '{}'
  try {
    const r = JSON.parse(content)
    const criteriaScores: Record<string, number> = {}
    if (r.criteriaScores && typeof r.criteriaScores === 'object') {
      for (const [k, v] of Object.entries(r.criteriaScores)) {
        criteriaScores[k] = Number(v)
      }
    }
    const totalCriteriaScore =
      Object.values(criteriaScores).reduce((a, b) => a + b, 0) / Math.max(criteria.length, 1)

    const baseResult = await analyzeCallTranscription(transcription, managerName)

    return {
      ...baseResult,
      summary: r.summary || baseResult.summary,
      rating: Math.min(10, Math.max(1, parseFloat(String(r.rating || '5')))),
      problems: Array.isArray(r.problems) ? r.problems.map(String) : baseResult.problems,
      positives: Array.isArray(r.positives) ? r.positives.map(String) : baseResult.positives,
      recommendations: Array.isArray(r.recommendations)
        ? r.recommendations.map((x: { problem?: string; betterApproach?: string }) => ({
            problem: String(x.problem || ''),
            betterApproach: String(x.betterApproach || ''),
          }))
        : baseResult.recommendations,
      clientSentiment: r.clientSentiment || baseResult.clientSentiment,
      callOutcome: r.callOutcome || baseResult.callOutcome,
      analysis: r.analysis || baseResult.analysis,
      improvement: r.improvement || baseResult.improvement,
      criteriaScores,
      totalCriteriaScore,
      leadScore: r.leadScore || 'warm',
    }
  } catch {
    const baseResult = await analyzeCallTranscription(transcription, managerName)
    return {
      ...baseResult,
      criteriaScores: {},
      totalCriteriaScore: baseResult.rating * 2,
      leadScore: 'warm',
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

export async function generateManagerWorkloadRecommendation(data: {
  managerCount: number
  totalLeadsToday: number
  contactedLeadsToday: number
  totalCallsToday: number
  avgCallsPerManager: number
  avgRating: number
  uncontactedLeads: number
}): Promise<string> {
  const response = await openai.chat.completions.create({
    model: CHAT_MODEL,
    messages: [
      {
        role: 'user',
        content: `Sen savdo bo'limi menejeri yordamchisisan. Bugungi statistika:
- Managerlar soni: ${data.managerCount}
- Sheetsga tushgan leadlar: ${data.totalLeadsToday}
- Bog'lanilgan leadlar: ${data.contactedLeadsToday}
- Jami qo'ng'iroqlar: ${data.totalCallsToday}
- Manager boshiga o'rtacha qo'ng'iroq: ${data.avgCallsPerManager.toFixed(1)}
- O'rtacha baho: ${data.avgRating.toFixed(1)}/10
- Hali bog'lanilmagan leadlar: ${data.uncontactedLeads}

Haqiqiy rahbar sifatida: managerlar band/bo'shmi, leadlarni ko'paytirish/kamaytirish kerakmi?
Aniq tavsiya ber (2-3 jumla, o'zbekcha).`,
      },
    ],
    temperature: 0.5,
    max_tokens: 300,
  })
  return response.choices[0].message.content || 'Tavsiya mavjud emas'
}
