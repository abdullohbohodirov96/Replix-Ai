import OpenAI from 'openai'
import fs from 'fs'

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

export async function transcribeAudio(audioFilePath: string): Promise<string> {
  const audioFile = fs.createReadStream(audioFilePath)
  
  const transcription = await openai.audio.transcriptions.create({
    file: audioFile,
    model: 'whisper-1',
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
Seni Abdulloh yaratgan. Sen Dunyabunya savdo platformasi uchun ishlayman.

Vazifang: Manager va mijoz o'rtasidagi suhbatni tahlil qilib, quyidagi formatda JSON qaytarish:
- Suhbat qisqacha tahlili (o'zbekcha)
- 5 yulduzdan baho (1.0 - 5.0)
- Muammolar ro'yxati (o'zbekcha)
- Ijobiy tomonlar ro'yxati (o'zbekcha)  
- Mijoz kayfiyati: positive / negative / neutral
- Qo'ng'iroq natijasi: sale / followup / rejected / unknown
- Batafsil tahlil (o'zbekcha)
- Yaxshilash bo'yicha tavsiyalar (o'zbekcha)

Baholash mezonlari (5 yulduz):
⭐ 1 - Juda yomon: manager qo'pol, savol bermaydi, mahsulot bilmaydi
⭐⭐ 2 - Yomon: asosiy xatolar, mijozni tinghlamaydi
⭐⭐⭐ 3 - O'rtacha: ba'zi xatolar bor lekin asosiy malumot berildi
⭐⭐⭐⭐ 4 - Yaxshi: professional, ammo kichik kamchiliklar bor
⭐⭐⭐⭐⭐ 5 - A'lo: mijozni tingladi, professional javob berdi, savdo yoki uchrashuvga olib keldi

Faqat JSON qaytarasan, boshqa matn yo'q.`

  const userPrompt = `Manager: ${managerName}

Qo'ng'iroq transkripsiyasi:
${transcription}

JSON formatida tahlil ber:`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  })

  const content = response.choices[0].message.content || '{}'
  
  try {
    const result = JSON.parse(content)
    return {
      summary: result.summary || result.qisqacha_tahlil || 'Tahlil mavjud emas',
      rating: Math.min(5, Math.max(1, parseFloat(result.rating || result.baho || '3'))),
      problems: Array.isArray(result.problems || result.muammolar) 
        ? (result.problems || result.muammolar) 
        : [],
      positives: Array.isArray(result.positives || result.ijobiy_tomonlar)
        ? (result.positives || result.ijobiy_tomonlar)
        : [],
      clientSentiment: result.clientSentiment || result.mijoz_kayfiyati || 'neutral',
      callOutcome: result.callOutcome || result.natija || 'unknown',
      analysis: result.analysis || result.batafsil_tahlil || '',
      improvement: result.improvement || result.tavsiyalar || '',
    }
  } catch {
    return {
      summary: 'Tahlil qilishda xatolik yuz berdi',
      rating: 3,
      problems: [],
      positives: [],
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
  if (calls.length === 0) {
    return {
      summary: 'Bugun qo\'ng\'iroqlar mavjud emas',
      topProblems: [],
      improvement: '',
    }
  }

  const prompt = `Sen Replix AI. ${managerName} managerning bugungi qo'ng'iroqlari tahlili:

${calls.map((c, i) => `${i + 1}. Baho: ${c.rating}/5 | Natija: ${c.callOutcome} | Xulosa: ${c.summary}`).join('\n')}

Umumiy muammolar: ${calls.flatMap(c => c.problems).join(', ')}

JSON formatida qaytargin:
{
  "summary": "umumiy kunlik xulosa o'zbekcha",
  "topProblems": ["eng ko'p uchraydigan muammo 1", "muammo 2"],
  "improvement": "tavsiyalar o'zbekcha"
}`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  })

  try {
    const result = JSON.parse(response.choices[0].message.content || '{}')
    return {
      summary: result.summary || '',
      topProblems: Array.isArray(result.topProblems) ? result.topProblems : [],
      improvement: result.improvement || '',
    }
  } catch {
    return {
      summary: 'Hisobot tayyorlashda xatolik',
      topProblems: [],
      improvement: '',
    }
  }
}
