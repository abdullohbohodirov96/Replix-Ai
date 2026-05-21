import OpenAI from 'openai'
import fs from 'fs'

const useGroq = !!process.env.GROQ_API_KEY

export const openai = new OpenAI(
  useGroq
    ? { apiKey: process.env.GROQ_API_KEY!, baseURL: 'https://api.groq.com/openai/v1' }
    : { apiKey: process.env.OPENAI_API_KEY! }
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

export interface CallAnalysisResult {
  summary: string
  rating: number
  problems: string[]
  positives: string[]
  clientSentiment: 'positive' | 'negative' | 'neutral'
  callOutcome: 'sale' | 'followup' | 'rejected' | 'unknown'
  analysis: string
  improvement: string
}

export async function analyzeCallTranscription(
  transcription: string,
  managerName: string
): Promise<CallAnalysisResult> {
  const systemPrompt = `Sen Replix AI — professional savdo qo'ng'iroqlarini tahlil qiluvchi sun'iy intellektsan.
Sen Dunyabunya savdo platformasi uchun ishlayman. Abdulloh tomonidan yaratilgan.

Vazifang: Manager va mijoz o'rtasidagi suhbatni tahlil qilib, quyidagi formatda JSON qaytarish:
- summary: Suhbat qisqacha tahlili (o'zbekcha)
- rating: 5 yulduzdan baho (1.0 - 5.0, float)
- problems: Muammolar ro'yxati (o'zbekcha string array)
- positives: Ijobiy tomonlar ro'yxati (o'zbekcha string array)
- clientSentiment: "positive" | "negative" | "neutral"
- callOutcome: "sale" | "followup" | "rejected" | "unknown"
- analysis: Batafsil tahlil (o'zbekcha)
- improvement: Yaxshilash bo'yicha tavsiyalar (o'zbekcha)

Baholash mezonlari:
1 - Juda yomon: manager qo'pol, savol bermaydi
2 - Yomon: asosiy xatolar, tinghlamaydi
3 - O'rtacha: ba'zi xatolar bor
4 - Yaxshi: professional, kichik kamchiliklar
5 - A'lo: mijozni tingladi, professional javob berdi

Faqat JSON qaytarasan.`

  const response = await openai.chat.completions.create({
    model: CHAT_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Manager: ${managerName}\n\nTranskripsiya:\n${transcription}\n\nJSON formatida tahlil ber:` },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
    max_tokens: 1024,
  })

  const content = response.choices[0].message.content || '{}'
  try {
    const r = JSON.parse(content)
    return {
      summary: r.summary || 'Tahlil mavjud emas',
      rating: Math.min(5, Math.max(1, parseFloat(String(r.rating || '3')))),
      problems: Array.isArray(r.problems) ? r.problems : [],
      positives: Array.isArray(r.positives) ? r.positives : [],
      clientSentiment: r.clientSentiment || 'neutral',
      callOutcome: r.callOutcome || 'unknown',
      analysis: r.analysis || '',
      improvement: r.improvement || '',
    }
  } catch {
    return { summary: 'Tahlil xatolik', rating: 3, problems: [], positives: [], clientSentiment: 'neutral', callOutcome: 'unknown', analysis: content, improvement: '' }
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
      content: `${managerName} managerning bugungi qo'ng'iroqlari:\n${calls.map((c, i) => `${i+1}. Baho: ${c.rating}/5 | ${c.callOutcome} | ${c.summary}`).join('\n')}\n\nJSON: { "summary": "...", "topProblems": [...], "improvement": "..." }`,
    }],
    response_format: { type: 'json_object' },
    temperature: 0.3,
    max_tokens: 512,
  })

  try {
    const r = JSON.parse(response.choices[0].message.content || '{}')
    return { summary: r.summary || '', topProblems: Array.isArray(r.topProblems) ? r.topProblems : [], improvement: r.improvement || '' }
  } catch {
    return { summary: 'Hisobot xatolik', topProblems: [], improvement: '' }
  }
}
