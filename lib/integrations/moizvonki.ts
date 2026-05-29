import { prisma } from '@/lib/prisma'
import { transcribeAudio, analyzeCallTranscription } from '@/lib/openai'
import { getRelevantKnowledge, extractKnowledgeFromCall } from '@/lib/ai-learning'
import { writeFile, mkdir, unlink } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

async function ensureUploadsDir(): Promise<string> {
  const dir = path.join(process.cwd(), 'uploads')
  if (!existsSync(dir)) await mkdir(dir, { recursive: true })
  return dir
}

export interface MoiZvankyEvent {
  call_id?: string
  phone?: string
  direction?: string | number  // 1=incoming, 2=outgoing
  duration?: string | number
  record_url?: string
  manager?: string
  responsible?: string
  manager_phone?: string
}

async function findManagerByNameOrPhone(nameOrPhone: string): Promise<{ id: string; name: string; projectId: string | null } | null> {
  if (!nameOrPhone) return null

  // Try phone match first
  if (/^\+?\d[\d\s\-()]+$/.test(nameOrPhone)) {
    const mgr = await prisma.manager.findFirst({
      where: { phone: { contains: nameOrPhone.replace(/\D/g, '').slice(-7) } },
    }).catch(() => null)
    if (mgr) return mgr
  }

  // Try name match (case-insensitive contains)
  const mgr = await prisma.manager.findFirst({
    where: { name: { contains: nameOrPhone, mode: 'insensitive' } },
  }).catch(() => null)
  return mgr
}

export async function processMoiZvankyEvent(event: MoiZvankyEvent): Promise<void> {
  try {
    const managerIdentifier = event.manager || event.responsible || event.manager_phone || ''
    const manager = await findManagerByNameOrPhone(managerIdentifier)
    if (!manager) {
      console.log(`[MoiZvanki] Manager topilmadi: "${managerIdentifier}", skip`)
      return
    }

    if (!event.record_url) {
      console.log(`[MoiZvanki] record_url yo'q, skip`)
      return
    }

    // Download audio
    const audioRes = await fetch(event.record_url, { signal: AbortSignal.timeout(30000) })
    if (!audioRes.ok) {
      console.error(`[MoiZvanki] Audio yuklab olinmadi: ${audioRes.status}`)
      return
    }

    const audioBuffer = Buffer.from(await audioRes.arrayBuffer())
    const contentType = audioRes.headers.get('content-type') || 'audio/mpeg'
    const ext = contentType.includes('wav') ? 'wav' : contentType.includes('ogg') ? 'ogg' : 'mp3'
    const fileName = `mz_${event.call_id || Date.now()}.${ext}`

    const uploadsDir = await ensureUploadsDir()
    const filePath = path.join(uploadsDir, fileName)
    await writeFile(filePath, audioBuffer)

    let transcription = ''
    try {
      transcription = await transcribeAudio(filePath)
    } catch (err) {
      console.error('[MoiZvanki] Transcription error:', err)
    }

    // Fetch project context
    const projectId = manager.projectId
    const [company, callCategories, leadCategories, project] = await Promise.all([
      prisma.company.findFirst({ where: { projectId: projectId ?? undefined } }).catch(() => null),
      prisma.callCategory.findMany({ where: { projectId: projectId ?? undefined }, include: { criteria: { orderBy: { order: 'asc' } } }, orderBy: { order: 'asc' } }).catch(() => []),
      prisma.leadCategory.findMany({ where: { projectId: projectId ?? undefined }, include: { criteria: { orderBy: { order: 'asc' } } }, orderBy: { order: 'asc' } }).catch(() => []),
      projectId ? prisma.project.findUnique({ where: { id: projectId }, select: { features: true } }).catch(() => null) : null,
    ])

    const projectAiModel = project ? ((project.features as Record<string, unknown>)?.aiModel as string | undefined) : undefined

    let extraContext = ''
    try { extraContext = await getRelevantKnowledge(8) } catch { /* ignore */ }

    if (company?.aiContext) {
      extraContext = `\n\nKompaniya konteksti:\n${company.aiContext}${extraContext ? '\n\n' + extraContext : ''}`
    }
    if (callCategories.length > 0) {
      const catList = callCategories.map(c => `- ${c.name}${c.description ? ': ' + c.description : ''}`).join('\n')
      extraContext += `\n\nMavjud suhbat kategoriyalari:\n${catList}\n\nJSON javobida "callCategory" maydonini ham qo'sh.`
      const allCriteria = callCategories.flatMap(cat => cat.criteria.map(c => ({ catName: cat.name, critName: c.name, desc: c.description })))
      if (allCriteria.length > 0) {
        const critList = allCriteria.map((c, i) => `${i + 1}. [${c.catName}] ${c.critName}${c.desc ? ': ' + c.desc : ''}`).join('\n')
        extraContext += `\n\nMEZONLAR RO'YXATI:\n${critList}\n\nJSON da "criteriaScores": [{"name": "...", "score": 85, "comment": "..."}] qo'shing.`
      }
    }
    if (leadCategories.length > 0) {
      const leadCatLines = leadCategories.map(cat => {
        const criteriaLines = cat.criteria.map((c, i) => `   ${i + 1}. ${c.description || c.name}`).join('\n')
        return `- "${cat.label}" kategoriyasi mezonlari:\n${criteriaLines}`
      }).join('\n')
      extraContext += `\n\nLID SIFATINI ANIQLASH:\n${leadCatLines}\n\nJSON da "leadQuality": "<kategoriya label nomi>".`
    }

    let analysisResult = null
    if (transcription) {
      try {
        analysisResult = await analyzeCallTranscription(transcription, manager.name, extraContext || undefined, projectAiModel)
      } catch (err) {
        console.error('[MoiZvanki] Analysis error:', err)
      }
    }

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
    }

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

    const durationSeconds = event.duration ? parseInt(String(event.duration), 10) || null : null
    const score = analysisResult?.rating ? Math.round(analysisResult.rating * 20) : null

    const call = await prisma.call.create({
      data: {
        managerId: manager.id,
        audioFileName: fileName,
        audioPath: filePath,
        audioData: audioBuffer,
        audioMimeType: contentType,
        duration: durationSeconds || undefined,
        clientPhone: event.phone || undefined,
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
      include: { manager: true },
    })

    if (projectId && call.duration) {
      const today = new Date().toISOString().split('T')[0]
      const durationMinutes = Math.ceil(call.duration / 60)
      await prisma.$executeRaw`
        INSERT INTO "AudioUsage" (id, "projectId", date, minutes, "createdAt", "updatedAt")
        VALUES (gen_random_uuid()::text, ${projectId}, ${today}, ${durationMinutes}, NOW(), NOW())
        ON CONFLICT ("projectId", date) DO UPDATE SET minutes = "AudioUsage".minutes + ${durationMinutes}, "updatedAt" = NOW()
      `.catch(e => console.error('[MoiZvanki] Usage tracking error:', e))
    }

    if (transcription && analysisResult?.analysis) {
      extractKnowledgeFromCall(call.id, transcription, analysisResult.analysis)
        .catch(e => console.error('[MoiZvanki] Knowledge extraction error:', e))
    }

    // Clean up temp file
    unlink(filePath).catch(() => {})

    console.log(`[MoiZvanki] Call ${call.id} created for manager ${manager.name}`)
  } catch (err) {
    console.error('[MoiZvanki] processMoiZvankyEvent error:', err)
  }
}
