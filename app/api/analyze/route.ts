import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { transcribeAudio, analyzeCallTranscription } from '@/lib/openai'
import { getRelevantKnowledge, extractKnowledgeFromCall } from '@/lib/ai-learning'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

async function ensureUploadsDir() {
  const uploadsDir = path.join(process.cwd(), 'uploads')
  if (!existsSync(uploadsDir)) {
    await mkdir(uploadsDir, { recursive: true })
  }
  return uploadsDir
}

async function fireAndForgetIntegrations(call: {
  id: string; audioFileName: string; rating: number | null
  summary: string | null; analysis: string | null; callOutcome: string | null
  problems: string | null; positives: string | null; clientSentiment: string | null
  createdAt: Date
}, managerName: string) {
  try {
    const integrations = await prisma.integration.findMany({
      where: { enabled: true },
    })
    const names = integrations.map(i => i.name)

    if (names.includes('telegram')) {
      const { sendCallAnalysis } = await import('@/lib/integrations/telegram')
      sendCallAnalysis(call, managerName).catch(e => console.error('Telegram sync error:', e))

      // Send alert for low-rated calls
      if (call.rating !== null && call.rating < 3.0) {
        const { sendAlert } = await import('@/lib/integrations/telegram')
        sendAlert('low_rating', {
          rating: call.rating,
          managerName,
          audioFileName: call.audioFileName,
        }).catch(e => console.error('Telegram alert error:', e))
      }
    }

    if (names.includes('amocrm')) {
      const { syncCallToAmo } = await import('@/lib/integrations/amocrm')
      syncCallToAmo(call, managerName).catch(e => console.error('AmoCRM sync error:', e))
    }

    if (names.includes('bitrix24')) {
      const { syncCallToBitrix } = await import('@/lib/integrations/bitrix24')
      syncCallToBitrix(call, managerName).catch(e => console.error('Bitrix24 sync error:', e))
    }

    if (names.includes('google_sheets')) {
      const { exportCallToSheets } = await import('@/lib/integrations/google-sheets')
      exportCallToSheets(call, managerName).catch(e => console.error('Sheets sync error:', e))
    }
  } catch (err) {
    console.error('fireAndForgetIntegrations error:', err)
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Avval tizimga kiring' }, { status: 401 })
    }
    const sessionUser = session.user as { role?: string; managerId?: string | null }
    const isAdmin = sessionUser.role === 'admin' || sessionUser.role === 'superadmin'

    const formData = await request.formData()
    const file = formData.get('audio') as File | null
    const managerId = formData.get('managerId') as string | null
    const clientPhone = (formData.get('clientPhone') as string | null) || null
    const durationSeconds = parseInt(formData.get('durationSeconds') as string || '0', 10) || null
    const manualTranscript = (formData.get('transcript') as string | null)?.trim() || null

    if (!file && !manualTranscript) {
      return NextResponse.json({ error: 'Audio fayl yoki matn kiritilmagan' }, { status: 400 })
    }
    if (!managerId) {
      return NextResponse.json({ error: 'Manager tanlanmagan' }, { status: 400 })
    }

    if (!isAdmin && managerId !== sessionUser.managerId) {
      return NextResponse.json(
        { error: 'Siz faqat o\'zingizga biriktirilgan manager uchun audio yuklay olasiz' },
        { status: 403 }
      )
    }

    const manager = await prisma.manager.findUnique({ where: { id: managerId } })
    if (!manager) {
      return NextResponse.json({ error: 'Manager topilmadi' }, { status: 404 })
    }

    // Check daily audio limit for this project
    const managerProjectId = manager.projectId
    let projectAiModel: string | undefined = undefined
    if (managerProjectId) {
      const project = await prisma.project.findUnique({
        where: { id: managerProjectId },
        select: { dailyLimitMinutes: true, features: true },
      }).catch(() => null)

      projectAiModel = project ? ((project.features as Record<string, unknown>)?.aiModel as string | undefined) : undefined

      if (project) {
        // Check if aiAnalysis feature is enabled
        const features = (project.features as Record<string, boolean>) || {}
        if (features.aiAnalysis === false) {
          return NextResponse.json({ error: "AI tahlil funksiyasi o'chirilgan" }, { status: 403 })
        }

        // Check daily limit
        const today = new Date().toISOString().split('T')[0]
        const usage = await prisma.$queryRaw<{ minutes: number }[]>`
          SELECT COALESCE(minutes, 0) as minutes FROM "AudioUsage"
          WHERE "projectId" = ${managerProjectId} AND date = ${today}
          LIMIT 1
        `.catch(() => [])
        const usedMinutes = (usage[0]?.minutes ?? 0)
        if (usedMinutes >= project.dailyLimitMinutes) {
          return NextResponse.json({
            error: `Kunlik audio limit to'ldi. ${project.dailyLimitMinutes} daqiqadan ${usedMinutes} daqiqa ishlatildi.`
          }, { status: 429 })
        }
      }
    }

    let filePath = ''
    let buffer = Buffer.from('')
    let audioFileName = `text_${Date.now()}.txt`
    let audioMimeType = 'text/plain'

    if (file) {
      const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/webm', 'audio/mp4']
      if (!allowedTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|ogg|m4a|webm|mp4|flac)$/i)) {
        return NextResponse.json(
          { error: 'Faqat audio fayllar qabul qilinadi (MP3, WAV, OGG, M4A)' },
          { status: 400 }
        )
      }
      const uploadsDir = await ensureUploadsDir()
      audioFileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
      filePath = path.join(uploadsDir, audioFileName)
      const bytes = await file.arrayBuffer()
      buffer = Buffer.from(bytes)
      await writeFile(filePath, buffer)
      audioMimeType = file.type || 'audio/mpeg'
    }

    let transcription = manualTranscript || ''
    if (file && !manualTranscript) {
      try {
        transcription = await transcribeAudio(filePath)
      } catch (err) {
        console.error('Transcription error:', err)
      }
    }

    let learnedContext = ''
    try {
      learnedContext = await getRelevantKnowledge(8)
    } catch { /* non-critical */ }

    // Fetch project-scoped company context + categories for enriched analysis
    const projectId = (session.user as { projectId?: string | null })?.projectId ?? null
    const [company, callCategories, leadCategories] = await Promise.all([
      prisma.company.findFirst({ where: { projectId: projectId ?? undefined } }).catch(() => null),
      prisma.callCategory.findMany({ where: { projectId: projectId ?? undefined }, include: { criteria: { orderBy: { order: 'asc' } } }, orderBy: { order: 'asc' } }).catch(() => []),
      prisma.leadCategory.findMany({ where: { projectId: projectId ?? undefined }, include: { criteria: { orderBy: { order: 'asc' } } }, orderBy: { order: 'asc' } }).catch(() => []),
    ])

    let extraContext = learnedContext || ''
    if (company?.aiContext) {
      extraContext = `\n\nKompaniya konteksti:\n${company.aiContext}${extraContext ? '\n\n' + extraContext : ''}`
    }
    if (callCategories.length > 0) {
      const catList = callCategories.map(c => `- ${c.name}${c.description ? ': ' + c.description : ''}`).join('\n')
      extraContext += `\n\nMavjud suhbat kategoriyalari (callOutcome emas, suhbat turi):\n${catList}\n\nJSON javobida "callCategory" maydonini ham qo'sh — qaysi kategoriya ekanligini aniqlash uchun kategoriya nomini yoz (mavjud bo'lmasa null).`

      // Build criteria scoring prompt for detected category or first category
      const allCriteria = callCategories.flatMap(cat => cat.criteria.map(c => ({ catName: cat.name, critName: c.name, desc: c.description })))
      if (allCriteria.length > 0) {
        const critList = allCriteria.map((c, i) => `${i + 1}. [${c.catName}] ${c.critName}${c.desc ? ': ' + c.desc : ''}`).join('\n')
        extraContext += `\n\nMEZONLAR RO'YXATI (har birini 0-100 ball bilan baholang):\n${critList}\n\nJSON javobida "criteriaScores" maydonini qo'shing:\n"criteriaScores": [{"name": "mezon nomi", "score": 85, "comment": "qisqacha izoh"}]\nHar bir mezonni qo'ng'iroq mazmuniga qarab baholang.`
      }
    }
    if (leadCategories.length > 0) {
      const leadCatLines = leadCategories.map(cat => {
        const criteriaLines = cat.criteria.map((c, i) => `   ${i + 1}. ${c.description || c.name}`).join('\n')
        return `- "${cat.label}" kategoriyasi mezonlari:\n${criteriaLines}`
      }).join('\n')
      extraContext += `\n\nLID SIFATINI ANIQLASH (MUHIM!):\nQuyidagi kategoriyalardan BITTA eng mos keluvchi kategoriyani tanlang va JSON javobiga "leadQuality" maydonini qo'shing. Har bir kategoriya mezonlarini qo'ng'iroq mazmuniga taqqoslab, BARCHA mezonlarni tekshiring va eng ko'p mos keluvchisini tanlang:\n\n${leadCatLines}\n\nJSON javobida: "leadQuality": "<kategoriya label nomi>" (mavjud bo'lmasa null)`
    }

    let analysisResult = null
    if (transcription) {
      try {
        analysisResult = await analyzeCallTranscription(
          transcription,
          manager.name,
          extraContext || undefined,
          projectAiModel
        )
      } catch (err) {
        console.error('Analysis error:', err)
      }
    }

    // Determine call category from AI response
    let categoryId: string | null = null
    if (analysisResult && callCategories.length > 0) {
      const aiCatName = analysisResult.callCategory
      if (aiCatName) {
        const matched = callCategories.find(c =>
          c.name.toLowerCase() === aiCatName.toLowerCase() ||
          aiCatName.toLowerCase().includes(c.name.toLowerCase())
        )
        if (matched) categoryId = matched.id
      }
      // Fallback: keyword match on summary
      if (!categoryId && analysisResult.summary) {
        for (const cat of callCategories) {
          if (analysisResult.summary.toLowerCase().includes(cat.name.toLowerCase())) {
            categoryId = cat.id
            break
          }
        }
      }
    }

    // Determine lead quality from AI response
    let leadQualityValue: string | null = null
    if (analysisResult?.leadQuality && leadCategories.length > 0) {
      const aiLabel = analysisResult.leadQuality.toLowerCase()
      const matched = leadCategories.find(c =>
        c.label.toLowerCase() === aiLabel ||
        aiLabel.includes(c.label.toLowerCase()) ||
        c.label.toLowerCase().includes(aiLabel)
      )
      leadQualityValue = matched?.label ?? analysisResult.leadQuality
    }

    const score = analysisResult?.rating ? Math.round(analysisResult.rating * 20) : null

    const call = await prisma.call.create({
      data: {
        managerId,
        audioFileName: file ? file.name : audioFileName,
        audioPath: filePath || 'text-only',
        audioData: buffer.length > 0 ? buffer : undefined,
        audioMimeType,
        duration: durationSeconds || undefined,
        clientPhone: clientPhone || undefined,
        transcription: transcription || null,
        analysis: analysisResult?.analysis || null,
        rating: analysisResult?.rating || null,
        score,
        problems: analysisResult ? JSON.stringify(analysisResult.problems) : null,
        positives: analysisResult ? JSON.stringify(analysisResult.positives) : null,
        recommendations: analysisResult ? JSON.stringify(analysisResult.recommendations) : null,
        improvement: analysisResult?.improvement || null,
        clientSentiment: analysisResult?.clientSentiment || null,
        callOutcome: analysisResult?.callOutcome || null,
        summary: analysisResult?.summary || null,
        leadQuality: leadQualityValue || null,
        criteriaScores: analysisResult?.criteriaScores ? JSON.stringify(analysisResult.criteriaScores) : null,
        categoryId,
        status: 'analyzed',
        analyzedAt: new Date(),
      },
    })

    // Track audio usage for this project
    if (managerProjectId && call.duration) {
      const today = new Date().toISOString().split('T')[0]
      const durationMinutes = Math.ceil(call.duration / 60)
      await prisma.$executeRaw`
        INSERT INTO "AudioUsage" (id, "projectId", date, minutes, "createdAt", "updatedAt")
        VALUES (gen_random_uuid()::text, ${managerProjectId}, ${today}, ${durationMinutes}, NOW(), NOW())
        ON CONFLICT ("projectId", date) DO UPDATE SET minutes = "AudioUsage".minutes + ${durationMinutes}, "updatedAt" = NOW()
      `.catch(e => console.error('Usage tracking error:', e))
    }

    // Fire-and-forget: extract AI knowledge and sync integrations
    if (transcription && analysisResult?.analysis) {
      extractKnowledgeFromCall(call.id, transcription, analysisResult.analysis)
        .catch(e => console.error('AI knowledge extraction error:', e))
    }

    fireAndForgetIntegrations({
      id: call.id,
      audioFileName: call.audioFileName,
      rating: call.rating,
      summary: call.summary,
      analysis: call.analysis,
      callOutcome: call.callOutcome,
      problems: call.problems,
      positives: call.positives,
      clientSentiment: call.clientSentiment,
      createdAt: call.createdAt,
    }, manager.name)

    return NextResponse.json({
      success: true,
      call: {
        id: call.id,
        managerId: call.managerId,
        managerName: manager.name,
        audioFileName: call.audioFileName,
        transcription: call.transcription,
        analysis: call.analysis,
        rating: call.rating,
        problems: call.problems ? JSON.parse(call.problems) : [],
        positives: call.positives ? JSON.parse(call.positives) : [],
        recommendations: call.recommendations ? JSON.parse(call.recommendations) : [],
        clientSentiment: call.clientSentiment,
        callOutcome: call.callOutcome,
        summary: call.summary,
        createdAt: call.createdAt,
      },
    })
  } catch (error: unknown) {
    console.error('Analyze API error:', error)
    const message = error instanceof Error ? error.message : 'Ichki server xatoligi'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
